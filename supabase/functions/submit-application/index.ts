// Supabase Edge Function (Deno runtime) — verified course application submit.
//
// S7 (docs/SECURITY_PLAN.md): course_applications' insert policy is
// "anyone (including anonymous) can submit an application" with check(true) —
// wide open, no CAPTCHA. Supabase's own built-in CAPTCHA setting only guards
// Auth sign-in/sign-up, not a plain table insert, so there is no dashboard
// toggle for this. This function verifies a Cloudflare Turnstile token
// server-side, then inserts with the service-role key.
//
// IMPORTANT: this does not replace the existing RLS insert policy on
// course_applications (0002_rls.sql) or the rate-limit trigger
// (0074_course_application_rate_limit.sql) — both still apply to any insert,
// including this function's. Do NOT tighten that RLS policy to block direct
// anonymous inserts until the frontend's /apply form is actually switched to
// call this function instead of inserting directly — until then, locking down
// the policy would break the live apply flow.

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

const MAX_FIELD_CHARS = 500;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const normalizedOrigin = origin?.replace(/\/$/, "") ?? null;
  const respond = (body: unknown, status = 200) => json(body, status, normalizedOrigin, allowedOrigins);

  if (allowedOrigins.length === 0) {
    return respond({ error: "Application submission isn't configured yet." }, 500);
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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey || !turnstileSecret) {
    return respond({ error: "Application submission isn't configured yet." }, 500);
  }

  let body: {
    full_name?: string;
    email?: string;
    phone?: string;
    message?: string;
    course_title?: string;
    turnstile_token?: string;
  };
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid request body." }, 400);
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const courseTitle = typeof body.course_title === "string" ? body.course_title.trim() : "";
  const turnstileToken = typeof body.turnstile_token === "string" ? body.turnstile_token : "";

  if (!fullName || !email || !courseTitle) {
    return respond({ error: "Full name, email and course title are required." }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return respond({ error: "Please enter a valid email address." }, 400);
  }
  if ([fullName, email, phone, message, courseTitle].some((v) => v.length > MAX_FIELD_CHARS)) {
    return respond({ error: `Each field must be under ${MAX_FIELD_CHARS} characters.` }, 400);
  }
  if (!turnstileToken) {
    return respond({ error: "CAPTCHA verification is required." }, 400);
  }

  // Verify the Turnstile token server-side. Never trust a client's claim
  // that a CAPTCHA passed.
  const remoteIp = req.headers.get("CF-Connecting-IP") ?? req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  try {
    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: turnstileToken,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    if (!verifyResponse.ok) {
      return respond({ error: "Couldn't verify the CAPTCHA. Please try again shortly." }, 502);
    }
    const verifyData = await verifyResponse.json();
    if (!verifyData?.success) {
      return respond({ error: "CAPTCHA verification failed. Please try again." }, 400);
    }
  } catch {
    return respond({ error: "Couldn't verify the CAPTCHA. Please try again shortly." }, 502);
  }

  // Insert with the service-role key. The existing RLS policy and the
  // course_application_rate_limit trigger (0074) still apply to this insert
  // exactly as they would to a direct client insert — triggers are not
  // bypassed by the service role, only RLS is.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  try {
    const { error: insertError } = await adminClient.from("course_applications").insert({
      full_name: fullName,
      email,
      phone,
      message,
      course_title: courseTitle,
    });

    if (insertError) {
      const tooMany = /too many applications/i.test(insertError.message);
      return respond(
        { error: tooMany ? insertError.message : "Something went wrong submitting your application. Please try again." },
        tooMany ? 429 : 500,
      );
    }
  } catch {
    return respond({ error: "Something went wrong submitting your application. Please try again." }, 500);
  }

  return respond({ ok: true });
});
