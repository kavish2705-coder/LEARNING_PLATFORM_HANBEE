-- S7 (docs/SECURITY_PLAN.md): course_applications has no login and no cap —
-- "anyone (including anonymous) can submit an application" (0002_rls.sql) is
-- wide open with no rate limit at all. Follows the same shape as
-- invitation_rate_limit and pending_schools_cap/pending_staff_cap in
-- 0037_backend_hardening.sql: a global flood cap plus a per-email cap, since
-- an anonymous submitter has no auth.uid() to key a per-user limit on.
--
-- CAPTCHA (the other half of S7) needs a frontend widget plus a Supabase Auth
-- CAPTCHA provider configured in the dashboard — out of scope for a SQL
-- migration, left for whoever owns the frontend/apply page.

create or replace function course_application_rate_limit() returns trigger as $$
begin
  if (select count(*) from course_applications where submitted_at > now() - interval '1 hour') >= 100 then
    raise exception 'too many applications submitted recently; please try again later';
  end if;
  if (select count(*) from course_applications
      where lower(email) = lower(new.email) and submitted_at > now() - interval '1 day') >= 5 then
    raise exception 'too many applications from this email today; please try again tomorrow';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_course_application_rate_limit before insert on course_applications
  for each row execute function course_application_rate_limit();
