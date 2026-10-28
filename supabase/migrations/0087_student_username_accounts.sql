-- Lets school staff create a student login directly (username + password)
-- instead of relying on the student having a real, checkable email address.
-- Many younger students don't have one, which made the existing
-- email-invite flow unusable for them.
--
-- Security model: account creation itself happens through the
-- create-student-accounts Edge Function using the service-role key (never
-- exposed to the browser). That function is the trust boundary: it verifies
-- the caller via can_manage_org() before calling auth.admin.createUser().
-- The trigger below additionally only trusts raw_app_meta_data (never
-- raw_user_meta_data) for this path, because app_metadata can only be set
-- through the Admin API -- a public /auth/v1/signup call can set
-- user_metadata but never app_metadata, so this path cannot be reached by
-- an unauthenticated self-signup no matter what it sends.

alter table public.profiles add column username text;
create unique index profiles_username_unique on public.profiles (lower(username)) where username is not null;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9._-]{3,32}$');

create or replace function handle_new_user()
returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  requested_role text := meta->>'role';
  v_invite_token text := nullif(meta->>'invite_token', '');
  v_join_token text := nullif(meta->>'join_token', '');
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
    where i.token = v_invite_token and lower(i.email) = lower(new.email)
      and not i.accepted and i.revoked_at is null and i.expires_at > now()
    for update;
    if inv.id is null then
      raise exception 'This invitation is invalid or has expired';
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
    -- Only reachable via auth.admin.createUser() from the
    -- create-student-accounts Edge Function (app_metadata is not settable
    -- by the public signup endpoint).
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

  insert into public.profiles (id, email, full_name, role, approved, username)
  values (new.id, new.email, v_full_name, final_role, final_approved, v_username);

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

  if v_org_id is not null and final_role = 'student' then
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

-- Lets the login page turn a username into the email Supabase Auth actually
-- authenticates with, without exposing anyone else's real email or which
-- usernames exist (returns null for both "no such username" and "that
-- username belongs to a non-student account").
create or replace function resolve_student_login_email(p_username text)
returns text as $$
  select email from public.profiles
  where lower(username) = lower(p_username) and role = 'student' and account_status = 'active';
$$ language sql stable security definer set search_path = public;

revoke all on function resolve_student_login_email(text) from public, authenticated;
grant execute on function resolve_student_login_email(text) to anon;
