-- Two cleanups found in an audit sweep, both around
-- submit_scrutineering_inspection:
--
-- 1. An older 4-arg overload (p_team, p_status, p_items, p_notes) has
--    coexisted alongside the real 5-arg one (which also takes
--    p_expected_updated_at for optimistic locking) ever since the
--    optimistic-locking param was added -- the old signature was never
--    dropped. The frontend (teamFormationApi.ts) always calls with all 5
--    args, so the 4-arg version is dead, unreachable code sitting in the
--    schema. Dropped.
--
-- 2. The 5-arg version selects scrutineering_inspections by team_id, then
--    inserts if no row exists -- not atomic, so two concurrent first-time
--    submissions for the same team could both reach the insert and the
--    loser would hit scrutineering_inspections_tournament_id_team_id_key
--    as a raw, unhandled error. Low-probability (staff-only, same team,
--    same instant) but cheap to close: catch unique_violation and fall
--    back to the update path, since that means another request already
--    created the row a moment ago.

drop function if exists submit_scrutineering_inspection(uuid, scrutineering_status, jsonb, text);

create or replace function submit_scrutineering_inspection(p_team uuid, p_status scrutineering_status, p_items jsonb, p_notes text default null, p_expected_updated_at timestamptz default null)
returns jsonb as $$
declare
  t tournament_teams;
  insp scrutineering_inspections;
  v_prev_status scrutineering_status;
  v_inspection_id uuid;
  v_expected_keys text[];
  v_given_keys text[];
  v_failed_labels text[];
begin
  if not is_staff_or_manager() then raise exception 'only Hanbee staff may record a scrutineering inspection'; end if;
  if p_status not in ('pending', 'passed', 'failed') then raise exception 'invalid status'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'a completed checklist is required';
  end if;

  select array_agg(value->>'key' order by value->>'key') into v_expected_keys
  from jsonb_array_elements(scrutineering_default_checklist());
  select array_agg(distinct item->>'key' order by item->>'key') into v_given_keys
  from jsonb_array_elements(p_items) item;
  if v_given_keys is distinct from v_expected_keys then
    raise exception 'the checklist must cover exactly the approved checklist items';
  end if;

  if p_status = 'passed' and exists (
    select 1 from jsonb_array_elements(p_items) item where item->>'result' <> 'pass'
  ) then
    raise exception 'every checklist item must pass before the car can be marked passed';
  end if;

  select * into t from tournament_teams where id = p_team for update;
  if t.id is null then raise exception 'team not found'; end if;

  select * into insp from scrutineering_inspections where team_id = p_team for update;
  if insp.id is not null and p_expected_updated_at is not null and insp.updated_at is distinct from p_expected_updated_at then
    raise exception 'This inspection changed since you opened it; reload before saving.';
  end if;
  v_prev_status := insp.status;

  perform set_config('app.trusted_portal_write', 'true', true);

  if insp.id is null then
    begin
      insert into scrutineering_inspections (tournament_id, team_id, status, notes, checked_by, checked_at)
      values (t.tournament_id, p_team, p_status, p_notes, auth.uid(), now())
      returning id into v_inspection_id;
    exception when unique_violation then
      -- Another concurrent first-time submission for this team just beat
      -- us to it -- fall back to updating that row instead of a raw crash.
      select id into v_inspection_id from scrutineering_inspections where team_id = p_team;
      update scrutineering_inspections
      set status = p_status, notes = p_notes, checked_by = auth.uid(), checked_at = now(), updated_at = now()
      where id = v_inspection_id;
    end;
  else
    v_inspection_id := insp.id;
    update scrutineering_inspections
    set status = p_status, notes = p_notes, checked_by = auth.uid(), checked_at = now(), updated_at = now()
    where id = v_inspection_id;
  end if;

  delete from scrutineering_inspection_items where inspection_id = v_inspection_id;
  insert into scrutineering_inspection_items (inspection_id, item_key, result, note)
  select v_inspection_id, (item->>'key'), (item->>'result')::scrutineering_item_result, item->>'note'
  from jsonb_array_elements(p_items) as item;

  insert into scrutineering_inspection_history (inspection_id, status, notes, items, checked_by)
  values (v_inspection_id, p_status, p_notes, p_items, auth.uid());

  perform set_config('app.trusted_portal_write', '', true);

  perform log_audit('submit_scrutineering_inspection', 'scrutineering_inspection', v_inspection_id,
    jsonb_build_object('team_id', p_team, 'status', p_status, 'previous_status', v_prev_status));

  -- Notify only on an actual transition, never on an edit that leaves status
  -- unchanged, and tell the team which items failed, not just the free note.
  if p_status is distinct from v_prev_status then
    if p_status = 'failed' then
      select array_agg(coalesce(def->>'label', item->>'key') order by def->>'label')
      into v_failed_labels
      from jsonb_array_elements(p_items) item
      left join jsonb_array_elements(scrutineering_default_checklist()) def
        on def->>'key' = item->>'key'
      where item->>'result' = 'fail';

      perform create_notification(m.student_id, 'scrutineering_failed', 'Scrutineering: your car did not pass inspection',
        case when v_failed_labels is not null and array_length(v_failed_labels, 1) > 0
          then 'Failed: ' || array_to_string(v_failed_labels, ', ') || coalesce(' — ' || nullif(trim(p_notes), ''), '')
          else coalesce(p_notes, t.name || ' did not pass the pre-race safety inspection.')
        end,
        '/dashboard/team')
      from tournament_team_members m where m.team_id = p_team;
    elsif p_status = 'passed' then
      perform create_notification(m.student_id, 'scrutineering_passed', 'Scrutineering: your car passed inspection',
        t.name || ' passed the pre-race safety inspection.', '/dashboard/team')
      from tournament_team_members m where m.team_id = p_team;
    end if;
  end if;

  return team_eligibility(p_team);
end;
$$ language plpgsql security definer set search_path = public;
