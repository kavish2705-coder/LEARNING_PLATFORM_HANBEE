# Security Review

**Review date:** 2026-11-04
**Review type:** Read-only source review
**Status:** The actionable source finding has a remediation migration and regression test; runtime verification and production/provider checks remain outstanding.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟡 MEDIUM | [supabase/migrations/0094_pool_join_requests.sql](./supabase/migrations/0094_pool_join_requests.sql#L21) | 21 | Team join requests and acceptance/invitation flows do not consistently enforce tournament-access and active-license entitlements. An independent student may be added to a tournament roster without passing the checks applied during team creation. | 9/10 |

### Finding 1 details

The join-request flow checks student/account eligibility but does not consistently require tournament access and an active license. The request-acceptance and invitation-acceptance paths can add a student to `tournament_team_members` without those entitlement checks. The review identified related paths in:

- [supabase/migrations/0094_pool_join_requests.sql](./supabase/migrations/0094_pool_join_requests.sql#L21) — join-request and acceptance flow
- [supabase/migrations/0051_team_invite_expiry.sql](./supabase/migrations/0051_team_invite_expiry.sql#L12) — invitation acceptance flow
- [supabase/migrations/0123_access_requests.sql](./supabase/migrations/0123_access_requests.sql#L330) — team-creation checks that are not consistently applied to the other paths

**Recommended remediation:** enforce tournament-access and active-license requirements for the joining student in every join-request, acceptance, and invitation-acceptance path. Verify the checks are enforced server-side in the database/RPC layer, not only in the UI.

## What this source review could assess

The requested review areas were considered against the repository source, including API/data and payment handling, authentication and authorization/RBAC, access to admin routes, request/form handling, XSS, rate limiting, endpoint protections, CORS and security headers, debug configuration, dependencies, exposed files, and secrets.

The source review reported the finding above. This is **not** evidence that every other area is secure: the review did not return verifiable, complete results for every item in that checklist. No claim is made here that the repository or deployment is vulnerability-free.

## Checks requiring deployment or provider access

These cannot be confirmed from repository source alone and require access to the relevant production systems:

- Which Supabase migrations are applied in production and whether deployed RLS policies, RPC grants, and function permissions match the repository.
- Whether production API and Supabase endpoints enforce HTTPS, including redirects and TLS configuration.
- Effective CORS and security-header behavior at the production host, CDN, and API gateway. The source configures Content Security Policy in report-only mode; the production response headers must be checked separately.
- Production environment values and secret storage, including payment-provider credentials, Supabase service credentials, and `UPI_TEST_MODE`.
- Whether real UPI payments are enabled and whether payment creation, provider confirmation/webhooks, signature verification, idempotency, and settlement reconciliation work securely in the live provider setup. This review did not initiate or verify a payment.
- Production rate limits, monitoring, debug settings, access controls, and dependency/runtime patch levels.

Local environment files were not inspected. A complete secret-exposure check also needs an explicit scan of the relevant Git history and hosting/provider configuration; this report does not certify that no credentials have ever been exposed.

## Suggested next steps

1. Fix and test the entitlement enforcement on all team join and invite acceptance paths.
2. Verify the production Supabase schema, RLS, and RPC grants against the intended migration state.
3. Perform the deployment/provider checks above before enabling or relying on real UPI payments.

## Follow-up review — 2026-11-05

This follow-up assessed the requested transport, credential, authentication,
authorization, input handling, rate limiting, endpoint, CORS, header, debug,
dependency, exposure, and audit controls against repository source. It also
ran `npm --prefix frontend audit --omit=dev`. This review did not inspect
production configuration, local environment values, or deployed services.

### Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🔴 CRITICAL | [frontend/package-lock.json](./frontend/package-lock.json#L1437) | 1437 | `next` is in the vulnerable range reported by npm audit. The advisories include cache poisoning and an unauthenticated RCE in the Image Optimization API when SVG files are used; reachability in this deployment was not assessed. | 9/10 |
| 2 | 🟠 HIGH | [frontend/package-lock.json](./frontend/package-lock.json#L1626) | 1626 | `postcss` is in a vulnerable range; advisories include XSS in CSS stringification and source-map file disclosure. | 9/10 |
| 3 | 🟠 HIGH | [frontend/package-lock.json](./frontend/package-lock.json#L1799) | 1799 | `sharp` is in a vulnerable range due to a vulnerability in its `librsvg` dependency (CVE-2026-96889). | 9/10 |
| 4 | 🟠 HIGH | [frontend/package-lock.json](./frontend/package-lock.json#L1882) | 1882 | `source-map-js` is in a vulnerable range; an advisory reports event-loop denial of service through indexed source-map section offsets. | 9/10 |

The audit reported 4 vulnerabilities total (1 critical, 3 high), and marked
fixes as available. This review records the findings but does not update
dependencies or claim that the vulnerable code paths are reachable.

### Control status

| Control | Status | Evidence and limitations |
|---|---|---|
| HTTPS enforcement | Partial | HSTS is configured in `frontend/next.config.ts`; no HTTP-to-HTTPS redirect was found in the reviewed source. Local Supabase HTTP URLs are for development. Production TLS and redirect behavior are unverified. |
| API paths and user credentials | Partial | Reviewed payment API handlers authenticate callers and check ownership. `/api/env` exposes only `NEXT_PUBLIC_*` values, including the public anon key. Deployed credentials and all API paths were not tested. |
| API key secrecy | Partial | `.env.example` distinguishes public and server-side credentials. Actual deployed secrets and a complete Git-history secret scan were not checked. |
| Environment configuration | Partial | Environment variables are documented; production values and hosting configuration are unavailable. |
| Protected admin routes and authentication | Partial | Dashboard role gating includes client-side checks, with database RLS also present. The deployed migration state and direct API authorization were not verified comprehensively. |
| RBAC and user access | Partial | RLS policies and role checks exist, including self-escalation protections in migration `0016_rls_audit_fixes.sql`. Runtime behavior and deployed policy state were not tested. |
| Form sanitization and XSS | Partial | React text rendering escapes content by default. The reviewed `dangerouslySetInnerHTML` use renders generated QR SVG, not raw user text. Server-side validation coverage was not established for all forms. |
| Rate limiting | Partial | Limits exist for selected features, including AI and course applications; no general API-wide limit was found. |
| Secure endpoints | Partial | Authenticated API and Edge Function checks exist; some public submission endpoints are intentionally unauthenticated. Deployment settings were not verified. |
| CORS | Partial | Edge Functions use an `ALLOWED_ORIGINS` allowlist. Production allowlist values and effective gateway behavior are unknown. |
| Security headers | Partial | HSTS, framing, MIME, and referrer headers are configured. CSP is report-only, and production response headers were not checked. |
| Debug/test mode | Present in source; runtime unknown | UPI test mode refuses production startup when enabled. The production environment value was not inspected. |
| Dependency updates | Missing for reported advisories | npm audit found vulnerable dependency ranges in `next`, `postcss`, `sharp`, and `source-map-js`; fixes were reported available but not applied. |
| Unused packages | Not verified | No unused-dependency analysis was run. |
| Exposed files | Partial | Local `.env` and `.env.local` paths are ignored and only `.env.example` was found in the queried Git path history. Public deployment/static-file exposure was not inspected. |
| Secrets in Git | Not verified | The path query was not a comprehensive secret scan across all history, branches, and remotes. Local environment values were not read. |
| Security audit tooling | Partial | CI runs RLS tests. No dependency or secret-scanning workflow/tool was found in the reviewed source. |

No application-code, API, or schema changes were made as part of this review.
No breaking changes were introduced.

## Follow-up — 2026-11-06 dependency audit

The production dependency audit reproduced the four advisories recorded above.
`npm audit fix` updated Next.js to 15.5.29, sharp to 0.35.5, and
source-map-js to 1.2.2. A root npm override pins the transitive PostCSS
dependency to 8.5.32, avoiding the breaking Next.js 16 upgrade suggested by
`npm audit fix --force`. A subsequent full `npm audit` reported zero
vulnerabilities. The frontend production build and TypeScript check passed.

This was a dependency remediation and targeted validation, not a complete
repository-wide security re-review. The security-review agent reported no
vulnerabilities in the changes it reviewed, but did not return repository-wide
findings. The previously documented medium-severity tournament team entitlement
finding has a source remediation in
[`supabase/migrations/0125_team_join_entitlements.sql`](./supabase/migrations/0125_team_join_entitlements.sql).
The migration gates new join requests, captain acceptance against the
requester's entitlements, and invitation acceptance against the invitee's
entitlements. A focused regression suite was added at
[`supabase/tests/rls/0125_team_join_entitlements.mjs`](./supabase/tests/rls/0125_team_join_entitlements.mjs),
but it could not be executed because Supabase CLI and Docker are unavailable.
Treat this finding as **patched in source, runtime verification pending**;
production migration state was not checked. No staging-only B data or
local-only dummy data was treated as a production exposure. Production
configuration, secrets, and deployed database policies remain outside this
check.
