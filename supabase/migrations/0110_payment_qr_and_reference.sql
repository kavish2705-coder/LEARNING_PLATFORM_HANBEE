-- Payment QR + verification flow.
--
-- Today's reality: the landing page FAQ claims "You confirm payment with
-- the QR code shown at checkout" but no such QR exists anywhere -- students
-- just tick "I have completed the tournament payment" with zero evidence,
-- and staff verify blind (presumably by checking their own bank/UPI app
-- off-platform). This migration:
--   1. Adds a staff/manager-editable `payment_settings` singleton (one
--      UPI QR image + UPI ID + instructions, reused for every tournament
--      entry and course application -- see conversation: one global QR,
--      not per-tournament, matches the current single-account scale).
--   2. Adds `payment_reference` (the UPI transaction ID / UTR the student
--      types in after paying) to tournament_teams and applications, and
--      requires it whenever payment is declared.
--   3. Surfaces payment_reference in both staff review queues so staff can
--      cross-check it against their bank statement instead of verifying
--      blind.
--
-- All function bodies below are rebuilt from their LIVE definitions
-- (pg_get_functiondef), not from the migration files that first created
-- them, to avoid regressing logic that changed since.

-- ---------------------------------------------------------------------------
-- 1. payment_settings: a single row, staff/manager-writable, readable by
--    any authenticated user (anyone who might need to pay).
-- ---------------------------------------------------------------------------
create table payment_settings (
  id boolean primary key default true,
  qr_image_url text not null default '',
  upi_id text not null default '',
  instructions text not null default '',
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint payment_settings_singleton check (id)
);
insert into payment_settings (id) values (true);

alter table payment_settings enable row level security;

create policy "any authenticated user can read payment settings"
  on payment_settings for select to authenticated using (true);
create policy "staff/manager can update payment settings"
  on payment_settings for update to authenticated using (is_staff_or_manager()) with check (is_staff_or_manager());

-- ---------------------------------------------------------------------------
-- 2. Storage bucket for the QR image itself. Public read (it's just a QR
--    code, nothing sensitive); only staff/manager can write.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-assets', 'payment-assets', true)
on conflict (id) do nothing;

create policy "staff/manager can upload payment assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-assets' and is_staff_or_manager());
create policy "staff/manager can replace payment assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'payment-assets' and is_staff_or_manager());
create policy "anyone can view payment assets"
  on storage.objects for select using (bucket_id = 'payment-assets');

-- ---------------------------------------------------------------------------
-- 3. payment_reference columns.
-- ---------------------------------------------------------------------------
alter table tournament_teams add column if not exists payment_reference text;
alter table applications add column if not exists payment_reference text;

-- ---------------------------------------------------------------------------
-- 4. apply_team: require + store a payment reference when payment is
--    declared. Rebuilt from the live definition, only touching the
--    reference handling. The old 2-arg signature is dropped so a 2-arg
--    call can't become ambiguous against the new 3-arg-with-default one.
-- ---------------------------------------------------------------------------
drop function if exists apply_team(uuid, boolean);

create or replace function apply_team(p_team uuid, p_payment_declared boolean, p_payment_reference text default null)
returns void as $$
declare
  t tournament_teams;
  v_size int;
  v_member_count int;
  v_ref text := nullif(trim(coalesce(p_payment_reference, '')), '');
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status not in ('draft', 'proposed') then raise exception 'this team has already applied'; end if;
  if not exists (select 1 from tournaments where id = t.tournament_id and status = 'upcoming') then
    raise exception 'this tournament is not open for applications';
  end if;

  select team_size into v_size from tournaments where id = t.tournament_id;
  select count(*) into v_member_count from tournament_team_members where team_id = p_team;
  if v_member_count < 1 or v_member_count > v_size then
    raise exception 'a team must have between 1 and % players to apply', v_size;
  end if;

  if coalesce(p_payment_declared, false) and v_ref is null then
    raise exception 'enter the UPI transaction ID / UTR from your payment confirmation';
  end if;

  perform set_config('app.trusted_portal_write', 'true', true);
  update tournament_teams set
    status = case when coalesce(p_payment_declared, false) then 'payment_declared'::team_status else 'applied'::team_status end,
    payment_declared = coalesce(p_payment_declared, false),
    payment_reference = coalesce(v_ref, payment_reference)
  where id = p_team;
  perform set_config('app.trusted_portal_write', '', true);
  update team_invitations set status = 'cancelled', decided_at = now() where team_id = p_team and status = 'pending';
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 5. apply_for_course: same treatment, same reason for the drop.
-- ---------------------------------------------------------------------------
drop function if exists apply_for_course(uuid, boolean);

create or replace function apply_for_course(p_course uuid, p_payment_declared boolean, p_payment_reference text default null)
returns uuid as $$
declare
  v_id uuid;
  v_org uuid := my_org_id();
  v_ref text := nullif(trim(coalesce(p_payment_reference, '')), '');
begin
  if my_role() is distinct from 'student' or not (v_org is not null or is_solo_student()) then
    raise exception 'only a student with an active school, or a solo student, may apply';
  end if;
  if not exists (select 1 from courses where id = p_course and status = 'published') then
    raise exception 'this course is not open for applications';
  end if;
  if exists (select 1 from enrollments e join sections s on s.id = e.section_id
             where s.course_id = p_course and e.student_id = auth.uid() and e.status in ('active', 'completed')) then
    raise exception 'you are already enrolled in this course';
  end if;
  if coalesce(p_payment_declared, false) and v_ref is null then
    raise exception 'enter the UPI transaction ID / UTR from your payment confirmation';
  end if;
  begin
    perform set_config('app.trusted_portal_write', 'true', true);
    insert into applications (course_id, applicant_id, org_id_at_join, status, payment_declared, payment_reference)
    values (p_course, auth.uid(), v_org,
      case when coalesce(p_payment_declared, false) then 'payment_declared'::application_status else 'applied'::application_status end,
      coalesce(p_payment_declared, false), v_ref)
    returning id into v_id;
    perform set_config('app.trusted_portal_write', '', true);
  exception when unique_violation then
    perform set_config('app.trusted_portal_write', '', true);
    raise exception 'you have already applied for this course';
  end;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 6. Surface payment_reference in both staff review queues. Both gain a
--    column, so `create or replace` alone would fail ("cannot change
--    return type of existing function") -- drop first.
-- ---------------------------------------------------------------------------
drop function if exists tournament_application_queue();
drop function if exists list_course_applications(application_status[], text);

create or replace function tournament_application_queue()
returns table(team_id uuid, tournament_id uuid, tournament_title text, team_name text, org_id uuid, school_name text, participant_label text, captain_name text, member_count bigint, status text, payment_declared boolean, payment_reference text, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (is_active_account() and is_staff_or_manager()) then
    raise exception 'only Hanbee staff or a manager can review tournament entries';
  end if;
  return query
    select t.id, t.tournament_id, tr.title, t.name, t.org_id, o.name,
           case when t.org_id is null then 'Independent Entry' else o.name end,
           p.full_name,
           (select count(*) from tournament_team_members m where m.team_id = t.id),
           t.status::text, t.payment_declared, t.payment_reference, t.submitted_at
    from tournament_teams t
    join tournaments tr on tr.id = t.tournament_id
    left join organizations o on o.id = t.org_id
    left join profiles p on p.id = t.captain_id
    where t.status in ('applied', 'payment_declared')
    order by t.submitted_at nulls last, t.created_at;
end;
$$;

create or replace function list_course_applications(p_status application_status[] default null, p_search text default null)
returns table(id uuid, course_id uuid, course_title text, applicant_id uuid, applicant_name text, org_id_at_join uuid, school_name text, status application_status, payment_declared boolean, payment_reference text, decided_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select a.id, a.course_id, c.title, a.applicant_id, p.full_name, a.org_id_at_join, o.name, a.status,
    a.payment_declared, a.payment_reference, a.decided_at, a.created_at
  from public.applications a
  join public.courses c on c.id = a.course_id
  join public.profiles p on p.id = a.applicant_id
  left join public.organizations o on o.id = a.org_id_at_join
  where (is_manager() or is_hanbee_staff()
    or (my_role() = 'school_staff' and a.org_id_at_join is not null and a.org_id_at_join = my_org_id())
    or (a.applicant_id = auth.uid() and is_active_account()))
    and (p_status is null or a.status = any(p_status))
    and (p_search is null or p_search = '' or p.full_name ilike '%' || p_search || '%' or c.title ilike '%' || p_search || '%')
  order by a.created_at desc;
$$;

revoke all on function apply_team(uuid, boolean, text) from public, anon;
grant execute on function apply_team(uuid, boolean, text) to authenticated;

revoke all on function apply_for_course(uuid, boolean, text) from public, anon;
grant execute on function apply_for_course(uuid, boolean, text) to authenticated;

grant execute on function tournament_application_queue() to authenticated;
grant execute on function list_course_applications(application_status[], text) to authenticated;
