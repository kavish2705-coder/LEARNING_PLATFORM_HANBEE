-- A rejected or withdrawn team/solo entry kept blocking a student from
-- re-applying under the same name: tournament_teams(tournament_id, name) was
-- a plain unique constraint, so create_solo_team's re-entry (0041) hit
-- "duplicate key value violates unique constraint" for any rejected row with
-- the same name (e.g. the student's own full name). Replace it with a
-- partial unique index that only applies to live entries, so a rejected or
-- withdrawn row no longer reserves the name.

alter table tournament_teams drop constraint tournament_teams_tournament_id_name_key;

create unique index tournament_teams_tournament_id_name_key
  on tournament_teams (tournament_id, name)
  where status not in ('rejected', 'withdrawn');
