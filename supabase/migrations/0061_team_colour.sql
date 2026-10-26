-- Team colour chosen in the team start wizard. Stored as a hex colour so the
-- same value can be shown on the team card and the leaderboard. Optional, so
-- existing teams keep working.

alter table tournament_teams add column if not exists color text;

do $$ begin
  alter table tournament_teams add constraint tournament_teams_color_hex
    check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
exception when duplicate_object then null; end $$;
