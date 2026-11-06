-- Remove the pre-entry-fee overloads. Their coexistence with the newer
-- defaulted entry-fee arguments makes calls without an explicit fee ambiguous.
drop function if exists public.create_tournament(text, text, timestamptz, timestamptz, text);
drop function if exists public.update_tournament(uuid, text, text, timestamptz, timestamptz, text, tournament_status);

-- The current functions remain callable by signed-in users; each function
-- enforces its own manager/Hanbee staff authorization.
revoke all on function public.create_tournament(text, text, timestamptz, timestamptz, text, numeric)
  from public, anon;
revoke all on function public.update_tournament(uuid, text, text, timestamptz, timestamptz, text, tournament_status, numeric)
  from public, anon;
grant execute on function public.create_tournament(text, text, timestamptz, timestamptz, text, numeric)
  to authenticated;
grant execute on function public.update_tournament(uuid, text, text, timestamptz, timestamptz, text, tournament_status, numeric)
  to authenticated;

select pg_notify('pgrst', 'reload schema');
