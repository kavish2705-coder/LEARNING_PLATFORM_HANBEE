-- Task 3 (independent-student-pool plan): pool-team creation + pool branches
-- on invite_to_team, leave_team, team_chat_create.
--
-- Independent ("road-kid") students (profiles.is_solo = true, org_id null)
-- can now form a team with each other, the same way school students form a
-- team within their school, with these differences:
--  * start_pool_team() is a brand-new function (not a parameter change to
--    student_start_team, which hard-requires my_org_id() is not null) --
--    org_id is left null, no school_team_slots/team_size quota applies
--    (team_size/slots are school-only concerns per migration 0039's header).
--  * invite_to_team(): a pool captain can invite another independent
--    student (matched on "both independent" instead of "same org").
--  * leave_team(): a pool team has no school staff to send it back, so a
--    pool member may leave through 'proposed' (not just 'draft'); the
--    school branch's 'draft'-only cutoff is unchanged.
--  * team_chat_create(): a pool team's chat is seeded with only the
--    captain (no org staff to add).
--
-- Important distinction preserved: 0039's header documents that "individual
-- entries (org_id null) are exempt ... from chat" -- that's create_solo_team
-- (0041), a team-of-one tournament entry, which is NOT a pool team and must
-- keep getting no chat. Both share org_id is null, so team_chat_create can't
-- tell them apart from columns alone; start_pool_team sets a transaction-local
-- flag (app.pool_team_write, same convention as app.trusted_portal_write)
-- around its insert so the trigger can tell "a pool team was just created"
-- from "a solo entry was just created" and only seed a chat for the former.
--
-- Every function below is `create or replace`. Each existing org_id is not
-- null branch is copied forward byte-for-byte from 0039; only new org_id is
-- null branches are added.

-- ---------------------------------------------------------------------------
-- start_pool_team: an independent student starts a team with no school.
-- ---------------------------------------------------------------------------
create or replace function start_pool_team(p_tournament uuid, p_name text)
returns uuid as $$
declare
  v_id uuid;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an independent student can start a pool team';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;
  if student_has_active_team(p_tournament, auth.uid()) then
    raise exception 'you are already in a team for this tournament';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(p_name)) > 40 then
    raise exception 'give the team a name of up to 40 characters';
  end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    perform set_config('app.pool_team_write', 'true', true);
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, null, trim(p_name), auth.uid(), auth.uid()) returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
    perform set_config('app.pool_team_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    perform set_config('app.pool_team_write', '', true);
    raise exception 'a team with this name already exists in this tournament';
  end;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), null);
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- invite_to_team: add a pool branch. The org_id is not null branch below
-- (captain/staff check through "no open spots left") is copied verbatim
-- from 0039's invite_to_team; only the surrounding not-found check and the
-- new org_id is null branch are new.
-- ---------------------------------------------------------------------------
create or replace function invite_to_team(p_team uuid, p_student uuid)
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
    if not exists (
      select 1 from organization_members m join profiles p on p.id = m.user_id
      where m.user_id = p_student and m.org_id = t.org_id and m.status = 'active' and m.member_role = 'student'
        and p.role = 'student' and p.account_status = 'active'
    ) then raise exception 'you can only invite students of your own school'; end if;
    if exists (
      select 1 from tournament_team_members m join tournament_teams x on x.id = m.team_id
      where m.tournament_id = t.tournament_id and m.student_id = p_student and x.status not in ('withdrawn', 'rejected')
    ) then raise exception 'this student is already in a team for this tournament'; end if;
    select team_size into v_size from tournaments where id = t.tournament_id;
    select count(*) into v_members from tournament_team_members where team_id = p_team;
    select count(*) into v_pending from team_invitations where team_id = p_team and status = 'pending';
    if v_members + v_pending >= v_size then raise exception 'there are no open spots left for more invitations'; end if;
  else
    if t.captain_id is distinct from auth.uid() then raise exception 'only the captain can invite'; end if;
    if t.status <> 'draft' then raise exception 'the team can only change while it is being formed'; end if;
    if not exists (
      select 1 from profiles p
      where p.id = p_student and p.role = 'student' and p.account_status = 'active' and coalesce(p.is_solo, false)
    ) then raise exception 'you can only invite other independent students'; end if;
    if student_has_active_team(t.tournament_id, p_student) then raise exception 'this student is already in a team for this tournament'; end if;
    select team_size into v_size from tournaments where id = t.tournament_id;
    select count(*) into v_members from tournament_team_members where team_id = p_team;
    select count(*) into v_pending from team_invitations where team_id = p_team and status = 'pending';
    if v_members + v_pending >= v_size then raise exception 'there are no open spots left for more invitations'; end if;
  end if;
  begin
    insert into team_invitations (team_id, tournament_id, student_id, invited_by)
    values (p_team, t.tournament_id, p_student, auth.uid()) returning id into v_id;
  exception when unique_violation then
    raise exception 'this student has already been invited';
  end;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- leave_team: add a pool branch. The membership check above the branch, and
-- the delete/withdraw logic below it, are shared and unchanged. Only the
-- status cutoff in the middle is branched: the org_id is not null case below
-- is copied verbatim from 0039 (draft-only).
-- ---------------------------------------------------------------------------
create or replace function leave_team(p_team uuid)
returns void as $$
declare
  t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not exists (select 1 from tournament_team_members where team_id = p_team and student_id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  if t.org_id is not null then
    if t.status <> 'draft' then raise exception 'ask your school staff: a submitted team can only change if they send it back'; end if;
  else
    if t.status not in ('draft', 'proposed') then raise exception 'this team has already applied and can no longer be left'; end if;
  end if;
  delete from tournament_team_members where team_id = p_team and student_id = auth.uid();
  if not exists (select 1 from tournament_team_members where team_id = p_team) then
    perform set_config('app.trusted_portal_write', 'true', true);
    update tournament_teams set status = 'withdrawn' where id = p_team;
    perform set_config('app.trusted_portal_write', '', true);
    update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- team_chat_create: add a pool branch. The org_id is not null branch below
-- is copied verbatim from 0039's team_chat_create.
-- ---------------------------------------------------------------------------
create or replace function team_chat_create() returns trigger as $$
declare
  v_conv uuid;
begin
  if new.org_id is not null then
    insert into conversations (kind, title, team_id, created_by)
    values ('group', new.name || ' (team)', new.id, coalesce(new.captain_id, new.created_by))
    returning id into v_conv;
    insert into conversation_participants (conversation_id, user_id, member_role)
    select v_conv, m.user_id, 'admin'::chat_member_role
    from organization_members m join profiles p on p.id = m.user_id
    where m.org_id = new.org_id and m.status = 'active' and m.member_role in ('owner', 'staff') and p.account_status = 'active'
    on conflict do nothing;
    return new;
  end if;
  -- org_id is null covers both a pool team (start_pool_team) and a solo
  -- tournament-of-one entry (create_solo_team, 0041), which must stay
  -- exempt from a chat exactly as documented in 0039's header. Only the
  -- former sets this transaction-local flag around its insert.
  if coalesce(current_setting('app.pool_team_write', true), '') <> 'true' then
    return new;
  end if;
  -- Pool team: no school staff to add. Seed with the captain only.
  insert into conversations (kind, title, team_id, created_by)
  values ('group', new.name || ' (team)', new.id, coalesce(new.captain_id, new.created_by))
  returning id into v_conv;
  insert into conversation_participants (conversation_id, user_id, member_role)
  values (v_conv, coalesce(new.captain_id, new.created_by), 'admin'::chat_member_role)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function start_pool_team(uuid, text) from public, anon;
grant execute on function start_pool_team(uuid, text) to authenticated;
