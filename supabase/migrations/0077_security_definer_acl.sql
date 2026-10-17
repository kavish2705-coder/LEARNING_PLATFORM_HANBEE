-- S12 backend audit: six SECURITY DEFINER functions never had their PUBLIC
-- execute grant revoked, unlike every other SECURITY DEFINER function in this
-- project (which all follow the revoke-all-then-grant-authenticated pattern
-- established in 0024/0037/0039/0074). Each function checks caller
-- permissions internally via auth.uid(), so this is an ACL-hardening gap, not
-- a demonstrated bypass — tightening it to match the rest of the codebase.

revoke all on function submit_assessment(uuid, uuid, jsonb) from public, anon;
grant execute on function submit_assessment(uuid, uuid, jsonb) to authenticated;

revoke all on function verify_assessment_submission(uuid) from public, anon;
grant execute on function verify_assessment_submission(uuid) to authenticated;

revoke all on function mark_notification_read(uuid) from public, anon;
grant execute on function mark_notification_read(uuid) to authenticated;

revoke all on function mark_all_notifications_read() from public, anon;
grant execute on function mark_all_notifications_read() to authenticated;

revoke all on function unread_notification_count() from public, anon;
grant execute on function unread_notification_count() to authenticated;

-- A trigger function, never meant to be called directly by a client — no
-- role needs execute on it at all, only the trigger mechanism itself.
revoke all on function notify_assessment_submission() from public, anon, authenticated;
