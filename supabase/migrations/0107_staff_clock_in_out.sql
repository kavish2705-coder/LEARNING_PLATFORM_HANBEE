-- Staff clock-in/out. staff_time_entries and its RLS (own row only) have
-- existed since 0001/0002, and staff_attendance()/hanbee_staff_overview()
-- (0033) already read from it -- "Shift Hours Today" on My Space has been
-- reading a table nothing ever wrote to. This adds the two RPCs to
-- actually write it, following the same on_time/grace-period logic
-- staff_attendance() already uses to report it.

create or replace function clock_in()
returns staff_time_entries as $$
declare
  s staff_work_settings;
  v_work_date date;
  v_local_time time;
  v_row staff_time_entries;
begin
  if not is_hanbee_staff() then
    raise exception 'only Hanbee staff can clock in';
  end if;
  select * into s from staff_work_settings limit 1;
  v_work_date := (now() at time zone s.timezone)::date;
  v_local_time := (now() at time zone s.timezone)::time;

  if exists (select 1 from staff_time_entries where staff_id = auth.uid() and work_date = v_work_date) then
    raise exception 'you already clocked in today';
  end if;

  insert into staff_time_entries (staff_id, work_date, clock_in, on_time)
  values (auth.uid(), v_work_date, now(), v_local_time <= s.start_time + make_interval(mins => s.grace_minutes))
  returning * into v_row;

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
  v_work_date := (now() at time zone s.timezone)::date;

  select * into v_row from staff_time_entries where staff_id = auth.uid() and work_date = v_work_date for update;
  if v_row.id is null then
    raise exception 'you have not clocked in today';
  end if;
  if v_row.clock_out is not null then
    raise exception 'you already clocked out today';
  end if;

  update staff_time_entries set clock_out = now() where id = v_row.id returning * into v_row;
  perform log_audit('clock_out', 'staff_time_entries', v_row.id, jsonb_build_object('work_date', v_work_date));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function clock_in(), clock_out() from public, anon;
grant execute on function clock_in(), clock_out() to authenticated;
