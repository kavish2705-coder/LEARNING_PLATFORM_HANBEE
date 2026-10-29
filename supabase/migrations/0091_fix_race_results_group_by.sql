-- list_tournament_race_results() (0086) ordered by tournament.starts_at and
-- race.created_at without either column in its GROUP BY, which is only
-- legal when every selected/ordered column is grouped or aggregated.
-- Postgres rejects it outright: "column \"tournament.starts_at\" must appear
-- in the GROUP BY clause or be used in an aggregate function" -- a 400 on
-- every call, confirmed live against staging. Add both to GROUP BY.
create or replace function public.list_tournament_race_results()
returns table (
  tournament_id uuid,
  tournament_title text,
  race_id uuid,
  race_name text,
  team_id uuid,
  team_name text,
  finished boolean,
  finish_time_ms bigint,
  lap_count integer,
  average_lap_time_ms numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may view race result administration';
  end if;

  return query
  select race.tournament_id, tournament.title, race.id, race.name,
    team.id, team.name, result.finished, result.finish_time_ms,
    count(lap.lap_number)::integer, avg(lap.lap_time_ms)::numeric
  from public.tournament_race_results result
  join public.tournament_races race on race.id = result.race_id
  join public.tournaments tournament on tournament.id = race.tournament_id
  join public.tournament_teams team on team.id = result.team_id
  left join public.tournament_race_laps lap
    on lap.race_id = result.race_id and lap.team_id = result.team_id
  group by race.tournament_id, tournament.title, race.id, race.name,
    team.id, team.name, result.finished, result.finish_time_ms,
    tournament.starts_at, race.created_at
  order by tournament.starts_at desc, race.created_at desc, team.name;
end;
$$;
