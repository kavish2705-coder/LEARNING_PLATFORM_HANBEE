# Independent Student Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Hanbee staff create independent ("road-kid") student accounts by invite, give independents a shared pool with global chat, let them form teams with each other (captain-invite or student-join-request), and reuse the existing tournament submit/payment/verify lifecycle — without changing any school-team behavior.

**Architecture:** New SQL migrations (0091+) add: a staff-only independent-invite path, a pool-team-creation function (replacing `create_solo_team` for new independents), a `team_join_requests` table mirroring `team_invitations`, additive `org_id is null` branches on `invite_to_team`/`leave_team`/`team_chat_create`, and a new student↔student branch in `chat_relation_dir`. Frontend adds a staff creation screen, a pool page (roster + global chat + team chat), and fixes the `MAX_TEAM_SIZE` hardcode. Every shared function keeps its existing `org_id is not null` (school) branch byte-for-byte; all new behavior lives in new `org_id is null` branches or new functions.

**Tech Stack:** Supabase/Postgres (SQL migrations, SECURITY DEFINER RPCs, RLS), Next.js/TypeScript frontend, existing `teamFormationApi.ts` RPC-wrapper pattern.

**Spec:** `docs/superpowers/specs/2026-10-28-independent-student-pool-design.md`

## Global Constraints

- Must not change school-team RLS, functions, or lifecycle (spec Constraints).
- No new "organization" entity for independents; `org_id` stays `null` (spec Non-goals).
- No staff-side team-builder UI; staff never assembles/edits a pool team's roster (spec Goals).
- Team size cap is `tournaments.team_size` (2–5, maximum not exact, per `0090`) — do not hardcode 5 anywhere new.
- No guardian-consent fields or storage (handled out-of-band by staff, spec §1).
- Payment stays team-level (`payment_declared`/`verified`) for this phase — no per-member payment tracking (spec §5).
- A student is a member of at most one non-withdrawn pool team per tournament at any time (spec §2) — enforced by a single shared helper, not copy-pasted checks.
- Chat access to a team's private chat must be a live permission check tied to current `tournament_team_members` rows, granted/revoked in the same transaction as membership changes (spec §2) — never a cached or direct `conversation_participants` write from new code.
- Any row-locking on `tournament_teams` for membership changes must use `select ... for update`, mirroring `invite_to_team`/`respond_team_invitation` (spec Constraints).

## Review Focus

- A student with two pending join requests on different teams gets accepted into one — does the other request linger forever, or auto-cancel? (spec §2 requires tournament-wide cancel of a student's other pendings on accept)
- A join request accepted at the exact moment the team hits `team_size` or transitions to `applied` — does it still get in? (spec Constraints requires row-locking to prevent this)
- A deactivated independent account — does it still show up in pool chat/roster? (spec §2 requires `account_status='active'` filtering on the new chat branch)
- A school student whose org membership lapses — do they transiently appear as "independent" and gain pool access? (spec §1 requires pool membership gated on a staff-controlled signal, not bare `org_id is null`)
- A captain leaves a pool team mid-`proposed` (submitted, not yet `applied`) — can they still leave, and does a school team's leave behavior at the same status stay blocked exactly as today? (spec §4 / impact table — the two branches must diverge correctly)

---

## File Structure

- `supabase/migrations/0091_pool_schema.sql` — new tables/columns: `team_join_requests`, pool-membership staff-controlled flag safeguard, shared "one active team per tournament" helper.
- `supabase/migrations/0092_pool_account_creation.sql` — staff-only independent invite issuance.
- `supabase/migrations/0093_pool_team_formation.sql` — pool-team-creation function, `invite_to_team`/`leave_team`/`team_chat_create` pool branches.
- `supabase/migrations/0094_pool_join_requests.sql` — `request_join_team`/`respond_join_request` functions.
- `supabase/migrations/0095_pool_chat.sql` — `chat_relation_dir` student↔student branch, global pool chat singleton creation, `chat_contacts()` pagination guard.
- `supabase/migrations/0096_pool_queue_labeling.sql` — `tournament_application_queue` "Independent Entry" label; rejection notification wiring verification.
- `frontend/src/lib/poolApi.ts` — new RPC wrappers (mirrors `teamFormationApi.ts` pattern): `createIndependentInvite`, `startPoolTeam`, `invitePoolStudent`, `requestJoinPoolTeam`, `respondJoinRequest`, `fetchPool`, `fetchPoolChat`.
- `frontend/src/app/dashboard/components/hanbee/CreateIndependentStudent.tsx` — staff-only account creation screen.
- `frontend/src/app/dashboard/components/pool/PoolPage.tsx` — roster + global chat + team chat + invite/join-request UI.
- Modify: `frontend/src/app/dashboard/team/page.tsx:25` — remove hardcoded `MAX_TEAM_SIZE`, read `tournament.team_size`.
- Modify: `frontend/src/app/dashboard/components/hanbee/TournamentReviewQueue.tsx` — display "Independent Entry" label.

---

### Task 1: Pool schema — join requests table, membership-count helper, staff-controlled flag safeguard

**Files:**
- Create: `supabase/migrations/0091_pool_schema.sql`
- Test: `supabase/tests/rls/0091_pool_schema.mjs`

**Interfaces:**
- Produces: table `team_join_requests(id, team_id, student_id, status, created_at, expires_at)` with unique partial index `team_join_requests_one_pending on (team_id, student_id) where status = 'pending'`; function `student_has_active_team(p_tournament uuid, p_student uuid) returns boolean`.

- [ ] **Step 1: Write migration test asserting the unique-pending constraint rejects a second pending join request for the same `(team_id, student_id)`**

```js
// attempt two inserts with status='pending' for same team_id/student_id, expect second to violate unique index
```

- [ ] **Step 2: Run test, verify it fails (table doesn't exist yet)**

- [ ] **Step 3: Write migration `0091_pool_schema.sql`**: create `team_join_requests` table mirroring `team_invitations`'s column shape (status enum: `pending/accepted/declined/cancelled/expired`), the unique partial index, RLS enabled with no client insert/update/delete grants (writes via SECURITY DEFINER only, matching existing pattern), and `student_has_active_team(p_tournament uuid, p_student uuid) returns boolean` — a single shared helper querying `tournament_team_members` joined to `tournament_teams` for any non-withdrawn row for that student/tournament, to be called from every new pool function in later tasks instead of duplicating the check.

- [ ] **Step 4: Run test, verify it passes**

- [ ] **Step 5: Commit**

---

### Task 2: Staff-only independent account creation (invite-and-accept)

**Files:**
- Create: `supabase/migrations/0092_pool_account_creation.sql`
- Test: `supabase/tests/rls/0092_pool_account_creation.mjs`

**Interfaces:**
- Consumes: existing invite-issuance pattern from `0088_student_username_invites.sql`.
- Produces: `staff_create_independent_invite(p_full_name text, p_email text) returns uuid` (SECURITY DEFINER, Hanbee-staff-only), which issues an invite token with no `org_id`, resulting (on accept) in `profiles.role='student', is_solo=true, org_id=null`.

- [ ] **Step 1: Write test asserting a non-staff caller cannot call `staff_create_independent_invite`**

```js
// as a student, call rpc staff_create_independent_invite, expect permission error
```

- [ ] **Step 2: Run test, verify it fails (function doesn't exist)**

- [ ] **Step 3: Write migration `0092_pool_account_creation.sql`**: `staff_create_independent_invite`, staff-only (reuse the existing `is_hanbee_staff()`/manager check helper), issuing an invite row with `org_id = null`. On accept (reuse existing accept-invite trigger/function from `0088`), ensure `is_solo` is set `true` only through this path — add a guard so `is_solo` cannot be set `true` by any other write surface (addresses the spec's "staff-controlled flag" requirement from §1/Constraints).

- [ ] **Step 4: Write test asserting a staff member can call it and the resulting accepted profile has `is_solo=true, org_id=null`**

- [ ] **Step 5: Run both tests, verify they pass**

- [ ] **Step 6: Commit**

---

### Task 3: Pool-team creation + pool branches on `invite_to_team`, `leave_team`, `team_chat_create`

**Files:**
- Create: `supabase/migrations/0093_pool_team_formation.sql`
- Test: `supabase/tests/rls/0093_pool_team_formation.mjs`

**Interfaces:**
- Consumes: `student_has_active_team` (Task 1).
- Produces: `start_pool_team(p_tournament uuid, p_name text) returns uuid` (sets `captain_id=auth.uid()`, `org_id=null`, creates team chat seeded with only the captain); modified `invite_to_team` (new `org_id is null` branch, matched on "both independent" instead of "same org"); modified `leave_team` (new `org_id is null` branch allowing leave through `proposed`, school branch's `draft`-only cutoff preserved verbatim); modified `team_chat_create` (new branch for pool teams, captain-only seeding, school branch preserved verbatim).

- [ ] **Step 1: Write test asserting `start_pool_team` creates a team with `captain_id` set and a team chat containing exactly the captain**

- [ ] **Step 2: Write test asserting a schoo team's `leave_team` behavior at `proposed` status is unchanged (still raises the existing error)**

```js
// school captain attempts leave_team on a team at status='proposed', expect same exception as today
```

- [ ] **Step 3: Write test asserting a pool team's `leave_team` succeeds at `proposed` status but raises at `applied`**

- [ ] **Step 4: Write test asserting `invite_to_team` on a pool team succeeds for another independent student and still raises `'team not found'` for any attempt crossing into a school team's `org_id is not null` path unchanged**

- [ ] **Step 5: Run all four tests, verify they fail (functions don't exist/branches absent)**

- [ ] **Step 6: Write migration `0093_pool_team_formation.sql`**: `start_pool_team` (new function, not a parameter change to `student_start_team`), `create or replace` on `invite_to_team`/`leave_team`/`team_chat_create` adding the `org_id is null` branches described above, each guarded by `student_has_active_team` where a membership check is needed. Diff each function's existing `org_id is not null` branch against its current migration body and copy it forward unchanged.

- [ ] **Step 7: Run all four tests, verify they pass**

- [ ] **Step 8: Commit**

---

### Task 4: Join requests — `request_join_team` / `respond_join_request`

**Files:**
- Create: `supabase/migrations/0094_pool_join_requests.sql`
- Test: `supabase/tests/rls/0094_pool_join_requests.mjs`

**Interfaces:**
- Consumes: `team_join_requests` table (Task 1), `student_has_active_team` (Task 1).
- Produces: `request_join_team(p_team uuid) returns uuid`; `respond_join_request(p_request uuid, p_decision text) returns void` (decision in `('accepted','declined')`, captain-only, takes `select ... for update` on the team row before re-checking status/size).

- [ ] **Step 1: Write test asserting a second `request_join_team` call for the same team/student while one is pending raises (unique-pending constraint)**

- [ ] **Step 2: Write test asserting `respond_join_request` with `'accepted'` cancels that student's other pending invites and join requests for the same tournament**

- [ ] **Step 3: Write test simulating the race: two concurrent `respond_join_request` accepts that would push the team over `team_size` — assert only one succeeds**

- [ ] **Step 4: Run tests, verify they fail**

- [ ] **Step 5: Write migration `0094_pool_join_requests.sql`**: both functions, with `respond_join_request` taking `select ... for update` on `tournament_teams` before counting current members against `tournament_teams.team_size`, and cancelling the accepted student's other pending `team_invitations`/`team_join_requests` rows tournament-wide on accept.

- [ ] **Step 6: Run tests, verify they pass**

- [ ] **Step 7: Commit**

---

### Task 5: Pool chat — `chat_relation_dir` branch, global pool chat, contact-list pagination

**Files:**
- Create: `supabase/migrations/0095_pool_chat.sql`
- Test: `supabase/tests/rls/0095_pool_chat.mjs`

**Interfaces:**
- Produces: new branch in `chat_relation_dir(a uuid, b uuid)` returning a relation for two independent students where both `account_status='active'`; `pool_chat_conversation_id() returns uuid` (singleton global pool conversation, lazily created); `chat_contacts()` modified to accept `p_limit`/`p_offset` for the independent-student case.

- [ ] **Step 1: Write test asserting two active independent students get a relation from `chat_relation_dir`, and a deactivated independent does not**

- [ ] **Step 2: Write test asserting a school student and an independent student do NOT get a relation (no cross-role leak)**

- [ ] **Step 3: Write test asserting `chat_contacts()` with `p_limit` returns a bounded page, not the full pool**

- [ ] **Step 4: Run tests, verify they fail**

- [ ] **Step 5: Write migration `0095_pool_chat.sql`**: add the new branch to `chat_relation_dir` (additive only — do not reorder/modify existing branches), `pool_chat_conversation_id()`, and the `chat_contacts()` signature change with a default `p_limit` to keep existing callers working.

- [ ] **Step 6: Run tests, verify they pass**

- [ ] **Step 7: Commit**

---

### Task 6: Queue labeling + rejection notification verification

**Files:**
- Create: `supabase/migrations/0096_pool_queue_labeling.sql`
- Test: `supabase/tests/rls/0096_pool_queue_labeling.mjs`

**Interfaces:**
- Consumes: existing `decide_team` notification wiring (`0049_notifications.sql`).
- Produces: `tournament_application_queue()` returns a `participant_label` column (`'Independent Entry'` when `org_id is null`, else org name).

- [ ] **Step 1: Write test asserting `tournament_application_queue()` labels a pool team `'Independent Entry'` and a school team with its org name**

- [ ] **Step 2: Write test asserting `decide_team('rejected')` on a pool team fires a notification to every member, not just `created_by`**

- [ ] **Step 3: Run tests, verify they fail/surface the gap**

- [ ] **Step 4: Write migration `0096_pool_queue_labeling.sql`**: add `participant_label` to the queue function's return; if `decide_team`'s notification only targets `created_by` today, extend it to notify all current `tournament_team_members` rows on `'rejected'` (additive, no change to the `'verified'` notification behavior).

- [ ] **Step 5: Run tests, verify they pass**

- [ ] **Step 6: Commit**

---

### Task 7: Frontend — staff-only independent account creation screen

**Files:**
- Create: `frontend/src/app/dashboard/components/hanbee/CreateIndependentStudent.tsx`
- Modify: `frontend/src/lib/poolApi.ts` (new file) — add `createIndependentInvite(fullName: string, email: string): Promise<string>`

**Interfaces:**
- Consumes: `staff_create_independent_invite` RPC (Task 2).
- Produces: `createIndependentInvite` wrapper for later tasks/UI.

- [ ] **Step 1: Create `poolApi.ts` with `createIndependentInvite` calling the Task 2 RPC, following the existing wrapper pattern in `teamFormationApi.ts`**

- [ ] **Step 2: Build `CreateIndependentStudent.tsx`: full name + email fields, submit button calling `createIndependentInvite`, success/error state**

- [ ] **Step 3: Wire the component into the Hanbee dashboard navigation (staff-only route guard, matching existing staff-only screens' pattern)**

- [ ] **Step 4: Manually verify in the running app: a Hanbee staff user can open the screen and submit it, a non-staff user cannot reach the route**

- [ ] **Step 5: Commit**

---

### Task 8: Frontend — pool page (roster, global chat, team formation)

**Files:**
- Create: `frontend/src/app/dashboard/components/pool/PoolPage.tsx`
- Modify: `frontend/src/lib/poolApi.ts` — add `fetchPool`, `startPoolTeam`, `invitePoolStudent`, `requestJoinPoolTeam`, `respondJoinRequest`, `fetchPoolChat`

**Interfaces:**
- Consumes: Tasks 3–5's RPCs.
- Produces: the pool UI surface independent students land on.

- [ ] **Step 1: Add the remaining `poolApi.ts` wrappers, one per RPC from Tasks 3–5**

- [ ] **Step 2: Build `PoolPage.tsx`: roster list (all independents + all pool teams, including already-registered ones per spec §2), global pool chat panel, per-team "invite"/"request to join" actions, disabled state (per spec's left-to-builder note) for inviting/requesting against a student already locked into a registered team**

- [ ] **Step 3: Build the team-chat panel reusing the existing chat UI component used for school team chats, pointed at the pool team's conversation id**

- [ ] **Step 4: Manually verify in the running app: two independent test accounts can see each other in the pool, chat globally, one invites the other, the invitee accepts, both land in a shared team chat; a third independent cannot read that team chat's messages**

- [ ] **Step 5: Commit**

---

### Task 9: Fix `MAX_TEAM_SIZE` hardcode + queue label display

**Files:**
- Modify: `frontend/src/app/dashboard/team/page.tsx:25` and its usage at `:102`
- Modify: `frontend/src/app/dashboard/components/hanbee/TournamentReviewQueue.tsx`

**Interfaces:**
- Consumes: `tournament.team_size` (already loaded by the page); `participant_label` (Task 6).

- [ ] **Step 1: Write/adjust a frontend test (or manual check if no test harness covers this component) asserting the team-size limit shown equals `tournament.team_size`, not a hardcoded 5**

- [ ] **Step 2: Remove the `MAX_TEAM_SIZE = 5` constant and its clamp at line 102; use `tournament.team_size` directly**

- [ ] **Step 3: Update `TournamentReviewQueue.tsx` to render `participant_label` instead of the school-name-or-blank logic**

- [ ] **Step 4: Manually verify: a school team's queue row still shows its school name; a pool team's row shows "Independent Entry"; a tournament with `team_size=3` shows a 3-person cap on the team page, not 5**

- [ ] **Step 5: Commit**

---

## Self-Review Notes

- Spec coverage checked against all 5 numbered sections of the design doc plus Constraints — each has an owning task (account creation → Task 2/7; pool + two chat types → Task 5/8; team formation → Task 3/8; leave/succession → Task 3; submission/payment/rejection-notify → Task 6).
- Review Focus items each map to a specific test step above (join-request double-pending → Task 1 Step 1 & Task 4 Step 2; race on accept → Task 4 Step 3; inactive-account filtering → Task 5 Step 1; org-lapse false-positive → Task 2 Step 3's `is_solo` guard; draft-vs-proposed leave divergence → Task 3 Steps 2–3).
- Proportion: kept function bodies as signatures + the specific values the spec pins (branch conditions, status values, column names); no step asks the implementer to write code the plan hasn't already decided.
