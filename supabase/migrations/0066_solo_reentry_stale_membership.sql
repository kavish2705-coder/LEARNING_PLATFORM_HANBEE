-- Same bug class as 0065, one layer down: tournament_team_members has
-- unique (tournament_id, student_id) — correct, a student can't be on two
-- *live* teams in the same tournament at once — but create_solo_team (0041)
-- never cleaned up the membership row left behind by a rejected or withdrawn
-- team, so a student whose solo entry was rejected could never re-apply:
-- the re-insert hit "duplicate key value violates unique constraint
-- tournament_team_members_tournament_id_student_id_key".
--
-- Fix: before inserting the new membership row, delete any leftover
-- membership row this student has for this tournament whose team is
-- rejected or withdrawn. A live team's membership is untouched, so the
-- "already have an entry" check above this still does its job.

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
  insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
  values (p_tournament, null, v_name, auth.uid(), auth.uid())
  returning id into v_id;
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
