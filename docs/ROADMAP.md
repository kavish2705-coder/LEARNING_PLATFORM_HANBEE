# Project Roadmap

Status snapshot: 2026-11-04. This file is the shared record for active work,
technical decisions, and completed agent assignments. No sprint owner or
deadline is currently recorded in the source planning notes.

## Active Sprint & Current Roadmap

| Status | Task | Notes / source |
|---|---|---|
| In progress (as recorded) | Close the loop for independent-student leads: landing form, staff review, invite creation, and manual WhatsApp sharing | Phase A is described as in progress in [Pending Tasks](PENDING_TASKS.md). Confirm the full lifecycle before marking complete. |
| To review | Complete a full school-staff lifecycle walkthrough | Previously spot-checked only; listed in [Pending Tasks](PENDING_TASKS.md). |
| To review | Independently review `chat/page.tsx` and `NotificationBell.tsx` | The files were modified outside the cited session and have not yet been independently reviewed; see [Pending Tasks](PENDING_TASKS.md). |
| Deferred | Automate lead-approval email/WhatsApp and configure the public auth domain | Phase B depends on a real domain and paid email; see [Pending Tasks](PENDING_TASKS.md). |

This is a status snapshot from existing project notes, not a new commitment or
claim that the listed work has been verified.

## Decision Log (ADRs)

### ADR-001 — Next.js App Router with Supabase as the backend

- **Status:** Accepted (existing architecture, recorded 2026-11-04).
- The frontend is a Next.js App Router application under `frontend/`.
  Supabase is the authoritative authentication and database backend; schema
  changes are tracked as migrations under `supabase/migrations/`.
- Authorization is enforced with PostgreSQL RLS policies and functions.
  Browser code uses only public credentials; privileged service-role
  credentials must remain server-side and out of source control.
- **Source:** [Supabase setup](../supabase/README.md).

### ADR-002 — Feature-local routes and CSS Modules

- **Status:** Accepted (existing conventions, recorded 2026-11-04).
- App Router pages and handlers live under `frontend/src/app/`; reusable
  components and integrations live under `frontend/src/components/` and
  `frontend/src/lib/`. Styling follows the existing CSS Module conventions.
- Keep components server-rendered by default and opt into client components
  only for browser-side interactivity.

### ADR-003 — Shared agent memory and completion logging

- **Status:** Accepted (established 2026-11-04).
- `AGENTS.md` is the workspace-wide source of agent guidance. All agents read
  it and this roadmap before assignments, then record completion in
  **Session Change Logs**; decisions and breaking changes are recorded here as
  well.

## Session Change Logs

| Date | Assignment | Outcome and key modifications |
|---|---|---|
| 2026-11-04 | Initialize the workspace multi-agent system | Added root agent guidance, this roadmap with a baseline roadmap/ADR snapshot, and three focused custom agent roles in `.github/agents/`. No application code, database schema, API contract, or existing user changes were modified; no breaking changes introduced. |
| 2026-11-05 | Review requested security controls | Added follow-up findings and control-status summary to [Security Review](../SECURITY-REVIEW.md), including four npm audit findings (one critical, three high) and deployment-verification limitations. No application code, schema, or API contracts changed; no breaking changes introduced. |
| 2026-11-05 | Assess current payment process vs. Cashfree | Reviewed current UPI QR, bank-alert/UTR matching, and manual staff-review paths. Recommended retaining the existing flow only for a low-volume, supervised pilot and moving to a payment gateway such as Cashfree before relying on payments for production-scale enrollment; no payment behavior, API, or schema changed, and no breaking changes introduced. |
| 2026-11-05 | Plan SEO and Google Search setup | Inspected current App Router metadata, public routes/assets, and deployment notes. Proposed a phased SEO setup; no application code, schema, or API contracts changed, and no breaking changes introduced. The production canonical domain and DNS ownership still need confirmation. |
| 2026-11-06 | Refresh landing-page copy | Rewrote public landing-page headings, race descriptions, signup cards, FAQ, footer labels, and independent-student application copy in a warmer, more conversational voice. Preserved routes, behavior, rules, and technical details; no architectural, API, or schema changes and no breaking changes introduced. |
| 2026-11-06 | Remediate dependency advisories and team-entitlement gap | Updated Next.js, sharp, and source-map-js; pinned transitive PostCSS to a patched compatible release. Added migration `0126_team_join_entitlements.sql` and regression coverage for tournament access and active license checks on pool requests and team invitation acceptance. Full `npm audit`, frontend build, and TypeScript check pass; the RLS suite cannot run without Supabase CLI/Docker, so runtime verification and production migration state remain unconfirmed. Repository-wide review is incomplete. No production data was examined; staging-only B and local-only dummy data were excluded. No API changes or breaking changes; database schema behavior changes only by enforcing existing entitlement requirements consistently. |
| 2026-11-06 | Resolve duplicate Supabase migration version | Renumbered the entitlement migration and its regression test to `0126`, because `0125` was already assigned to `0125_chat_group_admin_controls.sql`; migration replay failed on the duplicate primary key in `supabase_migrations.schema_migrations`. |
| 2026-11-06 | Diagnose and fix the RLS workflow coverage failure | The run on `0c6e556` applied migrations and seeded its disposable local database successfully, then failed schema coverage because the three server-only UPI tables intentionally have RLS enabled and no policies. Added those tables to the explicit private-table allowlist and made coverage reject policies on all allowlisted tables; documented the invariant. The `/usr/bin/git` exit-128 message is a separate checkout cleanup warning: the committed `.worktrees/independent-student-pool` gitlink has no `.gitmodules` mapping. No database/API behavior changed, no production data was accessed, and no breaking changes were introduced. Local Supabase execution is unavailable because Docker and the Supabase CLI are not installed. |
| 2026-11-06 | Fix tournament function overloads found in RLS run | Added migration `0127_fix_tournament_function_overloads.sql` to remove obsolete 5- and 7-argument tournament overloads that conflicted with the entry-fee versions’ defaulted final parameters, and explicitly granted the current 6-/8-argument functions only to authenticated callers. Improved the RLS test failure message and documented coverage. Calls omitting the optional fee remain supported; no API behavior change intended and no breaking change introduced. |
| 2026-11-06 | Repair solo tournament RLS test entitlements | Updated the tournament RLS suite to assert that missing tournament access and missing Driver License each block solo entry, then grant both within the rollback-only fixture before testing the eligible flow. This fixes cascading solo team, payment, verification, and audit-count failures without weakening production authorization. No schema/API behavior change and no breaking change introduced. |
| 2026-11-06 | Fix tournament RLS entitlement fixtures and checkout cleanup | Updated `0039_team_formation.mjs`, `0093_pool_team_formation.mjs`, and `0096_pool_queue_labeling.mjs` to test or provide the tournament-access and active-license entitlements required by entry/team-invitation RPCs. The observed RLS failure was missing test fixture state; the repeated `/usr/bin/git` warning came from a committed `.worktrees/independent-student-pool` gitlink with no `.gitmodules` mapping. Removed that invalid gitlink from the parent repository index while preserving the local worktree. No production authorization changed and no breaking API/schema change introduced. |
| 2026-11-06 | Clarify safe Supabase migration application | Documented that migration files are ordered one-time changes and should be applied through `supabase db push`, not pasted or rerun in SQL Editor after application. The reported `tournament_status already exists` error is from rerunning migration `0027`, not from `0039_team_formation.sql`; no schema or runtime behavior changed, and no breaking change introduced. |
| 2026-11-06 | Consolidate school-team RPC entitlement checks | Added migration `0128_student_start_team_entitlements.sql` to remove the stale two-argument/three-argument `student_start_team` overload mismatch and enforce tournament access and active Driver License checks on the division-aware RPC used by the frontend. Updated the RLS test to invoke that exact API signature and print the returned row on failure. Two-argument callers remain compatible through the default division; no intended breaking change. |
| 2026-11-06 | Fix Supabase RLS workflow startup conflicts | The latest run applied every migration but could not start the unused Mailpit/Inbucket email-testing container because runner port `54324` was occupied. Updated CI to exclude Mailpit; the RLS tests use the database/Auth APIs and do not send email. Removed the two remaining unconfigured `.worktrees` gitlinks from the parent index without deleting their local worktree directories, preventing checkout-cleanup warnings. No application/schema behavior changed and no breaking changes introduced. |
| 2026-11-06 | Repair committed pool join race-test entitlements | The RLS workflow now starts and reaches suite `0094`; its later committed concurrency fixture created fresh independent students but omitted tournament access and active Driver Licenses. Provisioned both entitlements for the captain and candidates before invoking `start_pool_team`, preserving production gates and the race test. No production authorization/schema change or breaking change introduced. |
