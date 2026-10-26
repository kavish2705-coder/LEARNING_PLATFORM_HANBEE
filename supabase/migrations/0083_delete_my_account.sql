-- Student data deletion (docs/SECURITY_PLAN.md's closing note: export was
-- done in 0081, deletion was deferred pending a product decision).
-- Decision: anonymize, not hard-delete. A hard delete would cascade into
-- or orphan data that genuinely belongs to OTHER people and to the
-- school/platform's own records, not just the requesting account:
--   - group chat messages sit in the same thread as every other member;
--     deleting them erases other people's conversation history
--   - tournament_team_members / tournament_results are the TEAM's and the
--     SCHOOL's historical record, not just this one student's
--   - certificates and audit_log entries are institutional records a
--     school may need to keep after a student leaves
--   - enrollments/lesson_completions feed course-level stats other staff
--     rely on (avg_completion_pct etc.)
-- Anonymizing (clear PII, keep the row and every relationship intact,
-- same approach Slack/Discord/GitHub use for account deletion) avoids all
-- of that while still removing every personally identifying field.

create or replace function delete_my_account() returns void as $$
declare
  me uuid := auth.uid();
  my_profile profiles;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into my_profile from profiles where id = me;
  if my_profile.id is null then raise exception 'account not found'; end if;
  if my_profile.role = 'manager' then
    raise exception 'The sole manager account cannot self-delete. Contact another Hanbee staff member or a database administrator.';
  end if;
  if my_profile.account_status = 'revoked' then
    raise exception 'This account has already been deleted.';
  end if;

  -- End any active school membership first. The existing
  -- trg_membership_chat trigger (0026) already handles removing the
  -- member from their school's group chat and posting the "left" system
  -- message when a membership row's status changes to 'ended' -- no new
  -- chat-cleanup logic is needed here.
  update organization_members
  set status = 'ended', ended_at = now()
  where user_id = me and status = 'active';

  -- Clear every personally identifying field; keep the row itself (and
  -- every row that references it) intact. email stays unique-constrained,
  -- so each anonymized account gets a distinct placeholder rather than a
  -- shared literal.
  perform set_config('app.trusted_profile_write', 'true', true);
  update profiles
  set
    full_name = 'Deleted User',
    email = 'deleted-' || me::text || '@deleted.hanbee.local',
    avatar_url = null,
    student_id = null,
    preferred_team_name = null,
    account_status = 'revoked'
  where id = me;
  perform set_config('app.trusted_profile_write', '', true);

  -- Mirror set_account_status's established pattern (0029): ban the real
  -- auth.users row so the credentials can never be used again, and kill
  -- any session that's still live right now.
  update auth.users
  set banned_until = now() + interval '100 years'
  where id = me;
  delete from auth.sessions where user_id = me;

  perform log_audit('delete_my_account', 'profile', me, jsonb_build_object('role', my_profile.role));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
