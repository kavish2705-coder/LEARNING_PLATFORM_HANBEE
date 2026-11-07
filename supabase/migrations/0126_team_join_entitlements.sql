-- Migration 0126: team membership must enforce the same tournament-access and active
-- Driver License requirements as creating a tournament team.

create or replace function public.student_has_active_tournament_entitlements(p_student uuid)
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    join public.driver_licenses l on l.student_id = p.id
    where p.id = p_student
      and p.role = 'student'
      and p.account_status = 'active'
      and p.tournament_access = 'active'
      and l.status = 'active'
  );
$$ language sql stable security definer set search_path = public, pg_temp;

revoke all on function public.student_has_active_tournament_entitlements(uuid)
  from public, anon, authenticated;

create or replace function public.request_join_team(p_team uuid)
returns uuid as $$
declare
  t tournament_teams;
  v_id uuid;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an independent student can request to join a pool team';
  end if;
  if not student_has_active_tournament_entitlements(auth.uid()) then
    raise exception 'active RC Tournament access and a Driver License are required to join a team';
  end if;

  select * into t from tournament_teams where id = p_team;
  if t.id is null then raise exception 'team not found'; end if;
  if t.org_id is not null then raise exception 'you can only request to join an independent pool team'; end if;
  if t.status <> 'draft' then raise exception 'the team can only change while it is being formed'; end if;
  if t.captain_id = auth.uid() then raise exception 'you are already the captain of this team'; end if;
  if student_has_active_team(t.tournament_id, auth.uid()) then
    raise exception 'you are already in a team for this tournament';
  end if;

  begin
    insert into team_join_requests (team_id, student_id)
    values (p_team, auth.uid())
    returning id into v_id;
  exception when unique_violation then
    raise exception 'you already have a pending request for this team';
  end;
  perform create_notification(t.captain_id, 'team_join_request', 'A student wants to join your team',
    'A student has requested to join ' || t.name || '.', '/dashboard/team');
  perform log_audit('request_join_team', 'team_join_request', v_id, jsonb_build_object('team_id', p_team));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.respond_join_request(p_request uuid, p_decision text)
returns void as $$
declare
  j team_join_requests;
  t tournament_teams;
  v_size int;
  v_members int;
begin
  if p_decision not in ('accepted', 'declined') then
    raise exception 'decision must be ''accepted'' or ''declined''';
  end if;
  select * into j from team_join_requests where id = p_request for update;
  if j.id is null then raise exception 'not found'; end if;
  select * into t from tournament_teams where id = j.team_id for update;
  if t.captain_id is distinct from auth.uid() then
    raise exception 'only the captain can respond to a join request';
  end if;
  if j.status <> 'pending' then raise exception 'this request has already been answered'; end if;

  if p_decision = 'declined' then
    update team_join_requests set status = 'declined' where id = j.id;
    perform create_notification(j.student_id, 'team_join_request_declined', 'Team request declined',
      'Your request to join ' || t.name || ' was declined.', '/dashboard/team');
    perform log_audit('respond_join_request', 'team_join_request', j.id, jsonb_build_object('decision', p_decision));
    return;
  end if;

  if not student_has_active_tournament_entitlements(j.student_id) then
    raise exception 'the student needs active RC Tournament access and a Driver License before joining';
  end if;
  if t.status <> 'draft' then
    update team_join_requests set status = 'cancelled' where id = j.id;
    raise exception 'this team is no longer forming';
  end if;
  if student_has_active_team(t.tournament_id, j.student_id) then
    update team_join_requests set status = 'cancelled' where id = j.id;
    raise exception 'this student is already in a team for this tournament';
  end if;
  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_members from tournament_team_members where team_id = t.id;
  if v_members >= v_size then raise exception 'there are no open spots left on this team'; end if;

  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (t.id, t.tournament_id, j.student_id, null);
  update team_join_requests set status = 'accepted' where id = j.id;
  update team_invitations set status = 'cancelled', decided_at = now()
   where student_id = j.student_id and tournament_id = t.tournament_id and status = 'pending';
  update team_join_requests set status = 'cancelled'
   where student_id = j.student_id and status = 'pending' and id <> j.id
     and team_id in (select tt.id from tournament_teams tt where tt.tournament_id = t.tournament_id);
  perform create_notification(j.student_id, 'team_join_request_accepted', 'You joined a team',
    'Your request to join ' || t.name || ' was accepted.', '/dashboard/team');
  perform log_audit('respond_join_request', 'team_join_request', j.id, jsonb_build_object('decision', p_decision));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.respond_team_invitation(p_invitation uuid, p_accept boolean)
returns void as $$
declare
  i team_invitations;
  t tournament_teams;
begin
  select * into i from team_invitations where id = p_invitation for update;
  if i.id is null or i.student_id <> auth.uid() then raise exception 'not allowed'; end if;
  if i.status <> 'pending' then raise exception 'this invitation has already been answered'; end if;
  if i.expires_at < now() then
    update team_invitations set status = 'cancelled', decided_at = now() where id = i.id;
    raise exception 'this invitation has expired';
  end if;
  if not coalesce(p_accept, false) then
    update team_invitations set status = 'declined', decided_at = now() where id = i.id;
    return;
  end if;
  if not student_has_active_tournament_entitlements(auth.uid()) then
    raise exception 'active RC Tournament access and a Driver License are required to join a team';
  end if;

  select * into t from tournament_teams where id = i.team_id for update;
  if t.status <> 'draft' then
    update team_invitations set status = 'cancelled', decided_at = now() where id = i.id;
    raise exception 'this team is no longer forming';
  end if;
  if student_has_active_team(t.tournament_id, auth.uid()) then
    update team_invitations set status = 'cancelled', decided_at = now() where id = i.id;
    raise exception 'you are already in a team for this tournament';
  end if;

  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (t.id, t.tournament_id, auth.uid(), t.org_id);
  update team_invitations set status = 'accepted', decided_at = now() where id = i.id;
  update team_invitations set status = 'cancelled', decided_at = now()
   where student_id = auth.uid() and tournament_id = i.tournament_id and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;

select pg_notify('pgrst', 'reload schema');
