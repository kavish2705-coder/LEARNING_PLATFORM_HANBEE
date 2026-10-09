-- 35 foreign-key columns had no supporting index, confirmed by a direct audit
-- of the live schema. These are exactly the columns every join, every
-- cascade-delete FK check, and the course editor filter on. Invisible at
-- near-zero data volume; becomes a real slow-query and lock-contention
-- problem the moment real content and users land.

create index if not exists announcements_author_id_idx on announcements (author_id);
create index if not exists applications_decided_by_idx on applications (decided_by);
create index if not exists assessment_options_question_id_idx on assessment_options (question_id);
create index if not exists assessment_questions_assessment_id_idx on assessment_questions (assessment_id);
create index if not exists assessments_created_by_idx on assessments (created_by);
create index if not exists attendance_marks_marked_by_idx on attendance_marks (marked_by);
create index if not exists audit_log_actor_id_idx on audit_log (actor_id);
create index if not exists calendar_events_section_id_idx on calendar_events (section_id);
create index if not exists calendar_events_created_by_idx on calendar_events (created_by);
create index if not exists class_sessions_section_id_idx on class_sessions (section_id);
create index if not exists conversations_created_by_idx on conversations (created_by);
create index if not exists courses_owner_id_idx on courses (owner_id);
create index if not exists discussion_posts_author_id_idx on discussion_posts (author_id);
create index if not exists discussion_posts_thread_id_idx on discussion_posts (thread_id);
create index if not exists discussion_threads_course_id_idx on discussion_threads (course_id);
create index if not exists discussion_threads_author_id_idx on discussion_threads (author_id);
create index if not exists invitations_section_id_idx on invitations (section_id);
create index if not exists invitations_invited_by_idx on invitations (invited_by);
create index if not exists lesson_materials_lesson_id_idx on lesson_materials (lesson_id);
create index if not exists lessons_module_id_idx on lessons (module_id);
create index if not exists modules_course_id_idx on modules (course_id);
create index if not exists organizations_created_by_idx on organizations (created_by);
create index if not exists organizations_verified_by_idx on organizations (verified_by);
create index if not exists school_team_slots_set_by_idx on school_team_slots (set_by);
create index if not exists sections_course_id_idx on sections (course_id);
create index if not exists team_invitations_invited_by_idx on team_invitations (invited_by);
create index if not exists team_invitations_tournament_id_idx on team_invitations (tournament_id);
create index if not exists tournament_registrations_student_id_idx on tournament_registrations (student_id);
create index if not exists tournament_results_history_changed_by_idx on tournament_results_history (changed_by);
create index if not exists tournament_team_members_org_id_at_join_idx on tournament_team_members (org_id_at_join);
create index if not exists tournament_teams_captain_id_idx on tournament_teams (captain_id);
create index if not exists tournament_teams_decided_by_idx on tournament_teams (decided_by);
create index if not exists tournament_teams_created_by_idx on tournament_teams (created_by);
create index if not exists tournaments_created_by_idx on tournaments (created_by);
create index if not exists verification_applicants_resulting_enrollment_id_idx on verification_applicants (resulting_enrollment_id);
