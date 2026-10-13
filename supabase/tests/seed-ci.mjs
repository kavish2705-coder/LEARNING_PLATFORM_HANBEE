import pg from "pg";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.SUPABASE_DB_URL;

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_DB_URL are required.");
}

// Only one manager can ever exist (profiles_single_manager_idx, migration
// 0048) and seed.mjs's morgan@hanbeelms.edu already claims that one-time
// slot, so this only seeds a second staff identity, not a second manager.
const testUsers = [{ email: "info@hanbee.in", fullName: "CI Hanbee Staff", role: "staff" }];

const db = new pg.Client({
  connectionString: databaseUrl,
  ssl: ["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)
    ? false
    : { rejectUnauthorized: false },
});

try {
  await db.connect();

  for (const user of testUsers) {
    // handle_new_user only allows one manager ever (the one-time bootstrap,
    // already claimed by seed.mjs's morgan@hanbeelms.edu) and has no invite
    // path for role 'manager' at all — so signing up with role: "manager"
    // here would hit the same invite-only fallback seed.mjs's student
    // signup used to hit. Sign up as 'staff' (always allowed) and patch the
    // real role via direct SQL below instead, same as this script already
    // does for approved/account_status.
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        password: randomUUID(),
        email_confirm: true,
        user_metadata: { full_name: user.fullName, role: "staff" },
      }),
    });

    if (!response.ok) {
      throw new Error(`Creating CI identity ${user.email} failed with HTTP ${response.status}.`);
    }

    const result = await db.query(
      `update public.profiles
       set role = $2, approved = true, account_status = 'active'
       where lower(email) = lower($1)`,
      [user.email, user.role],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Expected exactly one profile row for CI identity ${user.email}; updated ${result.rowCount}.`);
    }
  }
} finally {
  await db.end();
}
