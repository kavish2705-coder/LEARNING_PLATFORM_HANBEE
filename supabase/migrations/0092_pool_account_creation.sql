-- Task 2 (independent-student-pool plan): staff-only independent account
-- creation. No public signup exists for a schoolless ("road-kid") student --
-- Hanbee staff create the account by issuing a personal invite, same trust
-- model as the existing email-invite flow (0024) and username-invite flow
-- (0088): the invite row is the real secret, accept-on-signup is handled by
-- the existing handle_new_user() trigger.
--
-- guard_invitation() (0031) already refuses to let anyone but Hanbee staff
-- or the manager insert a student invitation with org_id null ("only Hanbee
-- staff may invite a solo student"), and handle_new_user() already sets
-- is_solo = true when such an invite is accepted (org_id is null and
-- final_role = 'student'). What's missing is (a) a dedicated, staff-only RPC
-- that mirrors the invite_students()/invite_students_by_username() pattern
-- instead of making staff hand-write an insert, and (b) closing a second
-- route to is_solo = true: the plain "a user can update only their own
-- profile" RLS policy (0002) has no column restriction, so a signed-in
-- student could currently PATCH their own profiles row and set is_solo =
-- true directly over PostgREST, bypassing every one of these invite checks.

-- ---------------------------------------------------------------------------
-- 1. invitations.full_name: lets staff record the expected name up front, so
--    it is available for display before acceptance and (below) as a
--    fallback if the student's signup form didn't collect one.
-- ---------------------------------------------------------------------------
alter table invitations add column if not exists full_name text;

-- ---------------------------------------------------------------------------
-- 2. staff_create_independent_invite(): issue a solo-student invite.
--    guard_invitation() still re-checks is_hanbee_staff()/is_manager() on
--    the insert itself (defense in depth); this function's own check just
--    gives a clearer error message before that trigger would fire.
-- ---------------------------------------------------------------------------
create or replace function staff_create_independent_invite(p_full_name text, p_email text)
returns uuid as $$
declare
  v_email text := lower(trim(p_email));
  v_full_name text := nullif(trim(p_full_name), '');
  v_id uuid;
begin
  if not (is_hanbee_staff() or is_manager()) then
    raise exception 'not allowed';
  end if;
  if not mfa_satisfied() then
    raise exception 'Two-factor authentication is required for this action. Enroll a 2FA device in your account settings.';
  end if;
  if v_full_name is null then
    raise exception 'a full name is required';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  if exists (select 1 from profiles p where lower(p.email) = v_email) then
    raise exception 'that email is already in use';
  end if;
  if exists (
    select 1 from invitations i
    where lower(i.email) = v_email and i.role = 'student'
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
  ) then
    raise exception 'that email already has a pending invite';
  end if;

  insert into invitations (email, role, org_id, invited_by, full_name)
  values (v_email, 'student', null, auth.uid(), v_full_name)
  returning id into v_id;

  perform log_audit('staff_create_independent_invite', 'invitation', v_id, jsonb_build_object('email', v_email));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function staff_create_independent_invite(text, text) from public, anon;
grant execute on function staff_create_independent_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. handle_new_user(): fall back to the invite's recorded full_name when
--    the signup request itself didn't supply one (unchanged otherwise).
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  requested_role text := meta->>'role';
  v_invite_token text := nullif(meta->>'invite_token', '');
  v_join_token text := nullif(meta->>'join_token', '');
  v_invite_username text := nullif(lower(trim(meta->>'invite_username')), '');
  v_phone text := nullif(trim(meta->>'phone'), '');
  v_staff_student_org text := nullif(app_meta->>'staff_created_student_org', '');
  v_staff_student_username text := nullif(app_meta->>'student_username', '');
  inv invitations;
  org organizations;
  final_role user_role;
  final_approved boolean := true;
  register_school boolean := false;
  v_org_id uuid;
  v_school_name text;
  v_reg_no text;
  v_official_email text;
  v_username text;
  v_full_name text := nullif(trim(meta->>'full_name'), '');
begin
  if v_invite_token is not null then
    select * into inv from invitations i
    where i.token = v_invite_token
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
    for update;
    if inv.id is null then
      raise exception 'This invitation is invalid or has expired';
    end if;
    if inv.email is not null then
      if lower(inv.email) <> lower(new.email) then
        raise exception 'This invitation is invalid or has expired';
      end if;
    else
      if inv.username is null or v_invite_username is null or v_invite_username <> lower(inv.username) then
        raise exception 'This invitation is invalid or has expired';
      end if;
      v_username := inv.username;
    end if;
    final_role := inv.role;
    if inv.org_id is not null then
      select * into org from organizations o where o.id = inv.org_id;
      if org.status <> 'active' then
        raise exception 'This school is not active';
      end if;
    end if;
    if v_full_name is null and inv.full_name is not null then
      v_full_name := inv.full_name;
    end if;

  elsif v_join_token is not null then
    select * into org from organizations o where o.join_token = v_join_token and o.status = 'active';
    if org.id is null then
      raise exception 'This school link is invalid';
    end if;
    select * into inv from invitations i
    where i.org_id = org.id and lower(i.email) = lower(new.email) and i.role = 'student'
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
    order by i.created_at desc limit 1
    for update;
    if inv.id is null then
      raise exception 'This email has not been invited by the school';
    end if;
    final_role := 'student';

  elsif v_staff_student_org is not null then
    select * into org from organizations o where o.id = v_staff_student_org::uuid and o.status = 'active';
    if org.id is null then
      raise exception 'This school is not active';
    end if;
    if v_staff_student_username is null then
      raise exception 'A username is required for this account';
    end if;
    final_role := 'student';
    v_username := lower(v_staff_student_username);
    v_org_id := org.id;

  elsif requested_role = 'school_staff' then
    v_school_name := nullif(trim(meta->>'school_name'), '');
    v_reg_no := nullif(trim(meta->>'registration_no'), '');
    v_official_email := nullif(trim(meta->>'official_email'), '');
    if v_school_name is null or coalesce(meta->>'guardian_consent', '') <> 'true' then
      raise exception 'School name and the guardian-consent confirmation are required';
    end if;
    final_role := 'school_staff';
    final_approved := false;
    register_school := true;

  elsif requested_role = 'staff' then
    final_role := 'staff';
    final_approved := false;

  elsif requested_role = 'manager' and not exists (select 1 from public.profiles where role = 'manager') then
    final_role := 'manager';

  else
    raise exception 'Signups are by invitation only';
  end if;

  if v_full_name is null then
    v_full_name := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, email, full_name, role, approved, username, phone)
  values (new.id, new.email, v_full_name, final_role, final_approved, v_username, v_phone);

  if inv.id is not null then
    update invitations set accepted = true where id = inv.id;

    if inv.org_id is null and final_role = 'student' then
      update public.profiles set is_solo = true where id = new.id;
    end if;

    if inv.org_id is not null then
      insert into organization_members (org_id, user_id, member_role)
      values (inv.org_id, new.id, case when final_role = 'school_staff' then 'staff'::org_member_role else 'student'::org_member_role end);
    end if;

    if inv.section_id is not null and final_role = 'student' then
      insert into enrollments (section_id, student_id, status)
      values (inv.section_id, new.id, 'active')
      on conflict (section_id, student_id) do nothing;
    end if;
  end if;

  if v_org_id is not null and final_role = 'student' and inv.id is null then
    insert into organization_members (org_id, user_id, member_role)
    values (v_org_id, new.id, 'student');
  end if;

  if register_school then
    insert into organizations (name, status, registration_no, official_email, guardian_consent, created_by)
    values (v_school_name, 'pending', v_reg_no, v_official_email, true, new.id)
    returning id into v_org_id;
    insert into organization_members (org_id, user_id, member_role)
    values (v_org_id, new.id, 'owner');
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 4. Close the direct-write route: is_solo now follows the same guard as
--    role/approved/account_status in guard_profile_self_escalation (0031) --
--    pinned back to its old value unless the write comes from a trusted
--    SECURITY DEFINER function (app.trusted_profile_write, e.g.
--    convert_to_solo()/join_school()/handle_new_user() above) or the caller
--    is the manager. A plain client-side update to one's own profiles row
--    (the only RLS policy that would otherwise reach this column) can no
--    longer flip is_solo to true.
-- ---------------------------------------------------------------------------
create or replace function guard_profile_self_escalation()
returns trigger as $$
begin
  if auth.uid() is null
     or (coalesce(current_setting('app.trusted_profile_write', true), '') = 'true'
         and current_user not in ('authenticated', 'anon')) then
    return new;
  end if;
  -- coalesce: a suspended caller has a null role, which must count as "not a manager".
  if not coalesce((select my_role() = 'manager'), false) then
    new.role := old.role;
    new.approved := old.approved;
    new.account_status := old.account_status;
    new.is_solo := old.is_solo;
  end if;
  return new;
end;
$$ language plpgsql security invoker set search_path = public;
