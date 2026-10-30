-- Scrutineering: a physical car-safety inspection, kept fully separate from
-- payment verification (tournament_teams.status). A team's race eligibility
-- is the AND of both, computed explicitly via team_eligibility() rather than
-- inferred from either flag alone - the gap this migration exists to close.
--
-- Checklist vocabulary reuses the terms already shown to students/staff in
-- the existing client-side inspection checklist (wheels, body, motor,
-- wiring, remote, battery) rather than inventing a new one, plus the
-- additional operational categories (steering, braking, driver/roster
-- compliance, safety equipment) called for by the plan.

create type scrutineering_status as enum ('pending', 'passed', 'failed');
create type scrutineering_item_result as enum ('pass', 'fail', 'not_checked');

create table scrutineering_inspections (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_id uuid not null references tournament_teams(id) on delete cascade,
  status scrutineering_status not null default 'pending',
  notes text check (notes is null or char_length(notes) <= 2000),
  checked_by uuid references profiles(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);
create index on scrutineering_inspections (team_id);

-- Every transition is recorded here so a reinspection, or one staff
-- member's decision overwriting another's, is never silently lost.
create table scrutineering_inspection_history (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references scrutineering_inspections(id) on delete cascade,
  status scrutineering_status not null,
  notes text,
  items jsonb not null default '[]'::jsonb,
  checked_by uuid references profiles(id) on delete set null,
  checked_at timestamptz not null default now()
);
create index on scrutineering_inspection_history (inspection_id);

create table scrutineering_inspection_items (
  inspection_id uuid not null references scrutineering_inspections(id) on delete cascade,
  item_key text not null,
  result scrutineering_item_result not null default 'not_checked',
  note text check (note is null or char_length(note) <= 500),
  primary key (inspection_id, item_key)
);

alter table scrutineering_inspections enable row level security;
alter table scrutineering_inspection_history enable row level security;
alter table scrutineering_inspection_items enable row level security;

-- Direct table access is read-only for staff/manager; every write goes
-- through submit_scrutineering_inspection() below.
drop policy if exists "staff and manager read inspections" on scrutineering_inspections;
create policy "staff and manager read inspections"
  on scrutineering_inspections for select
  using (is_staff_or_manager());

drop policy if exists "staff and manager read inspection history" on scrutineering_inspection_history;
create policy "staff and manager read inspection history"
  on scrutineering_inspection_history for select
  using (is_staff_or_manager());

drop policy if exists "staff and manager read inspection items" on scrutineering_inspection_items;
create policy "staff and manager read inspection items"
  on scrutineering_inspection_items for select
  using (is_staff_or_manager());

create or replace function require_trusted_portal_write() returns boolean as $$
  select current_setting('app.trusted_portal_write', true) = 'true';
$$ language sql stable;

drop policy if exists "only trusted writes touch inspections" on scrutineering_inspections;
create policy "only trusted writes touch inspections"
  on scrutineering_inspections for all
  using (require_trusted_portal_write())
  with check (require_trusted_portal_write());

drop policy if exists "only trusted writes touch inspection history" on scrutineering_inspection_history;
create policy "only trusted writes touch inspection history"
  on scrutineering_inspection_history for all
  using (require_trusted_portal_write())
  with check (require_trusted_portal_write());

drop policy if exists "only trusted writes touch inspection items" on scrutineering_inspection_items;
create policy "only trusted writes touch inspection items"
  on scrutineering_inspection_items for all
  using (require_trusted_portal_write())
  with check (require_trusted_portal_write());

-- The default checklist handed to the client when no inspection exists yet.
create or replace function scrutineering_default_checklist() returns jsonb as $$
  select jsonb_build_array(
    jsonb_build_object('key', 'chassis_bodywork', 'label', 'Chassis & bodywork'),
    jsonb_build_object('key', 'wheels_tyres', 'label', 'Wheels & tyres'),
    jsonb_build_object('key', 'steering', 'label', 'Steering'),
    jsonb_build_object('key', 'brakes', 'label', 'Brakes'),
    jsonb_build_object('key', 'battery', 'label', 'Power / battery safety'),
    jsonb_build_object('key', 'wiring', 'label', 'Electronics / wiring'),
    jsonb_build_object('key', 'roster_compliance', 'label', 'Driver / roster compliance'),
    jsonb_build_object('key', 'safety_equipment', 'label', 'Safety equipment')
  );
$$ language sql immutable;

-- A team's eligibility is the AND of payment verification and scrutineering
-- pass - computed here, read everywhere, never inferred from either flag
-- alone by a caller.
create or replace function team_eligibility(p_team uuid)
returns jsonb as $$
declare
  t tournament_teams;
  v_scrutineering scrutineering_status;
begin
  select * into t from tournament_teams where id = p_team;
  if t.id is null then raise exception 'team not found'; end if;
  select status into v_scrutineering from scrutineering_inspections where team_id = p_team;
  return jsonb_build_object(
    'payment_verified', t.status = 'verified',
    'scrutineering_status', coalesce(v_scrutineering, 'pending'),
    'eligible', t.status = 'verified' and v_scrutineering = 'passed'
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- The single write path for an inspection: locks the team row (eligibility
-- and inspection status belong to the same race entry, same lock as
-- apply_team/decide_team use), then the inspection row if one exists,
-- upserts the checklist atomically, and only notifies on an actual status
-- transition - never on an edit that leaves status unchanged - so editing
-- notes on an already-failed inspection does not resend the failure notice.
create or replace function submit_scrutineering_inspection(
  p_team uuid,
  p_status scrutineering_status,
  p_items jsonb,
  p_notes text default null
)
returns jsonb as $$
declare
  t tournament_teams;
  insp scrutineering_inspections;
  v_prev_status scrutineering_status;
  v_inspection_id uuid;
begin
  if not is_staff_or_manager() then raise exception 'only Hanbee staff may record a scrutineering inspection'; end if;
  if p_status not in ('pending', 'passed', 'failed') then raise exception 'invalid status'; end if;

  select * into t from tournament_teams where id = p_team for update;
  if t.id is null then raise exception 'team not found'; end if;

  select * into insp from scrutineering_inspections where team_id = p_team for update;
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
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item;

  insert into scrutineering_inspection_history (inspection_id, status, notes, items, checked_by)
  values (v_inspection_id, p_status, p_notes, coalesce(p_items, '[]'::jsonb), auth.uid());

  perform set_config('app.trusted_portal_write', '', true);

  perform log_audit('submit_scrutineering_inspection', 'scrutineering_inspection', v_inspection_id,
    jsonb_build_object('team_id', p_team, 'status', p_status, 'previous_status', v_prev_status));

  -- Notify only on an actual transition into failed or passed, never on an
  -- edit that leaves status unchanged.
  if p_status is distinct from v_prev_status then
    if p_status = 'failed' then
      perform create_notification(m.student_id, 'scrutineering_failed', 'Scrutineering: your car did not pass inspection',
        coalesce(p_notes, t.name || ' did not pass the pre-race safety inspection.'), '/dashboard/team')
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

-- What the staff scrutineering screen reads: one row per team with its
-- current inspection state (or 'pending'/no inspection yet).
create or replace function list_scrutineering_queue(p_tournament uuid)
returns table (
  team_id uuid,
  team_name text,
  payment_status team_status,
  scrutineering_status scrutineering_status,
  checked_by_name text,
  checked_at timestamptz,
  notes text
) as $$
  select
    t.id,
    t.name,
    t.status,
    coalesce(i.status, 'pending'::scrutineering_status),
    p.full_name,
    i.checked_at,
    i.notes
  from tournament_teams t
  left join scrutineering_inspections i on i.team_id = t.id
  left join profiles p on p.id = i.checked_by
  where t.tournament_id = p_tournament
    and is_staff_or_manager()
    and t.status not in ('withdrawn', 'rejected', 'draft')
  order by
    case coalesce(i.status, 'pending'::scrutineering_status) when 'pending' then 0 when 'failed' then 1 else 2 end,
    t.name;
$$ language sql stable security definer set search_path = public;

create or replace function get_scrutineering_inspection(p_team uuid)
returns jsonb as $$
declare
  insp scrutineering_inspections;
  v_items jsonb;
begin
  if not is_staff_or_manager() then raise exception 'not allowed'; end if;
  select * into insp from scrutineering_inspections where team_id = p_team;
  if insp.id is null then
    return jsonb_build_object('status', 'pending', 'items', scrutineering_default_checklist(), 'notes', null);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('key', item_key, 'result', result, 'note', note)), '[]'::jsonb)
  into v_items from scrutineering_inspection_items where inspection_id = insp.id;
  return jsonb_build_object(
    'status', insp.status,
    'items', v_items,
    'notes', insp.notes,
    'checked_at', insp.checked_at
  );
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function submit_scrutineering_inspection(uuid, scrutineering_status, jsonb, text) from public, anon;
revoke all on function team_eligibility(uuid) from public, anon;
