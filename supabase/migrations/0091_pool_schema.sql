-- Independent student pool: foundational schema.
--
-- Independent ("road-kid") students have no school affiliation. Later tasks
-- let them discover each other and ask to join a team. This task only lays
-- the schema down:
--  * team_join_requests mirrors team_invitations's shape and guarantees
--    (one pending request per team/student, RLS enabled, no client writes --
--    every change goes through a SECURITY DEFINER function added by a later
--    task).
--  * student_has_active_team() is the one shared "is this student already
--    committed to a team in this tournament" check. Every pool function
--    added later calls this instead of duplicating the
--    tournament_team_members/tournament_teams join.

create type team_join_request_status as enum ('pending', 'accepted', 'declined', 'cancelled', 'expired');

create table team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references tournament_teams(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status team_join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create unique index team_join_requests_one_pending on team_join_requests (team_id, student_id) where status = 'pending';
create index on team_join_requests (student_id, status);

alter table team_join_requests enable row level security;
create policy "a join request is visible to the requesting student and to the team's people"
  on team_join_requests for select
  using (is_active_account() and (student_id = auth.uid() or team_visible_to_me(team_id)));

revoke insert, update, delete, truncate on team_join_requests from anon, authenticated;

-- Shared helper: does this student already have a non-withdrawn, non-rejected
-- team in this tournament? Every pool function should call this instead of
-- re-deriving the same tournament_team_members/tournament_teams join.
create or replace function student_has_active_team(p_tournament uuid, p_student uuid) returns boolean as $$
  select exists (
    select 1 from tournament_team_members m
    join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = p_student
      and t.status not in ('withdrawn', 'rejected')
  );
$$ language sql stable security definer set search_path = public;

revoke all on function student_has_active_team(uuid, uuid) from public, anon;
grant execute on function student_has_active_team(uuid, uuid) to authenticated;
