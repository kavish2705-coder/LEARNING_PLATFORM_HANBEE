-- The one-time plan choice a brand-new independent student makes the
-- first time they land in the dashboard (see 0123_access_requests.sql for
-- the two access flags this sets). Only reachable while both flags are
-- still 'none' -- existing (grandfathered) and already-decided students
-- never see this again, enforced here rather than trusted to the frontend
-- alone.
--
-- Choosing "RC Tournament" is a plain self-serve flip to 'active' -- it's
-- the existing ₹199-license-plus-per-tournament-fee flow, nothing new to
-- decide. Choosing "Course only" is NOT a self-serve purchase -- it goes
-- through the exact same staff-verified pipeline as a later upgrade
-- request (quiz, then a parent+student phone confirmation, then a
-- staff-set price), so this just creates that access_requests row
-- directly in 'requested' state, equivalent to having clicked "Interested"
-- on the blocker screen.

create or replace function choose_initial_plan(p_choice text)
returns void as $$
begin
  if not is_solo_student() or not is_active_account() then
    raise exception 'only an independent student can choose a plan here';
  end if;
  if (select tournament_access from profiles where id = auth.uid()) <> 'none'
     or (select course_access from profiles where id = auth.uid()) <> 'none' then
    raise exception 'your plan has already been set';
  end if;

  if p_choice = 'tournament' then
    update profiles set tournament_access = 'active' where id = auth.uid();
  elsif p_choice = 'course' then
    update profiles set course_access = 'requested' where id = auth.uid();
    insert into access_requests (student_id, direction, status)
    values (auth.uid(), 'add_course', 'requested')
    on conflict (student_id, direction) do update set status = 'requested';
  else
    raise exception 'choice must be tournament or course';
  end if;

  perform log_audit('choose_initial_plan', 'profile', auth.uid(), jsonb_build_object('choice', p_choice));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function choose_initial_plan(text) from public, anon;
grant execute on function choose_initial_plan(text) to authenticated;
