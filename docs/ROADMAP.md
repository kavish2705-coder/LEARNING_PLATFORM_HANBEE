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
