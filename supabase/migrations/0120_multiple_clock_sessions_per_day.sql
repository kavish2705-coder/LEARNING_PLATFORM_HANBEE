-- clock_in()/clock_out() enforced exactly one clock cycle per staff per
-- day (unique (staff_id, work_date)). That meant an accidental or early
-- clock-out left a staff member unable to clock back in for the rest of
-- that day -- the UI still offered a "Clock in" button (since they
-- weren't *currently* clocked in) that would always fail with "you
-- already clocked in today", with no way to recover short of a manager
-- editing the row directly.
--
-- This replaces the one-per-day rule with the real invariant that
-- actually matters: at most one OPEN session at a time. Staff can now
-- clock in and out multiple times in a day (breaks, an accidental early
-- clock-out followed by clocking back in, etc.), and hours worked sum
-- across all of that day's sessions.

alter table staff_time_entries drop constraint staff_time_entries_staff_id_work_date_key;

-- The real invariant: never two sessions open at once for the same staff
-- member on the same day. (Not just "same staff member" globally, since
-- work_date already scopes each row to one calendar day.)
create unique index staff_time_entries_one_open_per_day
  on staff_time_entries (staff_id, work_date)
  where clock_out is null;

create or replace function clock_in()
returns staff_time_entries as $$
declare
  s staff_work_settings;
  v_work_date date;
  v_local_time time;
  v_row staff_time_entries;
  v_first_of_day boolean;
begin
  if not is_hanbee_staff() then
    raise exception 'only Hanbee staff can clock in';
  end if;
  select * into s from staff_work_settings limit 1;
  if s.id is null then
    raise exception 'staff work settings are not configured';
  end if;
  v_work_date := (now() at time zone s.timezone)::date;
  v_local_time := (now() at time zone s.timezone)::time;

  if exists (select 1 from staff_time_entries where staff_id = auth.uid() and work_date = v_work_date and clock_out is null) then
    raise exception 'you are already clocked in';
  end if;

  -- Only the first clock-in of the day counts toward on-time/late -- a
  -- later same-day re-entry (after a break, or fixing an accidental
  -- clock-out) isn't a fresh "start of day" to judge punctuality by.
  v_first_of_day := not exists (select 1 from staff_time_entries where staff_id = auth.uid() and work_date = v_work_date);

  begin
    insert into staff_time_entries (staff_id, work_date, clock_in, on_time)
    values (
      auth.uid(), v_work_date, now(),
      case when v_first_of_day then v_local_time <= s.start_time + make_interval(mins => s.grace_minutes) else true end
    )
    returning * into v_row;
  exception when unique_violation then
    raise exception 'you are already clocked in';
  end;

  perform log_audit('clock_in', 'staff_time_entries', v_row.id, jsonb_build_object('work_date', v_work_date, 'on_time', v_row.on_time));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function clock_out()
returns staff_time_entries as $$
declare
  s staff_work_settings;
  v_work_date date;
  v_row staff_time_entries;
begin
  if not is_hanbee_staff() then
    raise exception 'only Hanbee staff can clock out';
  end if;
  select * into s from staff_work_settings limit 1;
  if s.id is null then
    raise exception 'staff work settings are not configured';
  end if;
  v_work_date := (now() at time zone s.timezone)::date;

  select * into v_row from staff_time_entries
    where staff_id = auth.uid() and work_date = v_work_date and clock_out is null
    order by clock_in desc limit 1 for update;
  if v_row.id is null then
    raise exception 'you have not clocked in today';
  end if;

  update staff_time_entries set clock_out = now() where id = v_row.id returning * into v_row;
  perform log_audit('clock_out', 'staff_time_entries', v_row.id, jsonb_build_object('work_date', v_work_date));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

-- staff_attendance() assumed one row per (staff, work_date). Now
-- aggregates every session that day into one reported row: hours sum
-- across all sessions, clock_in is the still-open session's clock-in if
-- one exists (so "Clocked In" status still works unchanged), else the
-- day's first clock-in: clock_out is null while any session that day is
-- still open (same "currently clocked in" signal the frontend already
-- reads), else the day's last clock-out; on_time reflects only the
-- day's first session, matching clock_in()'s new rule above.
create or replace function staff_attendance(p_staff uuid default null, p_from date default null, p_to date default null)
returns table (
  work_date date, status text, clock_in timestamptz, clock_out timestamptz,
  hours numeric, on_time boolean, holiday_name text
) as $$
declare
  v_staff uuid := coalesce(p_staff, auth.uid());
  v_from date := coalesce(p_from, current_date - 29);
  v_to date := coalesce(p_to, current_date);
  s staff_work_settings;
begin
  if not (is_manager() or is_hanbee_staff()) then raise exception 'not allowed'; end if;
  if v_staff <> auth.uid() and not is_manager() then raise exception 'not allowed'; end if;
  if v_to < v_from or v_to - v_from > 366 then raise exception 'invalid range'; end if;
  select * into s from staff_work_settings limit 1;
  return query
  select d::date,
    case
      when t.work_date is not null then case
        when t.on_time or h.id is not null or not (extract(isodow from d)::int = any (s.work_days)) then 'present'
        else 'late' end
      when h.id is not null then 'holiday'
      when not (extract(isodow from d)::int = any (s.work_days)) then 'off'
      when d::date < sp.created_at::date then 'off'
      when d::date > current_date then 'upcoming'
      when d::date = current_date then 'today'
      else 'absent'
    end,
    t.clock_in, t.clock_out, t.hours, t.on_time, h.name
  from generate_series(v_from::timestamp, v_to::timestamp, interval '1 day') d
  cross join (select created_at from profiles where id = v_staff) sp
  left join (
    select
      e.work_date,
      coalesce(
        (array_agg(e.clock_in order by e.clock_in desc) filter (where e.clock_out is null))[1],
        min(e.clock_in)
      ) as clock_in,
      case when bool_or(e.clock_out is null) then null else max(e.clock_out) end as clock_out,
      round(sum(extract(epoch from (coalesce(e.clock_out, now()) - e.clock_in)) / 3600.0)::numeric, 1) as hours,
      (array_agg(e.on_time order by e.clock_in asc))[1] as on_time
    from staff_time_entries e
    where e.staff_id = v_staff
    group by e.work_date
  ) t on t.work_date = d::date
  left join holidays h on h.holiday_date = d::date and h.scope in ('staff', 'center')
  order by d desc;
end;
$$ language plpgsql stable security definer set search_path = public;
