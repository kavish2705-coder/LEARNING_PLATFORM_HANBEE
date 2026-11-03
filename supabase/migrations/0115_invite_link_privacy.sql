-- Reported live: independent-student and school-student signup links put
-- the invitee's full name and email in the URL in plain text, e.g.
-- /signup?invite_token=...&email=someone@example.com&full_name=Someone --
-- anyone who sees the link (forwarded in chat, logged in a server access
-- log, sitting in browser history) can read that PII straight off it, even
-- though none of it is actually needed there: handle_new_user() already
-- validates the signup against the invitation row's own stored
-- email/username by token, never trusts the URL's email/full_name.
--
-- Those params exist purely so the signup FORM can pre-fill itself. This
-- adds a token-gated preview so the frontend can fetch the same name/email
-- server-side instead of carrying it in the URL. Safe because the
-- invite_token is already the real secret -- it already grants account
-- creation outright, so letting it also unlock a read-only preview of the
-- same invitee's name/email adds no new exposure. Unauthenticated
-- (anon), since this must work before the visitor has an account.

create or replace function invite_preview(p_token text)
returns jsonb as $$
declare
  inv invitations;
begin
  select * into inv from invitations
  where token = p_token and not accepted and revoked_at is null and expires_at > now();
  if inv.id is null then
    raise exception 'This invitation is invalid or has expired';
  end if;
  return jsonb_build_object('full_name', inv.full_name, 'email', inv.email);
end;
$$ language plpgsql stable security definer set search_path = public;

revoke all on function invite_preview(text) from public;
grant execute on function invite_preview(text) to anon, authenticated;
