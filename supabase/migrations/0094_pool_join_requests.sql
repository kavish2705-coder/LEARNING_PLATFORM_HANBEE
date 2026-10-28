-- Task 4 (independent-student-pool plan): join requests -- the reverse
-- direction of invite_to_team. Instead of a pool captain inviting a student,
-- an independent student asks to join an existing pool team and the captain
-- accepts or declines.
--
-- Lock discipline mirrors 0039's invite_to_team/respond_team_invitation
-- exactly: respond_join_request takes `select ... for update` on the
-- team_join_requests row first (ownership/status), then -- only on the
-- accept path, exactly like respond_team_invitation -- takes a second
-- `select ... for update` on the tournament_teams row immediately before
-- re-checking team status and counting current members against
-- tournaments.team_size. That second lock is what makes two near-
-- simultaneous accepts that would together exceed team_size serialize: the
-- first to acquire the row lock inserts its member and commits; the second
-- blocks until then, re-reads the now-current member count under its own
-- lock, and is correctly refused if the team is now full.

-- ---------------------------------------------------------------------------
-- request_join_team: an independent student asks to join a pool team.
-- ---------------------------------------------------------------------------
create or replace function request_join_team(p_team uuid)
returns uuid as $$
declare
  t tournament_teams;
  v_id uuid;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an independent student can request to join a pool team';
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
    insert into team_join_requests (team_id, student_id) values (p_team, auth.uid()) returning id into v_id;
  exception when unique_violation then
    raise exception 'you already have a pending request for this team';
  end;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- respond_join_request: the captain accepts or declines a pending request.
-- ---------------------------------------------------------------------------
create or replace function respond_join_request(p_request uuid, p_decision text)
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

  -- Lock the request row first and check ownership/status, same order as
  -- respond_team_invitation locking the invitation row first.
  select * into j from team_join_requests where id = p_request for update;
  if j.id is null then raise exception 'not found'; end if;
  select * into t from tournament_teams where id = j.team_id;
  if t.captain_id is distinct from auth.uid() then raise exception 'only the captain can respond to a join request'; end if;
  if j.status <> 'pending' then raise exception 'this request has already been answered'; end if;

  if p_decision = 'declined' then
    update team_join_requests set status = 'declined' where id = j.id;
    return;
  end if;

  -- Accept path: lock the team row immediately before re-checking status and
  -- counting current members against tournaments.team_size, exactly mirroring
  -- respond_team_invitation's lock-then-recheck order.
  select * into t from tournament_teams where id = j.team_id for update;
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
  if v_members >= v_size then
    raise exception 'there are no open spots left on this team';
  end if;

  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (t.id, t.tournament_id, j.student_id, null);
  update team_join_requests set status = 'accepted' where id = j.id;

  -- Cancel the accepted student's other pending invites and join requests,
  -- tournament-wide, same as respond_team_invitation cancelling other
  -- pending invitations on accept.
  update team_invitations set status = 'cancelled', decided_at = now()
   where student_id = j.student_id and tournament_id = t.tournament_id and status = 'pending';
  update team_join_requests set status = 'cancelled'
   where student_id = j.student_id and status = 'pending' and id <> j.id
     and team_id in (select tt.id from tournament_teams tt where tt.tournament_id = t.tournament_id);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function request_join_team(uuid), respond_join_request(uuid, text) from public, anon;
grant execute on function request_join_team(uuid), respond_join_request(uuid, text) to authenticated;
