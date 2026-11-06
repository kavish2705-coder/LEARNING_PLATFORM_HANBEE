# Database security tests

Each file in `rls/` logs in as real roles (student, school staff, Hanbee staff, manager, anonymous) using `set local role authenticated` and JWT claims, tries things each role must and must not be able to do, and prints PASS or FAIL. Everything runs inside a transaction that is **rolled back**, so no data is left behind.

## Run against a fresh local Supabase stack

The GitHub Actions workflow starts a fresh local Supabase stack, applies every
checked-in migration, seeds the demo course and the identities required by the
RLS suites, then runs each suite. To reproduce that workflow locally, install
Docker and the Supabase CLI, then from the repository root run:

Schema coverage requires RLS on every public table. Tables used only by
server-side service-role integrations (AI usage, UPI payment processing, and
tournament race recording) are expected to have no policies; coverage checks
that these tables exist and remain policy-free.

```powershell
npm ci --prefix supabase/tests
npm install --prefix supabase --no-save --package-lock=false
supabase start
supabase db reset --local
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`
from `supabase status --output env`, then seed and test:

```powershell
npm --prefix supabase run seed
node supabase/tests/seed-ci.mjs
node supabase/tests/rls/schema_coverage.mjs
```

Run the RLS suites from PowerShell:

```powershell
Get-ChildItem supabase/tests/rls/0*.mjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

The workflow uses this disposable local stack and does not need GitHub Actions
secrets or access to the shared staging/production databases.

One-time setup (from this folder, once: `npm install`), then create the restricted test login so the owner password is not needed for tests:

```
SUPABASE_OWNER_DB_URL=<owner connection string> node create-test-role.mjs
```

This writes the restricted connection string to the git-ignored `.env.test`; the suites use it automatically. Use `SUPABASE_OWNER_DB_URL` only for migrations (`apply-migration.mjs`) and creating that login. Backups: `node backup.mjs export` and `node backup.mjs verify` (see `docs/RECOVERY.md`).

Run a suite (set `SUPABASE_DB_URL` yourself only if you do not use `.env.test`):

```
SUPABASE_DB_URL="postgresql://postgres.<project-ref>:<url-encoded-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" node rls/0028_tenant_scoping.mjs
```

Never commit the URL. Use the session pooler (the direct host is IPv6 only). Encode special characters in the password (`@` becomes `%40`).

| File | Proves |
|---|---|
| `0023_organizations.mjs` | Role helpers, suspension removes staff powers, schools and membership are read-only for clients, one active school per student |
| `0024_invite_only_signup.mjs` | Strangers cannot sign up, school registration, first verifier wins, invites (bulk, revoke, expiry, co-staff, solo), audit log cannot be forged |
| `0016_0021_regressions.mjs` | Role self-promotion, attendance/certificate/time-entry forgery, server-checked lesson completion, gated content, scoped profiles |
| `0026_chat_v2.mjs` | Who may message whom (27 allowed and 27 refused pairs), school groups, add/remove rules, unread counts, rate limit, forged system messages |
| `0027_tournaments_teams_applications.mjs` | Tournament visibility, teams, payment claims can never be client-set, leaderboard, course applications and enrollment; tournament create/update with optional entry fees, including calls that omit them; solo-entry access and license gates |
| `0039_team_formation.mjs` | School team slots, configurable team size, tournament-access and active-license gates on the division-aware RPC, student captains and invitations, same-school membership, proposal/return/approval flow, team chat synchronization, and role-scoped statistics |
| `0093_pool_team_formation.mjs` | Independent pool teams, solo entries, invitations, school-team compatibility, and team chat; fixtures include required tournament and license entitlements |
| `0094_pool_join_requests.mjs` | Pool join requests, captain decisions, capacity and duplicate protections, and entitlement enforcement |
| `0096_pool_queue_labeling.mjs` | Labels school vs independent entries and rejection notifications; fixtures include required tournament and license entitlements |
| `0036_reviews_certificates.mjs` | Lesson reviews and certificates lists: who may see which |
| `0037_backend_hardening.mjs` | Join link rotation, append-only audit log, masked certificate name, chat history and profile limits, flood caps |
| `0029_overviews_status_solo.mjs` | Dashboard data functions and who may call them, suspend/close/revoke, solo conversion, joining a new school |
| `0028_tenant_scoping.mjs` | School A never sees school B: announcements, calendar, enrollments, discussions, profiles; revocation |
| `0126_team_join_entitlements.mjs` | Tournament-access and active-license checks for join requests, join-request acceptance, and invitation acceptance |

They rely on these live accounts existing: `ava@student.edu` (student with an enrollment), `jamie@hanbeelms.edu` (Hanbee staff), `morgan@hanbeelms.edu` (manager). Add a test file for every new migration, and rerun all of them after any policy change. To apply a migration: `SUPABASE_DB_URL=... node apply-migration.mjs ../migrations/<file>.sql` (all or nothing). To run everything: `for f in rls/0*.mjs; do node $f | tail -1; done`.
