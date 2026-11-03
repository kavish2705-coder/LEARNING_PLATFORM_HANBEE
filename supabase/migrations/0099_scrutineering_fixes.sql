-- Fixes to 0098_scrutineering.sql found by code review, verified against the
-- live schema before being accepted:
--
-- 1. submit_scrutineering_inspection() and team_eligibility() were revoked
--    from public/anon but never re-granted to authenticated, so every client
--    call to them was failing with a permission error (the codebase's own
--    convention, e.g. 0039_team_formation.sql:551-560, always pairs a revoke
--    with a grant to authenticated -- this migration only did the former).
-- 2. The RPC accepted a "passed" status even when individual checklist items
--    were marked failed, and did not validate the item set at all.
-- 3. team_eligibility() had no access check -- any authenticated caller could
--    query any team's eligibility by id.
-- 4. No optimistic-concurrency check -- two staff opening the same stale
--    inspection could silently overwrite each other's decision.
-- 5. Failure notifications only carried the free-text note, not which items
--    failed.
--
-- Also adds get_scrutineering_history() (inspection history was recorded but
-- never exposed to the UI) and widens list_scrutineering_queue() with
-- school/captain name and a derived eligible column.

create or replace function submit_scrutineering_inspection(
  p_team uuid,
  p_status scrutineering_status,
  p_items jsonb,
  p_notes text default null,
  p_expected_updated_at timestamptz default null
)
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
    insert into scrutineering_inspections (tournament_id, team_id, status, notes, checked_by, checked_at)
    values (t.tournament_id, p_team, p_status, p_notes, auth.uid(), now())
    returning id into v_inspection_id;
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

-- staff/manager: any team. student: only a team they're on. everyone else: rejected.
create or replace function team_eligibility(p_team uuid)
returns jsonb as $$
declare
  t tournament_teams;
  v_scrutineering scrutineering_status;
begin
  select * into t from tournament_teams where id = p_team;
  if t.id is null then raise exception 'team not found'; end if;
  if not (
    is_staff_or_manager()
    or exists (select 1 from tournament_team_members m where m.team_id = p_team and m.student_id = auth.uid())
  ) then
    raise exception 'not allowed';
  end if;
  select status into v_scrutineering from scrutineering_inspections where team_id = p_team;
  return jsonb_build_object(
    'payment_verified', t.status = 'verified',
    'scrutineering_status', coalesce(v_scrutineering, 'pending'),
    'eligible', t.status = 'verified' and v_scrutineering = 'passed'
  );
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function get_scrutineering_inspection(p_team uuid)
returns jsonb as $$
declare
  insp scrutineering_inspections;
  v_items jsonb;
begin
  if not is_staff_or_manager() then raise exception 'not allowed'; end if;
  select * into insp from scrutineering_inspections where team_id = p_team;
  if insp.id is null then
    return jsonb_build_object('status', 'pending', 'items', scrutineering_default_checklist(), 'notes', null, 'updated_at', null);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('key', item_key, 'result', result, 'note', note)), '[]'::jsonb)
  into v_items from scrutineering_inspection_items where inspection_id = insp.id;
  return jsonb_build_object(
    'status', insp.status,
    'items', v_items,
    'notes', insp.notes,
    'checked_at', insp.checked_at,
    'updated_at', insp.updated_at
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- Previously recorded but never exposed: who failed the car, what changed on
-- reinspection, when it passed.
create or replace function get_scrutineering_history(p_team uuid)
returns table (
  status scrutineering_status,
  notes text,
  items jsonb,
  checked_by_name text,
  checked_at timestamptz
) as $$
  select h.status, h.notes, h.items, p.full_name, h.checked_at
  from scrutineering_inspection_history h
  join scrutineering_inspections i on i.id = h.inspection_id
  left join profiles p on p.id = h.checked_by
  where i.team_id = p_team and is_staff_or_manager()
  order by h.checked_at desc;
$$ language sql stable security definer set search_path = public;

-- Adds school/captain so search can cover more than the team name, and an
-- explicit derived eligible column (payment + scrutineering collapsed into
-- one state the queue previously made staff compute by eye). The column set
-- changed, so the old signature has to be dropped before being recreated.
drop function if exists list_scrutineering_queue(uuid);

create function list_scrutineering_queue(p_tournament uuid)
returns table (
  team_id uuid,
  team_name text,
  school_name text,
  captain_name text,
  payment_status team_status,
  scrutineering_status scrutineering_status,
  eligible boolean,
  checked_by_name text,
  checked_at timestamptz,
  notes text
) as $$
  select
    t.id,
    t.name,
    o.name,
    cap.full_name,
    t.status,
    coalesce(i.status, 'pending'::scrutineering_status),
    (t.status = 'verified' and coalesce(i.status, 'pending'::scrutineering_status) = 'passed'),
    checker.full_name,
    i.checked_at,
    i.notes
  from tournament_teams t
  left join organizations o on o.id = t.org_id
  left join profiles cap on cap.id = t.created_by
  left join scrutineering_inspections i on i.team_id = t.id
  left join profiles checker on checker.id = i.checked_by
  where t.tournament_id = p_tournament
    and is_staff_or_manager()
    and t.status not in ('withdrawn', 'rejected', 'draft')
  order by
    case coalesce(i.status, 'pending'::scrutineering_status) when 'pending' then 0 when 'failed' then 1 else 2 end,
    t.name;
$$ language sql stable security definer set search_path = public;

revoke all on function submit_scrutineering_inspection(uuid, scrutineering_status, jsonb, text, timestamptz) from public, anon;
grant execute on function submit_scrutineering_inspection(uuid, scrutineering_status, jsonb, text, timestamptz) to authenticated;

revoke all on function team_eligibility(uuid) from public, anon;
grant execute on function team_eligibility(uuid) to authenticated;

revoke all on function get_scrutineering_inspection(uuid) from public, anon;
grant execute on function get_scrutineering_inspection(uuid) to authenticated;

revoke all on function get_scrutineering_history(uuid) from public, anon;
grant execute on function get_scrutineering_history(uuid) to authenticated;

revoke all on function list_scrutineering_queue(uuid) from public, anon;
grant execute on function list_scrutineering_queue(uuid) to authenticated;
