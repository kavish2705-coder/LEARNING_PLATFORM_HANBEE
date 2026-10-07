-- The signed-in student's team rank and points in the most recent tournament
-- that has results. Returns no row if the student has no team with a result.

create or replace function my_leaderboard_rank()
returns table (tournament_id uuid, tournament_title text, team_name text, rank int, points int, field_size int)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select t.id, t.title
    from tournaments t
    where exists (select 1 from tournament_results r where r.tournament_id = t.id)
    order by t.starts_at desc
    limit 1
  ),
  mine as (
    select r.tournament_id, r.team_id, r.rank, r.points, tt.name
    from tournament_results r
    join tournament_teams tt on tt.id = r.team_id
    join tournament_team_members m on m.team_id = r.team_id and m.student_id = auth.uid()
    join latest l on l.id = r.tournament_id
  )
  select l.id, l.title, mine.name, mine.rank, mine.points,
    (select count(*)::int from tournament_results r2 where r2.tournament_id = l.id)
  from latest l
  join mine on mine.tournament_id = l.id
  where auth.uid() is not null;
$$;

revoke all on function my_leaderboard_rank() from public, anon;
grant execute on function my_leaderboard_rank() to authenticated;
