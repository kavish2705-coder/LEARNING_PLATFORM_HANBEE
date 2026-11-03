-- Driver License payment gate. A student must pay for and have an active
-- Driver License before entering a tournament -- previously the License
-- page (frontend/src/app/dashboard/license/page.tsx) was purely
-- decorative, free to everyone, with no purchase step at all.
--
-- Follows the exact pattern already established for tournament entry
-- fees and course applications (0110_payment_qr_and_reference.sql): the
-- same global QR/UPI account in payment_settings, a payment_declared +
-- payment_reference pair, a staff review queue, verify/reject via a
-- single decide-style RPC.
--
-- Pricing is a placeholder for now -- both fees default to ₹1 for
-- testing. PENDING: revert license_fee_amount to 199 and
-- plan_3mo_fee_amount to 6999 before going live (see payment_settings
-- column comments below). The ₹6999/3-month plan has no feature behind
-- it yet -- its price exists so the field is ready, but nothing is
-- built against it until real requirements for what it unlocks arrive.
--
-- Enforcement scope: this round gates the three "start your own entry"
-- RPCs (create_solo_team, start_pool_team, student_start_team) -- the
-- paths that cover a student creating their own tournament entry.
-- PENDING: a student who only *joins* an existing team (accepting an
-- invite via respond_team_invitation, or a captain approving their join
-- request via respond_join_request) is not yet gated here -- same
-- license requirement, not yet enforced on those paths.

create type license_status as enum ('unpaid', 'payment_declared', 'active', 'rejected');

create table driver_licenses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references profiles(id) on delete cascade,
  status license_status not null default 'unpaid',
  amount numeric(10,2),
  payment_declared boolean not null default false,
  payment_reference text,
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payment_settings add column if not exists license_fee_amount numeric(10,2) not null default 1;
alter table payment_settings add column if not exists plan_3mo_fee_amount numeric(10,2) not null default 1;
comment on column payment_settings.license_fee_amount is
  'PENDING: test price is 1 (real price 199) -- revert before go-live.';
comment on column payment_settings.plan_3mo_fee_amount is
  'PENDING: test price is 1 (real price 6999). No feature built on this yet -- requirements not received.';

alter table driver_licenses enable row level security;

create policy "a student reads their own license; staff/manager read all"
  on driver_licenses for select using (student_id = auth.uid() or is_staff_or_manager());

create function student_has_active_license() returns boolean as $$
  select exists (select 1 from driver_licenses where student_id = auth.uid() and status = 'active');
$$ language sql stable security definer set search_path = public;

create or replace function get_my_license()
returns driver_licenses as $$
declare v_row driver_licenses;
begin
  select * into v_row from driver_licenses where student_id = auth.uid();
  return v_row;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function declare_license_payment(p_reference text)
returns driver_licenses as $$
declare
  v_ref text := nullif(trim(coalesce(p_reference, '')), '');
  v_fee numeric;
  v_row driver_licenses;
begin
  if my_role() is distinct from 'student' or not is_active_account() then
    raise exception 'only an active student can purchase a driver license';
  end if;
  if v_ref is null then
    raise exception 'enter the UPI transaction ID / UTR from your payment confirmation';
  end if;
  select license_fee_amount into v_fee from payment_settings limit 1;

  insert into driver_licenses (student_id, status, amount, payment_declared, payment_reference)
  values (auth.uid(), 'payment_declared', v_fee, true, v_ref)
  on conflict (student_id) do update set
    status = case when driver_licenses.status = 'active' then driver_licenses.status else 'payment_declared'::license_status end,
    amount = v_fee,
    payment_declared = true,
    payment_reference = v_ref,
    updated_at = now()
  returning * into v_row;

  perform log_audit('declare_license_payment', 'driver_license', v_row.id, jsonb_build_object('reference', v_ref));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function staff_decide_license(p_student uuid, p_decision text)
returns void as $$
declare r driver_licenses;
begin
  if not (is_hanbee_staff() or is_manager()) then raise exception 'only Hanbee staff or a manager may decide on a license'; end if;
  if p_decision not in ('active', 'rejected') then raise exception 'decision must be active or rejected'; end if;
  select * into r from driver_licenses where student_id = p_student for update;
  if r.id is null then raise exception 'this student has not declared a license payment yet'; end if;
  if r.status <> 'payment_declared' then raise exception 'this license is not waiting on a decision'; end if;

  update driver_licenses set
    status = p_decision::license_status,
    decided_by = auth.uid(),
    decided_at = now(),
    updated_at = now()
  where id = r.id;

  perform log_audit('staff_decide_license', 'driver_license', r.id, jsonb_build_object('decision', p_decision));
  perform create_notification(p_student,
    case when p_decision = 'active' then 'license_active' else 'license_rejected' end,
    case when p_decision = 'active' then 'Your Driver License is active' else 'Your Driver License payment was rejected' end,
    '', '/dashboard/license');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function license_queue()
returns table(student_id uuid, student_name text, amount numeric, payment_reference text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select l.student_id, p.full_name, l.amount, l.payment_reference, l.created_at
  from driver_licenses l
  join profiles p on p.id = l.student_id
  where l.status = 'payment_declared'
  order by l.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Gate the three "start your own tournament entry" RPCs. Full bodies
-- rebuilt from their latest live definitions (0114, 0103, 0039), only
-- adding the license check near the top -- everything else unchanged.
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

revoke all on function get_my_license(), declare_license_payment(text), staff_decide_license(uuid, text), license_queue() from public, anon;
grant execute on function get_my_license(), declare_license_payment(text), staff_decide_license(uuid, text), license_queue() to authenticated;
