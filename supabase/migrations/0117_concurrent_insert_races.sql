-- Continuing the audit sweep: three more functions do a plain
-- check-then-insert against a row a real double-click can race past
-- (the check and the insert aren't atomic), each backed by a real unique
-- index that would turn the loser's insert into a raw, unhandled Postgres
-- error -- same class of bug as create_solo_team earlier.
--
--   clock_in: the most realistic of the three -- a staff member
--   double-clicking "Clock In" (impatience, lag) fires two concurrent
--   calls that both pass the "not already clocked in today" check before
--   either commits. Backed by staff_time_entries_staff_id_work_date_key.
--
--   add_team_member: a school captain/staff double-clicking "Add member"
--   could do the same against
--   tournament_team_members_tournament_id_student_id_key.
--
--   join_school: a student double-clicking a join link races against
--   organization_members_one_active_per_user.
--
-- All three get the same treatment as every other insert in this schema
-- that protects against a real collision: catch unique_violation and
-- return/raise a friendly, specific message instead of letting the raw
-- constraint error through.

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

  begin
    insert into staff_time_entries (staff_id, work_date, clock_in, on_time)
    values (auth.uid(), v_work_date, now(), v_local_time <= s.start_time + make_interval(mins => s.grace_minutes))
    returning * into v_row;
  exception when unique_violation then
    raise exception 'you already clocked in today';
  end;

  perform log_audit('clock_in', 'staff_time_entries', v_row.id, jsonb_build_object('work_date', v_work_date, 'on_time', v_row.on_time));
  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function add_team_member(p_team uuid, p_student uuid)
returns void as $$
declare t tournament_teams;
begin
  select * into t from tournament_teams where id = p_team for update;
  if t.id is null or t.org_id is null or not can_run_team(t) then raise exception 'not allowed'; end if;
  if t.status <> 'draft' then raise exception 'the team can only change while it is a draft'; end if;
  if not exists (
    select 1 from organization_members m
    join profiles p on p.id = m.user_id
    where m.user_id = p_student and m.org_id = t.org_id and m.status = 'active'
      and m.member_role = 'student' and p.role = 'student' and p.account_status = 'active'
  ) then raise exception 'this student is not an active member of your school'; end if;
  if exists (select 1 from tournament_team_members where tournament_id = t.tournament_id and student_id = p_student) then
    raise exception 'this student is already in a team for this tournament';
  end if;
  begin
    insert into tournament_team_members (team_id, tournament_id, student_id, org_id_at_join)
    values (p_team, t.tournament_id, p_student, t.org_id);
  exception when unique_violation then
    raise exception 'this student is already in a team for this tournament';
  end;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function join_school(p_join_token text)
returns jsonb as $$
declare
  me profiles;
  org organizations;
  inv invitations;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.account_status <> 'active' then
    raise exception 'only an active student can join a school';
  end if;
  if exists (select 1 from organization_members where user_id = me.id and status = 'active') then
    raise exception 'you already belong to a school';
  end if;
  select * into org from organizations where join_token = p_join_token and status = 'active';
  if org.id is null then raise exception 'this school link is invalid'; end if;
  select * into inv from invitations i
   where i.org_id = org.id and lower(i.email) = lower(me.email) and i.role = 'student'
     and not i.accepted and i.revoked_at is null and i.expires_at > now()
   order by i.created_at desc limit 1
   for update;
  if inv.id is null then raise exception 'this email has not been invited by the school'; end if;

  begin
    insert into organization_members (org_id, user_id, member_role) values (org.id, me.id, 'student');
  exception when unique_violation then
    raise exception 'you already belong to a school';
  end;
  perform set_config('app.trusted_invitation_write', 'true', true);
  update invitations set accepted = true where id = inv.id;
  perform set_config('app.trusted_invitation_write', '', true);
  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles set is_solo = false where id = me.id;
  perform set_config('app.trusted_profile_write', '', true);
  perform log_audit('join_school', 'organization', org.id, '{}'::jsonb);
  return jsonb_build_object('result', 'joined', 'school', org.name);
end;
$$ language plpgsql security definer set search_path = public;
