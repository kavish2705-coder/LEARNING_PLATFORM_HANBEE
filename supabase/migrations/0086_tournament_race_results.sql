create table public.tournament_races (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, tournament_id)
);

create unique index tournament_races_tournament_name_unique
  on public.tournament_races (tournament_id, lower(name));

create table public.tournament_race_results (
  race_id uuid not null,
  tournament_id uuid not null,
  team_id uuid not null,
  finished boolean not null default false,
  finish_time_ms bigint,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (race_id, team_id),
  foreign key (race_id, tournament_id)
    references public.tournament_races (id, tournament_id) on delete cascade,
  foreign key (team_id, tournament_id)
    references public.tournament_teams (id, tournament_id) on delete cascade,
  check ((finished and finish_time_ms > 0) or (not finished and finish_time_ms is null))
);

create table public.tournament_race_laps (
  race_id uuid not null,
  team_id uuid not null,
  lap_number smallint not null check (lap_number > 0),
  lap_time_ms integer not null check (lap_time_ms > 0),
  primary key (race_id, team_id, lap_number),
  foreign key (race_id, team_id)
    references public.tournament_race_results (race_id, team_id) on delete cascade
);

alter table public.tournament_races enable row level security;
alter table public.tournament_race_results enable row level security;
alter table public.tournament_race_laps enable row level security;

revoke all on public.tournament_races, public.tournament_race_results, public.tournament_race_laps
  from public, anon, authenticated;

create or replace function public.record_tournament_race_result(
  p_tournament uuid,
  p_race_name text,
  p_team uuid,
  p_lap_times_ms integer[],
  p_finished boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_race_id uuid;
  v_finish_time_ms bigint;
  v_lap_count integer;
begin
  if not (is_manager() or is_hanbee_staff()) then
    raise exception 'only Hanbee staff may record race results';
  end if;
  if p_tournament is null or p_team is null then
    raise exception 'choose a tournament and verified team';
  end if;
  if length(trim(coalesce(p_race_name, ''))) not between 1 and 100 then
    raise exception 'race name must be between 1 and 100 characters';
  end if;
  if not exists (
    select 1 from public.tournament_teams
    where id = p_team and tournament_id = p_tournament and status = 'verified'
  ) then
    raise exception 'the selected team is not verified for this tournament';
  end if;

  v_lap_count := coalesce(cardinality(p_lap_times_ms), 0);
  if v_lap_count > 100 then
    raise exception 'a race entry cannot contain more than 100 lap times';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_lap_times_ms, '{}'::integer[])) as lap(time_ms)
    where lap.time_ms is null or lap.time_ms <= 0
  ) then
    raise exception 'lap times must all be positive';
  end if;
  if coalesce(p_finished, false) and v_lap_count = 0 then
    raise exception 'a completed race must include at least one lap time';
  end if;

  insert into public.tournament_races (tournament_id, name, created_by)
  values (p_tournament, trim(p_race_name), auth.uid())
  on conflict (tournament_id, (lower(name)))
  do update set name = excluded.name
  returning id into v_race_id;

  if coalesce(p_finished, false) then
    select sum(lap.time_ms)::bigint into v_finish_time_ms
    from unnest(p_lap_times_ms) as lap(time_ms);
  else
    v_finish_time_ms := null;
  end if;

  insert into public.tournament_race_results
    (race_id, tournament_id, team_id, finished, finish_time_ms, recorded_by)
  values
    (v_race_id, p_tournament, p_team, coalesce(p_finished, false), v_finish_time_ms, auth.uid())
  on conflict (race_id, team_id) do update
    set finished = excluded.finished,
        finish_time_ms = excluded.finish_time_ms,
        recorded_by = excluded.recorded_by,
        created_at = now();

  delete from public.tournament_race_laps
  where race_id = v_race_id and team_id = p_team;
  insert into public.tournament_race_laps (race_id, team_id, lap_number, lap_time_ms)
  select v_race_id, p_team, lap.ordinality::smallint, lap.time_ms
  from unnest(coalesce(p_lap_times_ms, '{}'::integer[])) with ordinality as lap(time_ms, ordinality);

  perform log_audit(
    'record_tournament_race_result',
    'tournament',
    p_tournament,
    jsonb_build_object(
      'race_name', trim(p_race_name),
      'team_id', p_team,
      'finished', coalesce(p_finished, false),
      'lap_count', v_lap_count
    )
  );

  return v_race_id;
end;
$$;

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
    team.id, team.name, result.finished, result.finish_time_ms
  order by tournament.starts_at desc, race.created_at desc, team.name;
end;
$$;

create or replace function public.get_student_leaderboard(p_tournament uuid)
returns table (
  team_id uuid,
  team_name text,
  school_name text,
  org_id uuid,
  rank int,
  points int,
  notes text,
  field_size int,
  matches_participated int,
  wins int,
  top_three_finishes int,
  average_lap_time_ms numeric,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with entries as (
    select team.id as team_id, team.tournament_id, team.name as team_name,
      team.org_id, organization.name as school_name,
      result.rank as submitted_rank,
      coalesce(result.points, 0) as points, coalesce(result.notes, '') as notes
    from public.tournament_teams team
    left join public.organizations organization on organization.id = team.org_id
    left join public.tournament_results result
      on result.team_id = team.id and result.tournament_id = team.tournament_id
    where team.tournament_id = p_tournament and team.status = 'verified'
  ),
  ranked_entries as (
    select entry.*,
      case when entry.submitted_rank is null then null
        else rank() over (order by entry.submitted_rank nulls last)::int
      end as rank
    from entries entry
  ),
  field_size as (
    select count(*)::int as value
    from public.tournament_teams
    where tournament_id = p_tournament and status = 'verified'
  ),
  race_places as (
    select result.race_id, result.team_id, result.tournament_id,
      rank() over (partition by result.race_id order by result.finish_time_ms) as finish_rank
    from public.tournament_race_results result
    where result.tournament_id = p_tournament and result.finished
  ),
  race_stats as (
    select result.team_id, count(*)::int as matches_participated,
      count(*) filter (where place.finish_rank = 1)::int as wins,
      count(*) filter (where place.finish_rank <= 3)::int as top_three_finishes
    from public.tournament_race_results result
    left join race_places place
      on place.race_id = result.race_id and place.team_id = result.team_id
    where result.tournament_id = p_tournament
    group by result.team_id
  ),
  lap_stats as (
    select result.team_id, avg(lap.lap_time_ms)::numeric as average_lap_time_ms
    from public.tournament_race_results result
    join public.tournament_race_laps lap
      on lap.race_id = result.race_id and lap.team_id = result.team_id
    where result.tournament_id = p_tournament
    group by result.team_id
  )
  select entry.team_id, entry.team_name, entry.school_name, entry.org_id,
    entry.rank, entry.points, entry.notes, field_size.value,
    coalesce(race_stats.matches_participated, 0),
    coalesce(race_stats.wins, 0),
    coalesce(race_stats.top_three_finishes, 0),
    lap_stats.average_lap_time_ms,
    exists (
      select 1 from public.tournament_team_members member
      where member.team_id = entry.team_id and member.student_id = auth.uid()
    )
  from ranked_entries entry
  cross join field_size
  left join race_stats on race_stats.team_id = entry.team_id
  left join lap_stats on lap_stats.team_id = entry.team_id
  where can_see_tournaments()
  order by entry.rank nulls last, entry.points desc, entry.team_name;
$$;

revoke all on function public.record_tournament_race_result(uuid, text, uuid, integer[], boolean)
  from public, anon;
revoke all on function public.list_tournament_race_results()
  from public, anon;
revoke all on function public.get_student_leaderboard(uuid)
  from public, anon;

grant execute on function public.record_tournament_race_result(uuid, text, uuid, integer[], boolean)
  to authenticated;
grant execute on function public.list_tournament_race_results()
  to authenticated;
grant execute on function public.get_student_leaderboard(uuid)
  to authenticated;
