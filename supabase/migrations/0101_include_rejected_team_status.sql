-- Rejected teams remain visible to their own students so the payment review
-- note can be explained on the team page. Withdrawn teams remain hidden.

create or replace function public.get_my_team_registration_status(p_tournament uuid)
returns jsonb as $$
declare
  t public.tournament_teams;
  tr public.tournaments;
  insp public.scrutineering_inspections;
  v_items jsonb;
  v_history jsonb;
  v_race_results jsonb;
  v_result jsonb;
begin
  if auth.uid() is null or my_role() is distinct from 'student' or not is_active_account() then
    raise exception 'not allowed';
  end if;

  select * into tr from public.tournaments where id = p_tournament;
  if tr.id is null then raise exception 'tournament not found'; end if;

  select team.* into t
  from public.tournament_teams team
  join public.tournament_team_members member on member.team_id = team.id
  where member.tournament_id = p_tournament
    and member.student_id = auth.uid()
    and team.status <> 'withdrawn'
  order by team.created_at desc
  limit 1;

  if t.id is null then
    return jsonb_build_object(
      'tournament', jsonb_build_object('id', tr.id, 'title', tr.title, 'status', tr.status),
      'team', null,
      'scrutineering', null,
      'eligible', false,
      'result', null,
      'race_results', '[]'::jsonb
    );
  end if;

  select * into insp
  from public.scrutineering_inspections
  where team_id = t.id;

  if insp.id is null then
    v_items := '[]'::jsonb;
    v_history := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', item.item_key,
      'result', item.result,
      'note', item.note
    ) order by item.item_key), '[]'::jsonb)
    into v_items
    from public.scrutineering_inspection_items item
    where item.inspection_id = insp.id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'status', history.status,
      'notes', history.notes,
      'items', history.items,
      'checked_at', history.checked_at
    ) order by history.checked_at desc), '[]'::jsonb)
    into v_history
    from public.scrutineering_inspection_history history
    where history.inspection_id = insp.id;
  end if;

  select jsonb_build_object('rank', result.rank, 'points', result.points, 'notes', result.notes)
  into v_result
  from public.tournament_results result
  where result.tournament_id = t.tournament_id and result.team_id = t.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'race_name', race.name,
    'finished', race_result.finished,
    'finish_time_ms', race_result.finish_time_ms,
    'lap_count', (select count(*)::int from public.tournament_race_laps lap where lap.race_id = race.id and lap.team_id = t.id),
    'average_lap_time_ms', (select avg(lap.lap_time_ms)::numeric from public.tournament_race_laps lap where lap.race_id = race.id and lap.team_id = t.id)
  ) order by race.created_at desc, race.name), '[]'::jsonb)
  into v_race_results
  from public.tournament_race_results race_result
  join public.tournament_races race on race.id = race_result.race_id
  where race_result.tournament_id = t.tournament_id and race_result.team_id = t.id;

  return jsonb_build_object(
    'tournament', jsonb_build_object('id', tr.id, 'title', tr.title, 'status', tr.status),
    'team', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'status', t.status,
      'payment_verified', t.status = 'verified',
      'review_note', t.review_note,
      'decided_at', t.decided_at
    ),
    'scrutineering', case when insp.id is null then jsonb_build_object(
      'status', 'pending', 'notes', null, 'checked_at', null, 'items', v_items, 'history', v_history
    ) else jsonb_build_object(
      'status', insp.status, 'notes', insp.notes, 'checked_at', insp.checked_at, 'items', v_items, 'history', v_history
    ) end,
    'eligible', t.status = 'verified' and insp.status = 'passed',
    'result', coalesce(v_result, 'null'::jsonb),
    'race_results', v_race_results
  );
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function public.get_my_team_registration_status(uuid) from public, anon;
grant execute on function public.get_my_team_registration_status(uuid) to authenticated;
