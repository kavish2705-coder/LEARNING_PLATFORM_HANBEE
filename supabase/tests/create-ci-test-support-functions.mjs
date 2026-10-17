// CI-only: creates the two test_support_* helper functions every RLS suite
// depends on (test_support_signup, test_support_banned), without the
// restricted hanbee_test role create-test-role.mjs also sets up — pointless
// on CI's disposable local database, where the superuser connection is
// already being used for everything. See create-test-role.mjs for the real
// (role-restricted) version used against an actual staging/owner database.
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error("Set SUPABASE_DB_URL.");

const host = new URL(url).hostname;
const ssl = ["localhost", "127.0.0.1", "::1"].includes(host) ? false : { rejectUnauthorized: false };
const c = new pg.Client({ connectionString: url, ssl });
await c.connect();
try {
  await c.query(`
    create or replace function public.test_support_signup(p_id uuid, p_email text, p_meta jsonb) returns void as $$
      insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, p_meta, now(), now());
    $$ language sql security definer set search_path = public, auth`);
  await c.query(`
    create or replace function public.test_support_banned(p_id uuid) returns boolean as $$
      select banned_until is not null from auth.users where id = p_id;
    $$ language sql security definer set search_path = public, auth`);
  console.log("test_support_signup/test_support_banned ready.");
} finally {
  await c.end();
}
