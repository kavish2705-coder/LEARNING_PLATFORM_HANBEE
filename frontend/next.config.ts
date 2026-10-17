import type { NextConfig } from "next";

// S13 (docs/SECURITY_PLAN.md): security headers. CSP is Report-Only for now —
// lesson "notes" iframes point at staff-chosen URLs (same-origin or external),
// so frame-src/frame-ancestors can't be fully locked down without breaking
// that feature, and this repo has no way to browser-test the full app
// against a strict CSP before it ships. Watch the browser console for
// csp-report violations, then promote to Content-Security-Policy (enforced)
// once it's been observed clean in real use. script-src intentionally omits
// 'unsafe-eval' even though this header also applies in dev (Next.js HMR
// needing eval there is harmless under Report-Only — it only logs, it
// never blocks — so there's no reason to weaken the policy this reports on).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://uthvqsnjqrvjqhfypamo.supabase.co wss://uthvqsnjqrvjqhfypamo.supabase.co https://challenges.cloudflare.com",
  "frame-src 'self' https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
