// Supabase Edge Function (Deno runtime) — lets a signed-in account add or
// change its own email address, without going through Supabase Auth's
// normal "secure email change" flow (which sends a confirmation link to
// the new address — undeliverable, since this project has no working
// outbound email / no verified sending domain yet).
//
// Uses the service-role Admin API (admin.updateUserById with
// email_confirm: true) instead: an admin-initiated email change completes
// immediately, no confirmation email involved. The caller can only ever
// change THEIR OWN email (verified via their own JWT) — this has no
// broader admin authority than that.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200, origin: string | null = null, allowedOrigins: string[] = []) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "authorization, x-client-info, apikey, content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function trySupabase<T>(request: PromiseLike<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const normalizedOrigin = origin?.replace(/\/$/, "") ?? null;
  const respond = (body: unknown, status = 200) => json(body, status, normalizedOrigin, allowedOrigins);

  if (allowedOrigins.length === 0) {
    return respond({ error: "This feature isn't configured yet." }, 500);
  }
  if (normalizedOrigin && !allowedOrigins.includes(normalizedOrigin)) {
    return respond({ error: "This origin is not allowed." }, 403);
  }
  if (req.method === "OPTIONS") {
    const headers = new Headers({ Vary: "Origin" });
    if (normalizedOrigin) {
      headers.set("Access-Control-Allow-Origin", normalizedOrigin);
      headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    }
    return new Response("ok", { headers });
  }
  if (req.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond({ error: "This feature isn't configured yet." }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const authResult = await trySupabase(authClient.auth.getUser());
  if (!authResult) {
    return respond({ error: "Authentication is temporarily unavailable. Please try again." }, 503);
  }
  const { data: { user }, error: authError } = authResult;
  if (authError || !user) {
    return respond({ error: "You must be signed in to do this." }, 401);
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return respond({ error: "Enter a valid email address." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const existingResult = await trySupabase(
    adminClient.from("profiles").select("id").ilike("email", email).neq("id", user.id).maybeSingle(),
  );
  if (existingResult?.data) {
    return respond({ error: "An account with this email already exists." }, 409);
  }

  const updateResult = await trySupabase(
    adminClient.auth.admin.updateUserById(user.id, { email, email_confirm: true }),
  );
  if (!updateResult || updateResult.error) {
    return respond({ error: "We couldn't update your email. Please try again." }, 500);
  }

  return respond({ email });
});
