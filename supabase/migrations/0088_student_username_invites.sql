-- Student invites by username + phone instead of email, for schools whose
-- students don't have a checkable email address. Staff generates one
-- personal link per student (not sent automatically -- shared however the
-- school likes, e.g. pasted into their own WhatsApp group). The invite
-- token in that link is still the real secret, same trust model as the
-- existing email-based invite_students(); only the matching field at
-- signup changes from email to username.
--
-- This sits alongside the existing email-based invite flow and the
-- staff-assigns-password-directly flow (0087) without replacing either.

alter table invitations alter column email drop not null;
alter table invitations add column username text;
alter table invitations add column phone text;

-- Prevents two live invitations from claiming the same username at once;
-- doesn't block re-inviting after the first one is accepted/revoked/expired.
create unique index invitations_pending_username_unique
  on invitations (lower(username))
  where username is not null and not accepted and revoked_at is null;

alter table profiles add column phone text;

create or replace function invite_students_by_username(p_org uuid, p_students jsonb)
returns table (username text, phone text, token text, result text) as $$
declare
  v_student jsonb;
  v_username text;
  v_phone text;
  v_seen text[] := '{}';
  v_token text;
begin
  if not can_manage_org(p_org) then
    raise exception 'not allowed';
  end if;
  if not mfa_satisfied() then
    raise exception 'Two-factor authentication is required for this action. Enroll a 2FA device in your account settings.';
  end if;
  if not exists (select 1 from organizations where id = p_org and status = 'active') then
    raise exception 'this school is not active';
  end if;
  if coalesce(jsonb_array_length(p_students), 0) = 0 then
    raise exception 'no students given';
  end if;
  if jsonb_array_length(p_students) > 200 then
    raise exception 'at most 200 students per batch';
  end if;

  for v_student in select * from jsonb_array_elements(p_students) loop
    v_username := lower(trim(v_student->>'username'));
    v_phone := nullif(trim(v_student->>'phone'), '');
    username := v_username;
    phone := v_phone;
    token := null;

    if v_username !~ '^[a-z0-9._-]{3,32}$' then
      result := 'invalid_username'; return next; continue;
    end if;
    if v_username = any (v_seen) then
      result := 'duplicate_in_list'; return next; continue;
    end if;
    v_seen := v_seen || v_username;

    if exists (select 1 from profiles p where lower(p.username) = v_username) then
      result := 'username_taken'; return next; continue;
    end if;

    if exists (
      select 1 from invitations i
      where lower(i.username) = v_username and i.role = 'student'
        and not i.accepted and i.revoked_at is null and i.expires_at > now()
    ) then
      update invitations i set expires_at = now() + interval '30 days', phone = coalesce(v_phone, i.phone)
      where lower(i.username) = v_username and i.role = 'student'
        and not i.accepted and i.revoked_at is null
      returning i.token into v_token;
      token := v_token;
      result := 'already_invited'; return next; continue;
    end if;

    insert into invitations (email, role, org_id, username, phone, invited_by)
    values (null, 'student', p_org, v_username, v_phone, auth.uid())
    returning invitations.token into v_token;
    token := v_token;
    result := 'invited'; return next;
  end loop;

  perform log_audit('invite_students_by_username', 'organization', p_org, jsonb_build_object('count', jsonb_array_length(p_students)));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function invite_students_by_username(uuid, jsonb) from public, anon;
grant execute on function invite_students_by_username(uuid, jsonb) to authenticated;

-- school_students_bundle() (0085) needs to surface username/phone now that
-- an invitation can be username-based instead of email-based.
create or replace function school_students_bundle()
returns jsonb as $$
declare
  v_org uuid := my_org_id();
begin
  if v_org is null then raise exception 'Your account is not linked to an active school.'; end if;
  return jsonb_build_object(
    'org_id', v_org,
    'join_token', (select o.join_token from organizations o where o.id = v_org),
    'students', coalesce((select jsonb_agg(row_to_json(s)) from school_students(v_org) s), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(row_to_json(i))
      from (
        select id, email, username, phone, token, expires_at, accepted, revoked_at
        from invitations
        where org_id = v_org and role = 'student'
        order by created_at desc
      ) i
    ), '[]'::jsonb)
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- handle_new_user: the invite_token branch now matches either by email
-- (unchanged, existing invites) or -- when the invitation has no email at
-- all -- by username supplied in the signup request's metadata. The token
-- itself (a random secret, same as before) is still what's actually hard
-- to guess; the identity check just prevents reusing someone else's link
-- under a different claimed identity.
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
  v_full_name text := coalesce(nullif(trim(meta->>'full_name'), ''), split_part(new.email, '@', 1));
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
