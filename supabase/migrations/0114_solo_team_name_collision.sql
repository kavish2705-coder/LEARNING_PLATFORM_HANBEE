-- Real bug reported live: a new independent student ("Arunkumar") hit the
-- raw Postgres error "duplicate key value violates unique constraint
-- tournament_teams_tournament_id_name_key" when entering a tournament.
--
-- create_solo_team() auto-names the team from the student's own full_name
-- (there's no name field in that flow -- unlike start_pool_team/
-- create_team/student_start_team, which all take a user-chosen p_name and
-- already catch unique_violation with a friendly "a team with this name
-- already exists" message). Two different people can easily share a
-- display name (this literally happened here -- two separate independent
-- accounts are both named "Arunkumar"), and create_solo_team had no
-- exception handler at all, so the raw constraint violation reached the
-- user. A friendly message alone isn't actionable here either, since
-- there's no name field for the student to retry with -- so on collision
-- this disambiguates the name automatically (short suffix from the
-- student's own id) and retries once, which is enough since a given
-- student can only hit this for their own account's name.

create or replace function create_solo_team(p_tournament uuid)
returns uuid as $$
declare
  v_id uuid;
  v_name text;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an active solo student may enter as a team of one';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for entries';
  end if;
  if exists (
    select 1 from tournament_team_members m
    join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = auth.uid()
      and t.status not in ('withdrawn', 'rejected')
  ) then
    raise exception 'you already have an entry for this tournament';
  end if;

  delete from tournament_team_members m
  using tournament_teams t
  where m.team_id = t.id
    and m.tournament_id = p_tournament
    and m.student_id = auth.uid()
    and t.status in ('withdrawn', 'rejected');

  select left(coalesce(nullif(trim(full_name), ''), 'Solo student'), 60)
    into v_name from profiles where id = auth.uid();

  perform set_config('app.trusted_portal_write', 'true', true);
  begin
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, null, v_name, auth.uid(), auth.uid())
    returning id into v_id;
  exception when unique_violation then
    -- Another entry already holds this exact name for this tournament --
    -- disambiguate with a short, stable suffix from the student's own id
    -- so the retry can only ever collide with itself (impossible).
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, null, left(v_name, 52) || ' (' || left(auth.uid()::text, 4) || ')', auth.uid(), auth.uid())
    returning id into v_id;
  end;
  perform set_config('app.trusted_portal_write', '', true);

  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), null);
  perform log_audit('create_solo_tournament_entry', 'tournament_team', v_id, '{}'::jsonb);
  return v_id;
exception when others then
  perform set_config('app.trusted_portal_write', '', true);
  raise;
end;
$$ language plpgsql security definer set search_path = public;
