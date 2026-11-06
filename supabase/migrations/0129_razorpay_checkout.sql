-- Server-verified Razorpay checkout records. These rows contain the trusted
-- amount and app-side target for each provider order; clients cannot read or
-- write them directly.
create table public.razorpay_orders (
  id uuid primary key default gen_random_uuid(),
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  purpose text not null check (purpose in ('driver_license', 'course_access', 'tournament_entry')),
  reference_id uuid not null,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in ('created', 'captured')),
  created_at timestamptz not null default now(),
  captured_at timestamptz
);

alter table public.razorpay_orders enable row level security;
revoke all on public.razorpay_orders from anon, authenticated;
grant select, insert on public.razorpay_orders to service_role;

-- Migration 0121 used ₹1 as a test-only Driver License amount and explicitly
-- documented ₹199 as the intended live fee. Replace only that placeholder;
-- preserve any amount staff already configured differently.
alter table public.payment_settings
  alter column license_fee_amount set default 199;
update public.payment_settings
   set license_fee_amount = 199
 where license_fee_amount = 1;
comment on column public.payment_settings.license_fee_amount is
  'One-time Driver License fee in INR. The test-only ₹1 default was replaced by the documented ₹199 fee in migration 0129.';

create unique index razorpay_orders_one_open_target_idx
  on public.razorpay_orders (owner_id, purpose, reference_id)
  where status = 'created';

alter table public.tournament_teams
  add column if not exists payment_approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists payment_approved_at timestamptz;

create or replace function public.student_submit_solo_entry_for_review(p_team uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tournament_teams;
begin
  if my_role() is distinct from 'student' or not is_solo_student() or not is_active_account() then
    raise exception 'only an active independent student can submit this entry';
  end if;

  select * into t from public.tournament_teams where id = p_team for update;
  if t.id is null or t.captain_id is distinct from auth.uid() or t.org_id is not null then
    raise exception 'not allowed';
  end if;
  if t.status <> 'draft' then raise exception 'this entry has already been submitted'; end if;
  if not exists (
    select 1 from public.tournaments where id = t.tournament_id and status = 'upcoming'
  ) then
    raise exception 'this tournament is not open for entries';
  end if;
  if (select count(*) from public.tournament_team_members where team_id = p_team) <> 1 then
    raise exception 'a solo entry must have exactly one player';
  end if;

  perform set_config('app.trusted_portal_write', 'true', true);
  update public.tournament_teams
     set status = 'applied', submitted_at = now(), staff_note = '',
         payment_approved_by = null, payment_approved_at = null
   where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  perform public.log_audit('submit_solo_entry_for_review', 'tournament_team', p_team, '{}'::jsonb);
end;
$$;

create or replace function public.staff_approve_entry_for_payment(p_team uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tournament_teams;
begin
  if not (is_active_account() and (is_hanbee_staff() or is_manager())) then
    raise exception 'only Hanbee staff or a manager can approve an entry for payment';
  end if;

  select * into t from public.tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is not null then raise exception 'independent entry not found'; end if;
  if t.status <> 'applied' or t.payment_declared then
    raise exception 'this entry is not waiting for payment approval';
  end if;
  if not exists (
    select 1 from public.tournaments where id = t.tournament_id and status = 'upcoming'
  ) then
    raise exception 'this tournament is not open for entries';
  end if;
  if t.payment_approved_at is not null then
    raise exception 'payment has already been approved for this entry';
  end if;

  update public.tournament_teams
     set payment_approved_by = auth.uid(), payment_approved_at = now()
   where id = p_team;
  perform public.log_audit('approve_tournament_entry_for_payment', 'tournament_team', p_team, '{}'::jsonb);
  perform public.create_notification(
    t.captain_id,
    'tournament_payment_approved',
    'Your tournament entry is approved for payment',
    t.name,
    '/dashboard/team'
  );
end;
$$;

-- A team cannot be withdrawn or rejected after Hanbee has approved it for
-- payment. This avoids leaving an open provider order that could still be paid.
create or replace function public.guard_payment_approved_entry_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.payment_approved_at is not null
     and old.status = 'applied'
     and new.status is distinct from old.status
     and current_setting('app.razorpay_settlement', true) is distinct from 'true' then
    raise exception 'this entry has been approved for payment and its status can only change after captured payment';
  end if;
  return new;
end;
$$;

create trigger trg_guard_payment_approved_entry_status
  before update of status on public.tournament_teams
  for each row execute function public.guard_payment_approved_entry_status();

revoke all on function public.guard_payment_approved_entry_status() from public, anon, authenticated;

drop function if exists public.tournament_application_queue();
create function public.tournament_application_queue()
returns table (
  team_id uuid,
  tournament_id uuid,
  tournament_title text,
  team_name text,
  org_id uuid,
  school_name text,
  participant_label text,
  captain_name text,
  member_count bigint,
  status text,
  payment_declared boolean,
  payment_reference text,
  submitted_at timestamptz,
  payment_approved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can review tournament entries';
  end if;

  return query
    select t.id, t.tournament_id, tr.title, t.name, t.org_id, o.name,
           case when t.org_id is null then 'Independent Entry' else o.name end,
           p.full_name,
           (select count(*) from public.tournament_team_members m where m.team_id = t.id),
           t.status::text, t.payment_declared, t.payment_reference, t.submitted_at,
           t.payment_approved_at
      from public.tournament_teams t
      join public.tournaments tr on tr.id = t.tournament_id
      left join public.organizations o on o.id = t.org_id
      left join public.profiles p on p.id = t.captain_id
     where t.status in ('applied', 'payment_declared', 'verified', 'rejected')
     order by
       case when t.status in ('applied', 'payment_declared') then 0 else 1 end,
       t.submitted_at desc nulls last,
       t.created_at desc;
end;
$$;

-- Include the staff-approved timestamp in the student's team summary.
create or replace function public.my_team_formation(p_tournament uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid := my_org_id();
  t public.tournament_teams;
  v_conv uuid;
  res jsonb;
begin
  if my_role() is distinct from 'student' or not is_active_account() then
    raise exception 'not allowed';
  end if;

  select x.* into t
    from public.tournament_teams x
    join public.tournament_team_members m on m.team_id = x.id
   where m.tournament_id = p_tournament
     and m.student_id = auth.uid()
     and x.status not in ('withdrawn', 'rejected')
   limit 1;
  select id into v_conv from public.conversations where team_id = t.id;

  select jsonb_build_object(
    'school_id', v_org,
    'slots', case when v_org is null then null else team_slot_status(p_tournament, v_org) end,
    'my_team', case when t.id is null then null else jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'status', t.status,
      'is_captain', t.captain_id = auth.uid(),
      'staff_note', t.staff_note,
      'chat_id', v_conv,
      'payment_approved_at', t.payment_approved_at,
      'members', (
        select coalesce(
          jsonb_agg(jsonb_build_object(
            'student_id', m.student_id,
            'name', p.full_name,
            'is_captain', m.student_id = t.captain_id
          ) order by m.joined_at),
          '[]'::jsonb
        )
          from public.tournament_team_members m
          join public.profiles p on p.id = m.student_id
         where m.team_id = t.id
      ),
      'pending_invites', (
        select coalesce(
          jsonb_agg(jsonb_build_object('id', i.id, 'student_id', i.student_id, 'name', p.full_name) order by i.created_at),
          '[]'::jsonb
        )
          from public.team_invitations i
          join public.profiles p on p.id = i.student_id
         where i.team_id = t.id and i.status = 'pending'
      )
    ) end,
    'invitations', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'id', i.id,
          'team_id', i.team_id,
          'team_name', x.name,
          'invited_by', ib.full_name,
          'members', (select count(*) from public.tournament_team_members mm where mm.team_id = x.id)
        ) order by i.created_at),
        '[]'::jsonb
      )
        from public.team_invitations i
        join public.tournament_teams x on x.id = i.team_id and x.status = 'draft'
        left join public.profiles ib on ib.id = i.invited_by
       where i.student_id = auth.uid()
         and i.tournament_id = p_tournament
         and i.status = 'pending'
    ),
    'eligible_classmates', case
      when t.id is null or t.captain_id is distinct from auth.uid() or t.status <> 'draft' then '[]'::jsonb
      else (
        select coalesce(
          jsonb_agg(jsonb_build_object('student_id', pr.id, 'name', pr.full_name) order by pr.full_name),
          '[]'::jsonb
        )
          from public.organization_members om
          join public.profiles pr on pr.id = om.user_id
         where om.org_id = t.org_id
           and om.status = 'active'
           and om.member_role = 'student'
           and pr.account_status = 'active'
           and not exists (
             select 1
               from public.tournament_team_members m2
               join public.tournament_teams x2 on x2.id = m2.team_id
              where m2.tournament_id = p_tournament
                and m2.student_id = pr.id
                and x2.status not in ('withdrawn', 'rejected')
           )
           and not exists (
             select 1 from public.team_invitations i2
              where i2.team_id = t.id and i2.student_id = pr.id and i2.status = 'pending'
           )
      )
    end
  ) into res;
  return res;
end;
$$;

create or replace function public.settle_razorpay_order(
  p_order_id text,
  p_payment_id text,
  p_amount_paise bigint,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.razorpay_orders;
  req public.access_requests;
  team public.tournament_teams;
  v_fee numeric;
begin
  if p_order_id is null or p_payment_id is null or p_amount_paise is null or p_currency is null then
    raise exception 'invalid Razorpay payment details';
  end if;
  select * into o
    from public.razorpay_orders
   where razorpay_order_id = p_order_id
   for update;
  if o.id is null then raise exception 'Razorpay order not found'; end if;
  if o.amount_paise <> p_amount_paise or o.currency <> upper(p_currency) then
    raise exception 'Razorpay amount or currency does not match the order';
  end if;
  if o.status = 'captured' then
    if o.razorpay_payment_id = p_payment_id then return 'already_captured'; end if;
    raise exception 'Razorpay order was captured with a different payment';
  end if;

  if o.purpose = 'driver_license' then
    update public.driver_licenses
       set status = 'active',
           amount = o.amount_paise / 100.0,
           payment_declared = true,
           payment_reference = 'razorpay:' || p_payment_id,
           decided_by = null,
           decided_at = now(),
           updated_at = now()
     where student_id = o.owner_id
       and status in ('unpaid', 'rejected');
    if not found then raise exception 'driver license is not eligible for payment settlement'; end if;

  elsif o.purpose = 'course_access' then
    select * into req
      from public.access_requests
     where id = o.reference_id
       and student_id = o.owner_id
       and direction = 'add_course'
       and status = 'awaiting_payment'
       and round(staff_set_amount * 100) = o.amount_paise
     for update;
    if req.id is null then raise exception 'course request is not eligible for payment settlement'; end if;
    update public.access_requests
       set status = 'active', decided_at = now()
     where id = req.id;
    update public.profiles set course_access = 'active' where id = o.owner_id;
    if not found then raise exception 'student profile was not found'; end if;

  elsif o.purpose = 'tournament_entry' then
    select * into team
      from public.tournament_teams
     where id = o.reference_id
       and captain_id = o.owner_id
       and org_id is null
       and status = 'applied'
       and payment_approved_at is not null
     for update;
    if team.id is null then raise exception 'tournament entry is not eligible for payment settlement'; end if;
    select entry_fee_amount into v_fee
      from public.tournaments
     where id = team.tournament_id and status = 'upcoming';
    if v_fee is null or round(v_fee * 100) <> o.amount_paise then
      raise exception 'tournament entry fee changed or the tournament is closed';
    end if;
    perform set_config('app.razorpay_settlement', 'true', true);
    update public.tournament_teams
       set status = 'verified',
           payment_declared = true,
           payment_reference = 'razorpay:' || p_payment_id,
           decided_by = payment_approved_by,
           decided_at = now()
     where id = team.id;
    perform set_config('app.razorpay_settlement', '', true);
    perform public.create_notification(
      team.captain_id,
      'team_verified',
      'Your tournament entry is registered',
      team.name,
      '/dashboard/team'
    );
  else
    raise exception 'unsupported Razorpay order purpose';
  end if;

  update public.razorpay_orders
     set status = 'captured',
         razorpay_payment_id = p_payment_id,
         captured_at = now()
   where id = o.id;
  return 'captured';
end;
$$;

revoke all on function public.student_submit_solo_entry_for_review(uuid) from public, anon;
revoke all on function public.staff_approve_entry_for_payment(uuid) from public, anon;
revoke all on function public.settle_razorpay_order(text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.tournament_application_queue() from public, anon;
grant execute on function public.student_submit_solo_entry_for_review(uuid) to authenticated;
grant execute on function public.staff_approve_entry_for_payment(uuid) to authenticated;
grant execute on function public.settle_razorpay_order(text, text, bigint, text) to service_role;
grant execute on function public.tournament_application_queue() to authenticated;
grant execute on function public.my_team_formation(uuid) to authenticated;
