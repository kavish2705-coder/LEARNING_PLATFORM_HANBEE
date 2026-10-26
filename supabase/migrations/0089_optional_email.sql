-- Makes profiles.email genuinely optional (it was `not null unique` since
-- 0001), and gives any account a way to add/change its real email without
-- Supabase's normal "secure email change" flow -- which sends a
-- confirmation link to the new address, and this project has no working
-- outbound email (no SMTP/Resend domain configured; see the invite-email
-- discussion this session). The update-my-email Edge Function uses the
-- service-role Admin API instead (same trust pattern as
-- create-student-accounts): an ADMIN-initiated email change doesn't go
-- through GoTrue's user-initiated confirmation flow, so it completes
-- immediately with no email ever sent.

alter table profiles alter column email drop not null;
alter table profiles drop constraint if exists profiles_email_key;
create unique index profiles_email_unique on profiles (lower(email)) where email is not null;

-- Keeps profiles.email in sync whenever auth.users.email changes, from
-- WHATEVER path changes it (the Edge Function today; any future path
-- later) -- rather than every caller having to remember to update both.
create or replace function sync_profile_email()
returns trigger as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function sync_profile_email();
