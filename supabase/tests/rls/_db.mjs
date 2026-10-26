import fs from "fs";
import pg from "pg";

// Connects to the live database through the Supabase session pooler.
// Uses SUPABASE_DB_URL when set; otherwise the restricted `hanbee_test` login
// saved in supabase/tests/.env.test by create-test-role.mjs. Never commit either.
// Every test runs inside a transaction that is rolled back.
function urlFromEnvFile() {
  try {
    const raw = fs.readFileSync(new URL("../.env.test", import.meta.url), "utf8");
    return raw.match(/^SUPABASE_DB_URL=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

// When stdout is a pipe (as it is under `node file.mjs` inside CI's
// `test_output="$(node "$test_file")"`), console.log writes are queued
// asynchronously. An uncaught exception kills the process immediately,
// before the queued writes drain, silently dropping every PASS/FAIL line
// printed before the crash. Forcing the handle blocking makes writes
// synchronous so a crash never erases the diagnostic trail that led to it.
try { process.stdout._handle?.setBlocking?.(true); } catch {}

export async function connect() {
  const url = process.env.SUPABASE_DB_URL ?? urlFromEnvFile();
  if (!url) throw new Error("Set SUPABASE_DB_URL, or run create-test-role.mjs to create supabase/tests/.env.test.");
  const host = new URL(url).hostname;
  const ssl = ["localhost", "127.0.0.1", "::1"].includes(host)
    ? false
    : { rejectUnauthorized: false };
  const c = new pg.Client({ connectionString: url, ssl });
  await c.connect();
  return c;
}
