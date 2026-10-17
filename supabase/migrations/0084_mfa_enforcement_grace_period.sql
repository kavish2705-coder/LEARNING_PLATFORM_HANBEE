-- 2FA (TOTP) enforcement for staff/manager accounts, with a grace period.
-- The MFA enrollment flow itself (enroll/challenge/verify/unenroll) already
-- exists end-to-end via Supabase Auth's built-in GoTrue API
-- (frontend/src/lib/supabaseAuth.ts) -- it was just never required. Nothing
-- forced a staff/manager to actually turn it on.
--
-- Deliberately NOT wired into is_staff_or_manager()/is_manager()/
-- is_hanbee_staff(): those are identity checks used by dozens of RLS
-- policies that gate ordinary reads (e.g. "staff can see courses"). Gating
-- those on MFA would silently break read access platform-wide for anyone
-- not yet enrolled, which is a far bigger blast radius than intended.
-- Instead this gates only the specific high-risk WRITE actions a
-- compromised, MFA-less staff/manager session could otherwise abuse:
-- suspending/revoking any account, and inviting new school staff/students.
--
-- Grace period: enforcement only actually blocks anything after
-- MFA_ENFORCEMENT_DEADLINE below, so real staff who haven't enrolled yet
-- have time to do so before any call starts failing. Before the deadline,
-- mfa_satisfied() always returns true.

create or replace function mfa_satisfied() returns boolean as $$
declare
  my_r user_role;
begin
  if now() < timestamptz '2026-11-15 00:00:00+00' then return true; end if;

  select role into my_r from profiles where id = auth.uid();
  if my_r is null or my_r not in ('staff', 'manager') then return true; end if;

  return coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function mfa_satisfied() from public;
grant execute on function mfa_satisfied() to authenticated;

create or replace function set_account_status(p_user uuid, p_status account_status, p_reason text default null)
returns void as $$
declare
  target profiles;
begin
  select * into target from profiles where id = p_user;
  if target.id is null then raise exception 'account not found'; end if;
  if p_user = auth.uid() then raise exception 'you cannot change your own status'; end if;

  if is_manager() then
    null;
  elsif is_hanbee_staff() then
    if target.role not in ('school_staff', 'student') then
      raise exception 'Hanbee staff may only act on school staff and students';
    end if;
  else
    raise exception 'not allowed';
  end if;
  if not mfa_satisfied() then
    raise exception 'Two-factor authentication is required for this action. Enroll a 2FA device in your account settings.';
  end if;

  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set account_status = p_status where id = p_user;
  perform set_config('app.trusted_profile_write', '', true);

  update auth.users
     set banned_until = case when p_status = 'active' then null else now() + interval '100 years' end
   where id = p_user;
  if p_status <> 'active' then
    delete from auth.sessions where user_id = p_user;
  end if;

  perform log_audit('set_account_status', 'profile', p_user,
    jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function invite_students(p_org uuid, p_emails text[])
returns table (email text, result text) as $$
declare
  v_email text;
  v_seen text[] := '{}';
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
  if coalesce(array_length(p_emails, 1), 0) = 0 then
    raise exception 'no emails given';
  end if;
  if array_length(p_emails, 1) > 200 then
    raise exception 'at most 200 emails per batch';
  end if;

  foreach v_email in array p_emails loop
    v_email := lower(trim(v_email));
    email := v_email;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      result := 'invalid_email'; return next; continue;
    end if;
    if v_email = any (v_seen) then
      result := 'duplicate_in_list'; return next; continue;
    end if;
    v_seen := v_seen || v_email;

    if exists (select 1 from profiles p where lower(p.email) = v_email and p.role <> 'student') then
      result := 'unavailable'; return next; continue;
    end if;
    if exists (
      select 1 from profiles p join organization_members m on m.user_id = p.id and m.status = 'active'
      where lower(p.email) = v_email
    ) then
      result := 'unavailable'; return next; continue;
    end if;

    if exists (
      select 1 from invitations i
      where i.org_id = p_org and lower(i.email) = v_email and i.role = 'student'
        and not i.accepted and i.revoked_at is null and i.expires_at > now()
    ) then
      update invitations i set expires_at = now() + interval '30 days'
      where i.org_id = p_org and lower(i.email) = v_email and i.role = 'student'
        and not i.accepted and i.revoked_at is null;
      result := 'already_invited'; return next; continue;
    end if;

    insert into invitations (email, role, org_id, invited_by)
    values (v_email, 'student', p_org, auth.uid());
    result := 'invited'; return next;
  end loop;

  perform log_audit('invite_students', 'organization', p_org, jsonb_build_object('count', array_length(p_emails, 1)));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function invite_school_staff(p_org uuid, p_email text)
returns text as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not (is_org_owner(p_org) or is_manager()) then
    raise exception 'only the school owner may invite school staff';
  end if;
  if not mfa_satisfied() then
    raise exception 'Two-factor authentication is required for this action. Enroll a 2FA device in your account settings.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return 'invalid_email';
  end if;
  if exists (select 1 from profiles p where lower(p.email) = v_email) then
    return 'unavailable';
  end if;
  insert into invitations (email, role, org_id, invited_by)
  values (v_email, 'school_staff', p_org, auth.uid());
  perform log_audit('invite_school_staff', 'organization', p_org, '{}'::jsonb);
  return 'invited';
end;
$$ language plpgsql security definer set search_path = public;
