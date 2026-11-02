-- This migration originally shipped an alternate pool-team design
-- (a `participation_type` enum/column, a `students` table, `team_requests`
-- table, and 8 function redefinitions using `_id`-suffixed parameter names
-- like `p_tournament_id` instead of the established `p_tournament`). That
-- design was abandoned in favor of the org_id-is-null approach actually
-- shipped in 0066/0093/0094 (is_solo_student(), tournament_teams.org_id),
-- and never took effect on the live database: the `participation_type`
-- type/column and the `students`/`team_requests` tables were never
-- created there, and the function redefinitions failed outright on a
-- fresh replay with "cannot change name of input parameter" (Postgres
-- forbids renaming a parameter via CREATE OR REPLACE) the moment they hit
-- create_solo_team/invite_to_team/respond_team_invitation/leave_team,
-- which already existed under their real names. It had been silently
-- broken for any clean migration replay (e.g. CI) ever since, even though
-- `supabase db push` against the already-provisioned staging project
-- never re-ran it and so never surfaced the failure.
--
-- The one part of this migration that WAS real and IS still live is the
-- team_size tightening below -- kept as-is.

-- Ensure tournament team size is between 2 and 5 for pool/school teams
update tournaments
set team_size = 5
where team_size > 5;

alter table tournaments
  drop constraint if exists tournaments_team_size_check,
  add constraint tournaments_team_size_check check (team_size between 2 and 5);

comment on column tournaments.team_size is
  'Maximum number of members in a team for this tournament (2-5); teams may apply with fewer members.';
