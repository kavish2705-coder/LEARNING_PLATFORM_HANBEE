-- Course / RC Tournament access gating for independent students.
--
-- Previously every student could see both the course dashboard and the RC
-- Tournament dashboard unconditionally. Going forward, an independent
-- student picks one track at signup; the other is locked behind a staff
-- verification + payment pipeline, reachable from a blocker screen on the
-- locked dashboard's route. Org/school-joined students are untouched --
-- they keep automatic RC Tournament access and never see any of this.
--
-- Two independent flags per student (not one plan enum) because access can
-- grow in either direction after signup:
--   add_course:     RC-only student requests Course access. Goes through a
--                    one-shot qualifying quiz (score hidden from the
--                    student -- it's input for staff, not a price), then
--                    staff must confirm with BOTH the parent and the
--                    student by phone before they can type in a price.
--                    No fixed tiers -- staff decides the number case by
--                    case once both confirmations are checked.
--   add_tournament:  Course-only student requests RC Tournament access.
--                    No quiz, no parent/student confirmation gate -- Hanbee
--                    staff already verify these students the same way they
--                    verify any new RC entrant, and entry fees are fixed,
--                    so this is a plain staff approve/reject, after which
--                    the student just goes through the existing license +
--                    per-tournament payment flows unchanged.
--
-- Existing students are grandfathered into full access on both flags --
-- this restriction is new, so no one already using the platform should
-- lose anything they already had. Only students created after this
-- migration default to 'none' and go through the new signup plan choice.

create type access_stage as enum ('none', 'requested', 'awaiting_payment', 'active');

alter table profiles add column if not exists tournament_access access_stage not null default 'none';
alter table profiles add column if not exists course_access access_stage not null default 'none';

update profiles set tournament_access = 'active', course_access = 'active' where role = 'student';

create function student_has_tournament_access() returns boolean as $$
  select coalesce((select tournament_access = 'active' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

create function student_has_course_access() returns boolean as $$
  select coalesce((select course_access = 'active' from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- access_requests: one row per (student, direction). Clicking "Interested"
-- repeatedly, or re-requesting after staff rejects it informally, reuses
-- the same row rather than piling up duplicates in the staff queue -- same
-- idempotent shape as upi_payments' own createPayment semantics.
-- ---------------------------------------------------------------------------

create type access_request_direction as enum ('add_course', 'add_tournament');
create type access_request_status as enum ('requested', 'awaiting_payment', 'active');

create table access_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  direction access_request_direction not null,
  status access_request_status not null default 'requested',
  quiz_score numeric,
  quiz_total numeric,
  parent_confirmed boolean not null default false,
  student_confirmed boolean not null default false,
  staff_set_amount numeric(10,2),
  handled_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (student_id, direction)
);

alter table access_requests enable row level security;

create policy "a student reads their own access requests; staff/manager read all"
  on access_requests for select using (student_id = auth.uid() or is_staff_or_manager());

-- ---------------------------------------------------------------------------
-- quiz_attempts: one-shot qualifying quiz for the add_course direction.
-- Unique on student_id enforces a single attempt at the database level --
-- a genuine double-submit (flaky connection, double click) just gets a
-- clear "already completed" error; no self-service retry. If a real
-- support case needs one cleared, that's a manual staff action, not a UI.
-- ---------------------------------------------------------------------------

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references profiles(id) on delete cascade,
  score numeric not null,
  total numeric not null,
  attempted_at timestamptz not null default now()
);

alter table quiz_attempts enable row level security;

create policy "a student reads their own quiz attempt; staff/manager read all"
  on quiz_attempts for select using (student_id = auth.uid() or is_staff_or_manager());

-- ---------------------------------------------------------------------------
-- Student-facing RPCs
-- ---------------------------------------------------------------------------

-- Clicking "Interested" on either blocker screen. "Not Interested" is just
-- the absence of this call -- the flag stays 'none' and the same two
-- buttons show again next visit, no row is ever written for a decline.
create or replace function request_access(p_direction access_request_direction)
returns access_requests as $$
declare v_row access_requests;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an independent student can request this';
  end if;

  if p_direction = 'add_course' then
    if (select course_access from profiles where id = auth.uid()) <> 'none' then
      raise exception 'you already have or have requested course access';
    end if;
    update profiles set course_access = 'requested' where id = auth.uid();
  else
    if (select tournament_access from profiles where id = auth.uid()) <> 'none' then
      raise exception 'you already have or have requested RC Tournament access';
    end if;
    update profiles set tournament_access = 'requested' where id = auth.uid();
  end if;

  insert into access_requests (student_id, direction, status)
  values (auth.uid(), p_direction, 'requested')
  on conflict (student_id, direction) do update set status = 'requested', decided_at = null
  returning * into v_row;

  perform log_audit('request_access', 'access_request', v_row.id, jsonb_build_object('direction', p_direction));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- The one-shot qualifying quiz, only reachable after an add_course request
-- is live. Score is stored for staff, never returned to the student by any
-- function here -- the frontend result screen must not read it back.
create or replace function submit_quiz_attempt(p_score numeric, p_total numeric)
returns void as $$
declare v_req access_requests;
begin
  if not is_solo_student() or not is_active_account() then raise exception 'not allowed'; end if;
  if p_total is null or p_total <= 0 or p_score is null or p_score < 0 or p_score > p_total then
    raise exception 'invalid quiz score';
  end if;

  select * into v_req from access_requests where student_id = auth.uid() and direction = 'add_course' for update;
  if v_req.id is null or v_req.status <> 'requested' then
    raise exception 'no course access request is waiting on a quiz';
  end if;

  insert into quiz_attempts (student_id, score, total) values (auth.uid(), p_score, p_total);
  update access_requests set quiz_score = p_score, quiz_total = p_total where id = v_req.id;
  perform log_audit('submit_quiz_attempt', 'access_request', v_req.id, jsonb_build_object('total', p_total));
exception when unique_violation then
  raise exception 'you have already completed this quiz -- contact Hanbee staff if this looks wrong';
end;
$$ language plpgsql security definer set search_path = public;

create or replace function my_access_request(p_direction access_request_direction)
returns access_requests as $$
  select * from access_requests where student_id = auth.uid() and direction = p_direction;
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Staff/manager RPCs
-- ---------------------------------------------------------------------------

create or replace function access_requests_queue()
returns table(
  id uuid, student_id uuid, student_name text, phone text, direction access_request_direction,
  quiz_score numeric, quiz_total numeric, parent_confirmed boolean, student_confirmed boolean,
  staff_set_amount numeric, created_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can review access requests';
  end if;
  return query
    select r.id, r.student_id, p.full_name, p.phone, r.direction, r.quiz_score, r.quiz_total,
           r.parent_confirmed, r.student_confirmed, r.staff_set_amount, r.created_at
    from access_requests r
    join profiles p on p.id = r.student_id
    where r.status = 'requested'
    order by r.created_at;
end;
$$;

-- add_tournament: plain approve, no amount, no confirmation gate -- these
-- students are verified the same way any new RC entrant already is, and
-- fees are fixed, so there's nothing case-by-case to decide here.
create or replace function approve_tournament_access(p_request uuid)
returns void as $$
declare r access_requests;
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can approve this';
  end if;
  select * into r from access_requests where id = p_request for update;
  if r.id is null or r.direction <> 'add_tournament' or r.status <> 'requested' then
    raise exception 'this request is not waiting on tournament-access approval';
  end if;

  update access_requests set status = 'active', handled_by = auth.uid(), decided_at = now() where id = r.id;
  update profiles set tournament_access = 'active' where id = r.student_id;
  perform log_audit('approve_tournament_access', 'access_request', r.id, '{}'::jsonb);
  perform create_notification(r.student_id, 'tournament_access_active', 'You now have RC Tournament access', '', '/dashboard/team');
end;
$$ language plpgsql security definer set search_path = public;

-- add_course: staff check these two boxes only after actually calling the
-- parent and the student -- the amount field below refuses to work until
-- both are true, so this can't be skipped by habit.
create or replace function set_course_access_confirmation(p_request uuid, p_parent_confirmed boolean, p_student_confirmed boolean)
returns void as $$
declare r access_requests;
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can do this';
  end if;
  select * into r from access_requests where id = p_request for update;
  if r.id is null or r.direction <> 'add_course' or r.status <> 'requested' then
    raise exception 'this request is not waiting on confirmation';
  end if;

  update access_requests set
    parent_confirmed = coalesce(p_parent_confirmed, parent_confirmed),
    student_confirmed = coalesce(p_student_confirmed, student_confirmed),
    handled_by = auth.uid()
  where id = r.id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function set_course_access_amount(p_request uuid, p_amount numeric)
returns void as $$
declare r access_requests;
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can do this';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'enter a valid amount'; end if;

  select * into r from access_requests where id = p_request for update;
  if r.id is null or r.direction <> 'add_course' or r.status <> 'requested' then
    raise exception 'this request is not waiting on an amount';
  end if;
  if not (r.parent_confirmed and r.student_confirmed) then
    raise exception 'confirm with both the parent and the student before setting an amount';
  end if;

  update access_requests set staff_set_amount = p_amount, status = 'awaiting_payment', handled_by = auth.uid() where id = r.id;
  update profiles set course_access = 'awaiting_payment' where id = r.student_id;
  perform log_audit('set_course_access_amount', 'access_request', r.id, jsonb_build_object('amount', p_amount));
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Gate the three "start your own tournament entry" RPCs on tournament
-- access, same place and same style as 0121's driver-license gate (full
-- bodies carried forward unchanged except for the new check).
-- ---------------------------------------------------------------------------

create or replace function create_solo_team(p_tournament uuid)
returns uuid as $$
declare
  v_id uuid;
  v_name text;
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an active solo student may enter as a team of one';
  end if;
  if not student_has_tournament_access() then
    raise exception 'get Hanbee to activate your RC Tournament access first';
  end if;
  if not student_has_active_license() then
    raise exception 'purchase your Driver License before entering a tournament';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for entries';
  end if;
  if exists (
    select 1 from tournament_team_members m
    join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = auth.uid()
      and t.status not in ('withdrawn', 'rejected')
  ) then
    raise exception 'you already have an entry for this tournament';
  end if;

  delete from tournament_team_members m
  using tournament_teams t
  where m.team_id = t.id
    and m.tournament_id = p_tournament
    and m.student_id = auth.uid()
    and t.status in ('withdrawn', 'rejected');

  select left(coalesce(nullif(trim(full_name), ''), 'Solo student'), 60)
    into v_name from profiles where id = auth.uid();

  perform set_config('app.trusted_portal_write', 'true', true);
  begin
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, null, v_name, auth.uid(), auth.uid())
    returning id into v_id;
  exception when unique_violation then
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, null, left(v_name, 52) || ' (' || left(auth.uid()::text, 4) || ')', auth.uid(), auth.uid())
    returning id into v_id;
  end;
  perform set_config('app.trusted_portal_write', '', true);

  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), null);
  perform log_audit('create_solo_tournament_entry', 'tournament_team', v_id, '{}'::jsonb);
  return v_id;
exception when others then
  perform set_config('app.trusted_portal_write', '', true);
  raise;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.start_pool_team(p_tournament uuid, p_name text)
returns uuid as $$
declare v_id uuid;
begin
  if not is_solo_student() or not is_active_account() then raise exception 'only an independent student can start a pool team'; end if;
  if not student_has_tournament_access() then raise exception 'get Hanbee to activate your RC Tournament access first'; end if;
  if not student_has_active_license() then raise exception 'purchase your Driver License before entering a tournament'; end if;
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

create or replace function student_start_team(p_tournament uuid, p_name text)
returns uuid as $$
declare
  v_org uuid := my_org_id();
  v_id uuid;
begin
  if my_role() is distinct from 'student' or v_org is null or not is_active_account() then
    raise exception 'only a student of an active school can start a team';
  end if;
  if not student_has_tournament_access() then
    raise exception 'get Hanbee to activate your RC Tournament access first';
  end if;
  if not student_has_active_license() then
    raise exception 'purchase your Driver License before entering a tournament';
  end if;
  if not exists (select 1 from tournaments where id = p_tournament and status = 'upcoming') then
    raise exception 'this tournament is not open for teams';
  end if;
  if not exists (select 1 from school_team_slots where tournament_id = p_tournament and org_id = v_org) then
    raise exception 'your school staff have not opened team slots yet';
  end if;
  if exists (
    select 1 from tournament_team_members m join tournament_teams t on t.id = m.team_id
    where m.tournament_id = p_tournament and m.student_id = auth.uid() and t.status not in ('withdrawn', 'rejected')
  ) then raise exception 'you are already in a team for this tournament'; end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(p_name)) > 40 then
    raise exception 'give the team a name of up to 40 characters';
  end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    insert into tournament_teams (tournament_id, org_id, name, created_by, captain_id)
    values (p_tournament, v_org, trim(p_name), auth.uid(), auth.uid()) returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    raise exception 'a team with this name already exists in this tournament';
  end;
  insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
  values (v_id, p_tournament, auth.uid(), v_org);
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function
  student_has_tournament_access(), student_has_course_access(),
  request_access(access_request_direction), submit_quiz_attempt(numeric, numeric),
  my_access_request(access_request_direction), access_requests_queue(),
  approve_tournament_access(uuid), set_course_access_confirmation(uuid, boolean, boolean),
  set_course_access_amount(uuid, numeric)
  from public, anon;
grant execute on function
  student_has_tournament_access(), student_has_course_access(),
  request_access(access_request_direction), submit_quiz_attempt(numeric, numeric),
  my_access_request(access_request_direction), access_requests_queue(),
  approve_tournament_access(uuid), set_course_access_confirmation(uuid, boolean, boolean),
  set_course_access_amount(uuid, numeric)
  to authenticated;
