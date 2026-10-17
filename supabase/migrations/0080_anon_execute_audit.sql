-- Backend security audit (docs/SECURITY_PLAN.md closing note: "lock down the
-- ~40 database functions anonymous visitors can call"). Confirmed live via
-- has_function_privilege('anon', ..., 'EXECUTE') against production: dozens
-- of SECURITY DEFINER functions are still callable by anon. Root cause is
-- the same class of gap 0077 fixed for 6 functions, just far more of them:
-- `grant execute on function f() to authenticated` does NOT revoke the
-- EXECUTE privilege PostgreSQL grants to the PUBLIC pseudo-role by default
-- at CREATE FUNCTION time, and `anon` inherits whatever PUBLIC has unless
-- explicitly revoked. Migrations that only ever did the grant half (never
-- `revoke all ... from public, anon` first) left that default PUBLIC grant
-- intact the whole time.
--
-- Five functions are confirmed intentionally anon-callable by their own
-- migrations and are deliberately left untouched here:
--   verify_certificate(uuid)      -- 0003: public certificate verification
--   manager_exists()              -- 0004: public signup-form check
--   get_invitation(uuid)          -- 0004: invite preview before signup
--   get_join_info(text)           -- 0024: school-link preview before signup
--   preflight_join(text, text)    -- 0024: invited-email check before signup
-- rls_auto_enable is a Supabase platform-internal function (not defined
-- anywhere in this repo's migrations) and is left alone.
--
-- Everything else below splits into three groups:
--   1. Trigger functions (returns trigger): revoked from EVERY role,
--      including authenticated. Postgres invokes triggers internally and
--      never checks the firing role's EXECUTE privilege to do so, so this
--      cannot break the triggers themselves -- it only closes the direct
--      RPC-call path (e.g. POST /rest/v1/rpc/handle_new_user) that no
--      client should ever have had in the first place.
--   2. RLS-policy predicate functions (is_staff_or_manager, my_role, etc.):
--      first-pass version of this migration revoked these from anon and
--      broke CI -- "permission denied for function is_staff_or_manager" on
--      a plain anonymous SELECT from `lessons`. Root cause: a `create
--      policy ... using (...)` clause calls these functions directly under
--      the QUERYING role's own privileges, not any SECURITY DEFINER
--      context, so anon needs EXECUTE on every predicate referenced by a
--      policy on a table anon can query at all (e.g. `courses`' "published
--      courses readable by all" policy literally is
--      `status = 'published' or is_staff_or_manager()`). Confirmed each of
--      these appears inside an actual `create policy` clause before
--      keeping anon here. Revoked from PUBLIC only; kept for both anon and
--      authenticated.
--   3. Real action RPCs (finalize_my_session, heartbeat, issue_certificate):
--      confirmed NOT referenced inside any policy clause -- genuinely
--      meant to be called directly by a signed-in user only. Revoked from
--      public/anon, kept for authenticated.

-- ---------------------------------------------------------------------------
-- 1. Trigger functions: no direct caller should ever exist.
-- ---------------------------------------------------------------------------
revoke all on function
  audit_certificate_issued(), audit_lesson_completion(), audit_log_immutable(),
  audit_membership_change(), audit_org_status_change(), audit_profile_change(),
  course_application_rate_limit(), enforce_team_size(), enforce_team_slots(),
  guard_discussion_post(), guard_discussion_thread(), guard_invitation(),
  guard_student_id_write(), handle_auto_confirm_user(), handle_new_user(),
  invitation_rate_limit(), log_tournament_result_change(),
  pending_schools_cap(), pending_staff_cap(), team_chat_create(),
  team_chat_rename(), team_member_added(), team_member_removed()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS-policy predicates: anon and authenticated both need these.
-- ---------------------------------------------------------------------------
revoke all on function
  can_access_thread(uuid), can_manage_org(uuid),
  can_read_announcement(uuid, announcement_audience, uuid),
  can_read_message(uuid, timestamptz), can_see_profile(uuid),
  chat_topic_allowed(text), is_active_account(), is_enrolled_in_course(uuid),
  is_hanbee_staff(), is_manager(), is_org_member(uuid), is_org_owner(uuid),
  is_participant_of(uuid), is_staff_or_manager(), is_student_in_my_school(uuid),
  my_org_id(), my_role()
from public;

grant execute on function
  can_access_thread(uuid), can_manage_org(uuid),
  can_read_announcement(uuid, announcement_audience, uuid),
  can_read_message(uuid, timestamptz), can_see_profile(uuid),
  chat_topic_allowed(text), is_active_account(), is_enrolled_in_course(uuid),
  is_hanbee_staff(), is_manager(), is_org_member(uuid), is_org_owner(uuid),
  is_participant_of(uuid), is_staff_or_manager(), is_student_in_my_school(uuid),
  my_org_id(), my_role()
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Real action RPCs: signed-in callers only.
-- ---------------------------------------------------------------------------
revoke all on function finalize_my_session(uuid), heartbeat(uuid), issue_certificate(text)
from public, anon;

grant execute on function finalize_my_session(uuid), heartbeat(uuid), issue_certificate(text)
to authenticated;
