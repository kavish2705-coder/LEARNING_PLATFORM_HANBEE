-- 0102 was edited after it had already been marked applied on staging (the
-- deployed list_poolable_students had a p_tournament_id parameter; the
-- current file has p_tournament, matching what poolApi.ts actually calls).
-- supabase db push only tracks migrations by file version, not content, so
-- that edit never reached staging and the live RPC 404'd (PGRST202). This
-- re-applies 0102's current content verbatim under a new version so the
-- deployed functions match the file byte-for-byte, then forces a schema
-- cache reload the same way 0104 did.

drop function if exists public.staff_create_independent_invite(text, text);

create function public.staff_create_independent_invite(p_full_name text, p_email text)
returns jsonb as $$
declare
  v_email text := lower(trim(p_email));
  v_full_name text := nullif(trim(p_full_name), '');
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

  insert into invitations (email, role, org_id, invited_by, full_name)
  values (v_email, 'student', null, auth.uid(), v_full_name)
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

create or replace function public.list_independent_student_invites()
returns table (
  invitation_id uuid,
  full_name text,
  email text,
  status text,
  accepted boolean,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz,
  student_id uuid
) as $$
  select i.id, i.full_name, i.email,
    case
      when i.accepted then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      else 'pending'
    end,
    i.accepted, i.expires_at, i.revoked_at, i.created_at, p.id
  from invitations i
  left join profiles p on lower(p.email) = lower(i.email) and p.is_solo = true
  where (is_hanbee_staff() or is_manager())
    and i.role = 'student' and i.org_id is null
  order by i.created_at desc;
$$ language sql stable security definer set search_path = public;

drop function if exists public.list_poolable_students(uuid);

create function public.list_poolable_students(p_tournament uuid)
returns table (student_id uuid, full_name text) as $$
declare
  v_team uuid;
begin
  if not (is_solo_student() or is_staff_or_manager()) then
    raise exception 'not allowed';
  end if;
  select t.id into v_team
  from tournament_teams t
  join tournament_team_members m on m.team_id = t.id
  where t.tournament_id = p_tournament and t.org_id is null
    and t.captain_id = auth.uid() and t.status = 'draft'
  limit 1;

  if not is_staff_or_manager() and v_team is null then
    return;
  end if;

  return query
  select p.id, p.full_name
  from profiles p
  where p.role = 'student' and p.account_status = 'active' and p.is_solo = true
    and p.id <> auth.uid()
    and not student_has_active_team(p_tournament, p.id)
    and (v_team is null or not exists (
      select 1 from team_invitations i
      where i.team_id = v_team and i.student_id = p.id and i.status = 'pending'
    ))
  order by p.full_name;
end;
$$ language plpgsql stable security definer set search_path = public;

drop function if exists public.list_open_pool_teams(uuid);

create function public.list_open_pool_teams(p_tournament uuid)
returns table (
  team_id uuid,
  team_name text,
  captain_name text,
  member_count int,
  team_size int
) as $$
begin
  if not (is_solo_student() or is_staff_or_manager()) then
    raise exception 'not allowed';
  end if;
  return query
  select t.id, t.name, cap.full_name,
    (select count(*)::int from tournament_team_members m where m.team_id = t.id),
    tr.team_size
  from tournament_teams t
  join tournaments tr on tr.id = t.tournament_id
  left join profiles cap on cap.id = t.captain_id
  where t.tournament_id = p_tournament and t.org_id is null and t.status = 'draft'
    and (select count(*) from tournament_team_members m where m.team_id = t.id) < tr.team_size
    and not student_has_active_team(p_tournament, auth.uid())
  order by t.created_at asc;
end;
$$ language plpgsql stable security definer set search_path = public;

drop function if exists public.list_pool_join_requests(uuid);

create function public.list_pool_join_requests(p_tournament uuid)
returns table (
  request_id uuid,
  team_id uuid,
  team_name text,
  student_id uuid,
  student_name text,
  created_at timestamptz
) as $$
  select r.id, r.team_id, t.name, r.student_id, p.full_name, r.created_at
  from team_join_requests r
  join tournament_teams t on t.id = r.team_id
  join profiles p on p.id = r.student_id
  where t.tournament_id = p_tournament and t.captain_id = auth.uid()
    and t.org_id is null and r.status = 'pending'
    and (is_solo_student() or is_staff_or_manager());
$$ language sql stable security definer set search_path = public;

create or replace function public.invite_to_team(p_team uuid, p_student uuid)
returns uuid as $$
declare
  t tournament_teams;
  v_size int;
  v_members int;
  v_pending int;
  v_id uuid;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null then raise exception 'team not found'; end if;
  if t.org_id is not null then
    if not (t.captain_id = auth.uid() or can_manage_org(t.org_id)) then raise exception 'only the captain or school staff can invite'; end if;
    if t.status <> 'draft' then raise exception 'the team can only change while it is being formed'; end if;
    if not exists (select 1 from organization_members m join profiles p on p.id = m.user_id where m.user_id = p_student and m.org_id = t.org_id and m.status = 'active' and m.member_role = 'student' and p.role = 'student' and p.account_status = 'active') then raise exception 'you can only invite students of your own school'; end if;
    if exists (select 1 from tournament_team_members m join tournament_teams x on x.id = m.team_id where m.tournament_id = t.tournament_id and m.student_id = p_student and x.status not in ('withdrawn', 'rejected')) then raise exception 'this student is already in a team for this tournament'; end if;
  else
    if t.captain_id is distinct from auth.uid() then raise exception 'only the captain can invite'; end if;
    if t.status <> 'draft' then raise exception 'the team can only change while it is being formed'; end if;
    if not exists (select 1 from profiles p where p.id = p_student and p.role = 'student' and p.account_status = 'active' and coalesce(p.is_solo, false)) then raise exception 'you can only invite other independent students'; end if;
    if student_has_active_team(t.tournament_id, p_student) then raise exception 'this student is already in a team for this tournament'; end if;
  end if;
  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_members from tournament_team_members where team_id = p_team;
  select count(*) into v_pending from team_invitations where team_id = p_team and status = 'pending';
  if v_members + v_pending >= v_size then raise exception 'there are no open spots left for more invitations'; end if;
  begin
    insert into team_invitations (team_id, tournament_id, student_id, invited_by) values (p_team, t.tournament_id, p_student, auth.uid()) returning id into v_id;
  exception when unique_violation then raise exception 'this student has already been invited'; end;
  perform create_notification(p_student, 'team_invitation', 'You have been invited to a team', t.name || ' invited you to join their tournament team.', '/dashboard/team');
  perform log_audit('invite_to_team', 'tournament_team', p_team, jsonb_build_object('student_id', p_student));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.request_join_team(p_team uuid)
returns uuid as $$
declare t tournament_teams; v_id uuid;
begin
  if not is_solo_student() or not is_active_account() then raise exception 'only an independent student can request to join a pool team'; end if;
  select * into t from tournament_teams where id = p_team;
  if t.id is null then raise exception 'team not found'; end if;
  if t.org_id is not null then raise exception 'you can only request to join an independent pool team'; end if;
  if t.status <> 'draft' then raise exception 'the team can only change while it is being formed'; end if;
  if t.captain_id = auth.uid() then raise exception 'you are already the captain of this team'; end if;
  if student_has_active_team(t.tournament_id, auth.uid()) then raise exception 'you are already in a team for this tournament'; end if;
  begin
    insert into team_join_requests (team_id, student_id) values (p_team, auth.uid()) returning id into v_id;
  exception when unique_violation then raise exception 'you already have a pending request for this team'; end;
  perform create_notification(t.captain_id, 'team_join_request', 'A student wants to join your team', 'A student has requested to join ' || t.name || '.', '/dashboard/team');
  perform log_audit('request_join_team', 'team_join_request', v_id, jsonb_build_object('team_id', p_team));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.respond_join_request(p_request uuid, p_decision text)
returns void as $$
declare j team_join_requests; t tournament_teams; v_size int; v_members int;
begin
  if p_decision not in ('accepted', 'declined') then raise exception 'decision must be ''accepted'' or ''declined'''; end if;
  select * into j from team_join_requests where id = p_request for update;
  if j.id is null then raise exception 'not found'; end if;
  select * into t from tournament_teams where id = j.team_id for update;
  if t.captain_id is distinct from auth.uid() then raise exception 'only the captain can respond to a join request'; end if;
  if j.status <> 'pending' then raise exception 'this request has already been answered'; end if;
  if p_decision = 'declined' then
    update team_join_requests set status = 'declined' where id = j.id;
    perform create_notification(j.student_id, 'team_join_request_declined', 'Team request declined', 'Your request to join ' || t.name || ' was declined.', '/dashboard/team');
    perform log_audit('respond_join_request', 'team_join_request', j.id, jsonb_build_object('decision', p_decision));
    return;
  end if;
  if t.status <> 'draft' then update team_join_requests set status = 'cancelled' where id = j.id; raise exception 'this team is no longer forming'; end if;
  if student_has_active_team(t.tournament_id, j.student_id) then update team_join_requests set status = 'cancelled' where id = j.id; raise exception 'this student is already in a team for this tournament'; end if;
  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_members from tournament_team_members where team_id = t.id;
  if v_members >= v_size then raise exception 'there are no open spots left on this team'; end if;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join) values (t.id, t.tournament_id, j.student_id, null);
  update team_join_requests set status = 'accepted' where id = j.id;
  update team_invitations set status = 'cancelled', decided_at = now() where student_id = j.student_id and tournament_id = t.tournament_id and status = 'pending';
  update team_join_requests set status = 'cancelled' where student_id = j.student_id and status = 'pending' and id <> j.id and team_id in (select tt.id from tournament_teams tt where tt.tournament_id = t.tournament_id);
  perform create_notification(j.student_id, 'team_join_request_accepted', 'You joined a team', 'Your request to join ' || t.name || ' was accepted.', '/dashboard/team');
  perform log_audit('respond_join_request', 'team_join_request', j.id, jsonb_build_object('decision', p_decision));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.staff_create_independent_invite(text, text), public.list_independent_student_invites(), public.list_poolable_students(uuid), public.list_open_pool_teams(uuid), public.list_pool_join_requests(uuid), public.invite_to_team(uuid, uuid), public.request_join_team(uuid), public.respond_join_request(uuid, text) from public, anon;
grant execute on function public.staff_create_independent_invite(text, text), public.list_independent_student_invites(), public.list_poolable_students(uuid), public.list_open_pool_teams(uuid), public.list_pool_join_requests(uuid), public.invite_to_team(uuid, uuid), public.request_join_team(uuid), public.respond_join_request(uuid, text) to authenticated;

select pg_notify('pgrst', 'reload schema');
