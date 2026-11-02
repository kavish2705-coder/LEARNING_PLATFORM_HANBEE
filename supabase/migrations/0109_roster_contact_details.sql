-- Staff inspecting a team's roster currently sees driver names only -- no
-- phone or location, and no way to tell an independent (pool) driver from
-- a school-affiliated one at a glance. This wires phone/location all the
-- way from an independent-student lead -> the invite -> the real account,
-- and lets the roster query expose them.
--
-- profiles.phone already existed (0088_student_username_invites.sql) but
-- handle_new_user() only ever set it from the signup request's own
-- metadata, never from the invitation row -- so a phone captured on the
-- landing-page lead (independent_student_leads.phone) never survived
-- staff converting that lead into a real invite. location didn't exist
-- anywhere on profiles or invitations.

alter table profiles add column if not exists location text not null default '';
alter table invitations add column if not exists location text;

-- ---------------------------------------------------------------------------
-- staff_create_independent_invite: accept optional phone/location so staff
-- converting a lead (CreateIndependentStudent.tsx) can carry them onto the
-- invite, not just use them for the one-off WhatsApp message. Rebuilt from
-- the LIVE definition (pg_get_functiondef) -- it returns jsonb with a
-- specific {id, token, full_name, email, expires_at} shape the frontend's
-- IndependentInvite type depends on, not a bare uuid. The old 2-arg
-- signature is dropped so a 2-arg call can't become ambiguous against the
-- new 4-arg-with-defaults one.
-- ---------------------------------------------------------------------------
drop function if exists staff_create_independent_invite(text, text);

create or replace function staff_create_independent_invite(p_full_name text, p_email text, p_phone text default null, p_location text default null)
returns jsonb as $$
declare
  v_email text := lower(trim(p_email));
  v_full_name text := nullif(trim(p_full_name), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_location text := nullif(trim(coalesce(p_location, '')), '');
  v_inv invitations;
begin
  if not (is_hanbee_staff() or is_manager()) then
    raise exception 'not allowed';
  end if;
  if not mfa_satisfied() then
    raise exception 'Two-factor authentication is required for this action. Enroll a 2FA device in your account settings.';
  end if;
  if v_full_name is null then raise exception 'a full name is required'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
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

  insert into invitations (email, role, org_id, invited_by, full_name, phone, location)
  values (v_email, 'student', null, auth.uid(), v_full_name, v_phone, v_location)
  returning * into v_inv;

  perform log_audit('staff_create_independent_invite', 'invitation', v_inv.id,
    jsonb_build_object('email', v_email));

  return jsonb_build_object(
    'id', v_inv.id,
    'token', v_inv.token,
    'full_name', v_inv.full_name,
    'email', v_inv.email,
    'expires_at', v_inv.expires_at
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function staff_create_independent_invite(text, text, text, text) from public, anon;
grant execute on function staff_create_independent_invite(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user: fall back to the invite's recorded phone/location when
-- the signup request itself didn't supply them (same precedent as the
-- existing full_name fallback). Rebuilt from the function's LIVE definition
-- (pg_get_functiondef), not an earlier migration file, so no unrelated
-- logic drifts -- the only changes are v_location and the two "if ... is
-- null then ... := inv.*" fallback blocks, and the profiles insert/select
-- list gaining phone/location.
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
  v_location text := nullif(trim(meta->>'location'), '');
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
      v_username := inv.username;
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
    if v_phone is null and inv.phone is not null then
      v_phone := inv.phone;
    end if;
    if v_location is null and inv.location is not null then
      v_location := inv.location;
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

  insert into public.profiles (id, email, full_name, role, approved, username, phone, location)
  values (new.id, new.email, v_full_name, final_role, final_approved, v_username, v_phone, coalesce(v_location, ''));

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
