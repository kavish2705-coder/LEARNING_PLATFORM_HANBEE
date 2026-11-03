-- Keep the already-applied 0102 migration immutable while adding the audit
-- event for independent team creation.
create or replace function public.start_pool_team(p_tournament uuid, p_name text)
returns uuid as $$
declare v_id uuid;
begin
  if not is_solo_student() or not is_active_account() then raise exception 'only an independent student can start a pool team'; end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then raise exception 'this tournament is not open for teams'; end if;
  if student_has_active_team(p_tournament, auth.uid()) then raise exception 'you are already in a team for this tournament'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(p_name)) > 40 then raise exception 'give the team a name of up to 40 characters'; end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    perform set_config('app.pool_team_write', 'true', true);
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, null, trim(p_name), auth.uid(), auth.uid()) returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
    perform set_config('app.pool_team_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    perform set_config('app.pool_team_write', '', true);
    raise exception 'a team with this name already exists in this tournament';
  end;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), null);
  perform log_audit('start_pool_team', 'tournament_team', v_id, jsonb_build_object('tournament_id', p_tournament));
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.start_pool_team(uuid, text) from public, anon;
grant execute on function public.start_pool_team(uuid, text) to authenticated;
