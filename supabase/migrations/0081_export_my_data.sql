-- Student data export (docs/SECURITY_PLAN.md closing note: "deletion and
-- export of a student's data" still open). A signed-in user can call this
-- to get every row that is genuinely their own data as one JSON document --
-- enough to satisfy a reasonable "export my data" request without exposing
-- anyone else's content. Shared contexts only ever surface the caller's own
-- side of them: messages includes only what the caller sent (not what
-- conversation partners sent them), and tournament teams include only the
-- caller's own membership row, not teammates' details.

create or replace function export_my_data() returns jsonb as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = me),

    'enrollments', (
      select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
      from enrollments e where e.student_id = me
    ),

    'lesson_completions', (
      select coalesce(jsonb_agg(to_jsonb(lc)), '[]'::jsonb)
      from lesson_completions lc
      join enrollments e on e.id = lc.enrollment_id
      where e.student_id = me
    ),

    'attendance_marks', (
      select coalesce(jsonb_agg(to_jsonb(am)), '[]'::jsonb)
      from attendance_marks am
      join enrollments e on e.id = am.enrollment_id
      where e.student_id = me
    ),

    'auto_attendance_sessions', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from auto_attendance_sessions s where s.user_id = me
    ),

    'certificates', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from certificates c where c.user_id = me
    ),

    'assessment_submissions', (
      select coalesce(jsonb_agg(to_jsonb(sub)), '[]'::jsonb)
      from assessment_submissions sub
      join enrollments e on e.id = sub.enrollment_id
      where e.student_id = me
    ),

    'applications', (
      select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
      from applications a where a.applicant_id = me
    ),

    'tournament_team_memberships', (
      select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      from tournament_team_members m where m.student_id = me
    ),

    'sent_messages', (
      select coalesce(jsonb_agg(to_jsonb(msg)), '[]'::jsonb)
      from messages msg where msg.sender_id = me
    ),

    'notifications', (
      select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
      from notifications n where n.user_id = me
    ),

    'discussion_threads_started', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from discussion_threads t where t.author_id = me
    ),

    'discussion_posts', (
      select coalesce(jsonb_agg(to_jsonb(dp)), '[]'::jsonb)
      from discussion_posts dp where dp.author_id = me
    )
  );
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function export_my_data() from public, anon;
grant execute on function export_my_data() to authenticated;
