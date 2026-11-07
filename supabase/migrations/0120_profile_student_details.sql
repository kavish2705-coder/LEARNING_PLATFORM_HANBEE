-- Migration 0120: Student Driver Details (Age & License fields)
-- Safely add age to profiles table if it doesn't already exist.

alter table profiles add column if not exists age integer;
comment on column profiles.age is 'Student driver age for racing license and tournament registration';

-- Add check constraint for age range (between 4 and 100 or null) safely
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_age_range'
  ) then
    alter table profiles add constraint profiles_age_range check (age is null or (age >= 4 and age <= 100));
  end if;
end $$;

-- Clean up obsolete tournament overloads from 0119 so 5-arg create_tournament
-- and 7-arg update_tournament calls resolve unambiguously
drop function if exists create_tournament(text, text, timestamptz, timestamptz, text);
drop function if exists update_tournament(uuid, text, text, timestamptz, timestamptz, text, tournament_status);

