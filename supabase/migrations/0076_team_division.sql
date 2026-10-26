-- Add division/class to tournament_teams, matching the frontend's team-start
-- wizard (frontend/src/app/dashboard/team/start/page.tsx), which already
-- collects a division choice but has nowhere to send it — student_start_team
-- previously accepted only a tournament id and team name.

alter table tournament_teams
  add column division text not null default 'Robotics 101'
    check (division in ('Robotics 101', 'Advanced Engineering', 'Open Class'));

-- create or replace with a different argument list creates a new overload
-- rather than replacing the old one, so the prior 2-argument version (and its
-- separate grants) must be dropped explicitly or both would remain callable.
drop function if exists student_start_team(uuid, text);

create function student_start_team(p_tournament uuid, p_name text, p_division text default 'Robotics 101')
returns uuid as $$
declare
  v_org uuid := my_org_id();
  v_id uuid;
begin
  if my_role() is distinct from 'student' or v_org is null or not is_active_account() then
    raise exception 'only a student of an active school can start a team';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;
  if not exists (select 1 from school_team_slots where tournament_id = p_tournament and org_id = v_org) then
    raise exception 'your school staff have not opened team slots yet';
  end if;
  if exists (
    select 1 from tournament_team_members m join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = auth.uid() and t.status not in ('withdrawn', 'rejected')
  ) then raise exception 'you are already in a team for this tournament'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(p_name)) > 40 then
    raise exception 'give the team a name of up to 40 characters';
  end if;
  if coalesce(p_division, '') not in ('Robotics 101', 'Advanced Engineering', 'Open Class') then
    raise exception 'choose a valid class/division';
  end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    insert into tournament_teams (tournament_id, org_id, name, division, created_by, captain_id)
    values (p_tournament, v_org, trim(p_name), p_division, auth.uid(), auth.uid()) returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    raise exception 'a team with this name already exists in this tournament';
  end;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), v_org);
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function student_start_team(uuid, text, text) from public, anon;
grant execute on function student_start_team(uuid, text, text) to authenticated;
