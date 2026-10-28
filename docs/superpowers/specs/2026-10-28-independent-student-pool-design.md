# Independent ("Road-Kid") Student Tournament Pool — Design

## Intent & why

The tournament lifecycle (`proposed → payment_confirmed → verified`) already works for
school teams. The platform needs to support a second kind of participant — a student with
no school affiliation ("independent" / "road-kid") — without duplicating that lifecycle or
forcing them into fake per-student "organizations."

Business driver: public self-signup for independent students was tried and rejected
internally (risk of unused/junk accounts). The agreed fix is that an interested student
contacts Hanbee directly, and Hanbee staff creates the account — the same account shape as
a school student, just staff-triggered instead of self-service.

## Goals

- Independent students get accounts created only by Hanbee staff (no public signup path).
- Independent students can see each other, message each other, and invite each other into
  teams — without needing a school/organization context.
- Team formation among independents mirrors the existing school-team captain/invite flow as
  closely as possible, so there is one mental model, not two.
- Hanbee staff's only responsibility on these teams is the same oversight they already have
  for school teams: confirm payment, verify or reject. Staff never assembles a team or edits
  its roster.
- Team size cap (currently 5, per `tournaments.team_size`) applies equally to pool teams.
- A captain can leave their team at any time, with or without naming a successor.

## Non-goals

- No change to the school-team flow, its RLS, or its lifecycle.
- No new "organization" entity for independents. They are not grouped under any org —
  `org_id` stays `null` for every independent student and every pool team.
- No staff-side team-builder UI. Staff does not pick members into a team.
- No change to the Hanbee verification UI's core purpose (it already lists
  `applied`/`payment_declared` teams regardless of school/solo) beyond labeling.

## Anti-goals (would make this a failure even if it "works")

- Any flow where an independent student can be left permanently inside a captain-less team
  with no way out.
- Any flow that requires Hanbee staff to manually track or clean up unused accounts (the
  entire point of removing public signup).
- Re-introducing a school-style slot/quota system for independents.

## Decided user flows

### 1. Independent account creation (staff-only)

- A prospective independent student contacts Hanbee outside the platform.
- A Hanbee staff member creates their account from a new **staff-only creation screen** in
  the Hanbee dashboard — the same fields/shape as school student creation, except no
  organization is selected.
- Account activation uses **invite-and-accept**, the same mechanism already used for school
  student invites: staff sends the invite, the student clicks the link/email and sets their
  own password to activate — not a staff-set-credentials-immediately flow.
- Resulting profile: `role = 'student'`, `is_solo = true`, `org_id = null`.
- Note: the current `handle_new_user` (as of `0088_student_username_invites.sql`) already
  rejects any no-token signup with "Signups are by invitation only" — there is no live
  public self-signup path left to close. The work here is adding the staff-only *creation*
  screen that issues an `org_id`-less invite, not removing an open door (the earlier draft of
  this doc cited a stale migration, `0025`).
- No guardian consent collection is required at this time (explicit decision, raised and
  declined) — the staff creation screen does not need age/minor/consent fields.
- Pool membership must be driven by a flag only staff can set (e.g. keep `is_solo` but ensure
  it is only ever written by the staff-creation path, never flippable by the student or by
  side effects of org departure) — **not** inferred from `is_solo = true AND org_id = null`
  alone. Today a school student whose org membership lapses can transiently present the same
  `org_id = null` shape; without pinning the pool-membership check to a staff-controlled
  signal, such a student could wrongly gain pool-chat/pool-visibility access.

### 2. The pool

- All independent students belong to a single flat pool — not grouped by org, not grouped
  by staff-created container. Every independent student is always in the pool, regardless of
  whether they're unattached, on a forming team, or already on a registered team (see
  visibility rule below).
- Inside the pool, independent students can:
  - See every other independent student and every pool team that exists (name, roster,
    status) — **even teams that are already registered/verified**. Visibility is not
    restricted to "unattached" students; the point is a student can always see who's already
    on a team before deciding to ask to join.
  - Invite each other into a forming team, and accept/decline invites — mirroring
    `invite_to_team`/`respond_team_invitation`, but matched on "both independent" instead of
    "same `org_id`." Accepting an invite (or a join request, below) must cancel/withdraw that
    student's other pending invites and join requests tournament-wide, same as
    `respond_team_invitation` already does for school teams (`0039` lines ~301-312) — a
    student cannot be simultaneously pending on two teams for the same tournament.
  - **Request to join** an existing forming team (the reverse direction of an invite): a pool
    student sends a join request, the team's **captain** accepts or declines it. This is a
    second, separate path into a team alongside captain-initiated invites. Join requests need
    their own table mirroring `team_invitations`'s shape and guarantees: a unique-pending
    index per `(team_id, student_id)` (no spamming the same team repeatedly), and the accept
    path must take a `select ... for update` lock on the team row before re-checking status
    and size cap — the same lock discipline `invite_to_team`/`respond_team_invitation` already
    use — so a student cannot be accepted into a team in the same instant it hits its size cap
    or transitions to `applied`.
  - A student can be a member of at most one non-withdrawn pool team per tournament. This is
    currently enforced only by ad hoc `exists(...)` checks hand-copied into each of
    `student_start_team`/`invite_to_team`/`respond_team_invitation` — every new pool function
    (team creation, invite-accept, join-request-accept) must call the same shared check (a
    single helper, not a fourth copy-paste) before inserting a membership row.
- Hanbee staff does not act inside the pool. They do not create teams, do not pick members,
  do not approve join requests, do not see a "builder" view. Their only touchpoint is the
  existing review queue once a team is submitted.
- Deactivated/inactive independent accounts must be excluded from pool visibility and pool
  chat, the same way every existing `chat_relation_dir()` branch already checks
  `account_status = 'active'` for both parties — the new student↔student branch must carry
  the same guard, or a staff-deactivated account keeps full pool access.

#### Two kinds of chat (important — must not be conflated)

- **Pool chat**: one global chat room, all independent students, always visible to everyone
  in the pool (like a lobby). This is where students find each other and negotiate forming a
  team before any team exists. Requires a new relation case in `chat_relation_dir()`
  (`0026_chat_v2.sql`), since no student↔student branch exists today.
- **Team chat**: a private group chat, scoped strictly to that team's current members —
  identical in spirit to the school team chat already created by `team_chat_create()`
  (`0039_team_formation.sql`, currently fires only `if org_id is not null`; must be extended
  to also fire for pool teams).
  - Non-members can see that a team and its chat **exist** and see the team's roster, but
    **must not** be able to read any message inside that team's chat. Membership in the
    `conversation_participants`-equivalent table is the only thing that grants read access —
    there is no "preview" exception.
  - Because team membership changes freely (invite, join-request-accept, leave) right up
    until the team is registered, **chat access must be recomputed on every membership
    change**, not cached or granted once — a student who leaves must immediately lose access
    to that team's chat, and a student who joins must immediately gain it. This already works
    correctly for school teams because `team_member_added`/`team_member_removed` are AFTER
    triggers on `tournament_team_members` that update `conversation_participants` in the same
    transaction as the membership change — the pool implementation must go through that same
    trigger path (insert into `tournament_team_members` and let the trigger handle chat),
    never write `conversation_participants` directly from a join-request-accept function.
  - `team_chat_create()`'s school-team branch seeds org-staff rows into the chat as admins;
    the new pool-team branch must not accidentally reuse that seeding block — a pool team chat
    should seed only the captain.

### 3. Team formation among independents

- Any independent student can start a pool team (becomes captain). **This replaces
  `create_solo_team` for independents going forward**: today, `org_id = null` already means
  "legacy solo team" in the schema (no `captain_id`, no chat, created by `create_solo_team`).
  Reusing `org_id = null` for pool teams too would make a true legacy solo entry and a pool
  team indistinguishable. So instead, every independent-created entry — even a 1-person one
  — is created through a **new pool-team-creation function** that always sets `captain_id`
  and always creates a team chat (seeded with just the captain), the same shape a school team
  gets from `student_start_team`/`team_chat_create`. `create_solo_team` itself is not reused
  and is not called for new independent entries; it can stay as-is for any historical data it
  already produced.
- `student_start_team` cannot be reused as-is either — it hard-requires `my_org_id()` is not
  null. The pool version is a new, separate function with no school-slot check, not a
  parameter change to the existing one.
- The captain invites other independent students from the pool (new invite path, not
  org-scoped). `invite_to_team` currently raises `'team not found'` whenever
  `t.org_id is null` (`0039` line ~257) — this must become an explicit, deliberate pool
  branch, not left as a fallthrough, or pool invites will 404 after this ships. Invitees
  accept/decline like today's `respond_team_invitation`.
- Team size cap: same as school teams, driven by `tournaments.team_size` (2–5, maximum not
  exact — per `0090_team_size_is_maximum.sql`). The frontend's separate hardcoded
  `MAX_TEAM_SIZE = 5` (`dashboard/team/page.tsx:25`) should be removed in favor of reading
  the real value, while implementing this (flagged as a pre-existing bug, fixed in passing).
- A student already on a pool team can leave it (see §4) and join a different pool team.

### 4. Leaving a team / captain succession

- Any member, including the captain, can leave their team **at any time, except once the
  team is currently registered to a tournament** (i.e. has reached `applied` status or
  later: `applied`, `payment_declared`, `verified`). While the team is still forming (status
  `draft`), anyone can freely leave.
- Correction from an earlier draft of this doc: `proposed` is **not** "still forming" — it is
  the status `submit_team` itself sets, i.e. `proposed` already means submitted. The actual
  leave-lock point this design wants is `applied` (one step after `proposed`), which is later
  than where `leave_team` currently cuts off (today it blocks any status other than `draft`,
  for school teams too). Implication: **`leave_team` cannot simply be edited in place** to
  loosen this for pool teams — doing so would also loosen it for school teams, since the
  function has no `org_id` branch today and this doc's own constraint forbids changing
  school-team behavior. The builder needs either a pool-specific leave function, or an
  explicit `org_id is null`-branch inside `leave_team` that keeps the school-team cutoff at
  `draft` unchanged while allowing pool teams through `proposed`.
- Once registered (`applied` or later), membership is locked — no leaving, no new joins, no
  invite/join-request acceptance — until/unless the team is rejected or withdrawn by staff,
  at which point it reopens to `draft` and members are notified (see §5).
- If the captain leaves (while still unregistered) and has chosen a successor, that successor
  becomes captain.
- If the captain leaves without choosing a successor: **default behavior (my call, can be
  overridden) is to auto-promote the longest-standing remaining member** — this already
  matches the existing school-team behavior in `team_member_removed()` trigger logic
  (`0027_tournaments_teams_applications.sql`), so independents get the same mechanic instead
  of a new one.
- If the last member leaves, the team auto-withdraws (same as school teams today).
- A student who leaves returns to being an unattached pool member and must join or start
  another team to participate in a tournament — leaving is not itself a tournament entry.

### 5. Submission, payment, verification

- Pool teams submit the same way school teams do: `proposed → applied → payment_declared →
  verified` (or `rejected`).
- `tournament_application_queue()` already returns both school and solo/pool teams — no
  functional change needed there, only display: show **"Independent Entry"** instead of a
  blank/null school name, as in the original proposal.
- Hanbee staff's only actions on a pool team are the existing ones: confirm payment, verify,
  reject. They never edit membership.
- **Payment ownership is explicitly undecided.** The long-term intent is that each member of
  a multi-person pool team pays individually, not one captain paying for the whole team —
  but neither the collection mechanism nor the timing (paid online before registration vs.
  collected in cash) has been decided yet. Building per-member payment tracking now would be
  guessing ahead of that decision. **For this phase**, pool teams keep the existing
  single team-level `payment_declared`/`verified` flag, same as school teams, as an interim
  placeholder — individual payment tracking is explicitly out of scope until the business
  decides the mechanism, and will need its own design pass when it does.
- When a registered team is rejected (or withdrawn) by staff, every member must receive a
  notification stating the team was rejected and that they are now unattached in the pool
  again — reusing the existing notification system already wired into `decide_team`
  (`0049_notifications.sql`). A silent status flip is explicitly rejected as a failure mode.

## Constraints

- Must not change school-team RLS, functions, or lifecycle.
- Must not introduce a per-student fake organization.
- Independent accounts must only be creatable via a staff-gated path; the existing
  no-token-self-signup branch in `handle_new_user` must be removed or locked down so it can
  no longer silently produce `is_solo = true` accounts from public signup.
- Chat between independents needs a new, explicit relation case in `chat_relation_dir()` —
  do not weaken the existing allowed-pairs enumeration for any other role.
- Team-chat access must be a live permission check against current membership (RLS tied to
  the membership table), never a one-time grant — see §2 data-integrity note. A student
  removed from a team must lose chat access in the same transaction as the removal.
- Pool chat (global) and team chat (per-team, members-only) are distinct conversations; a
  pool team's chat must never be reachable from the pool chat or vice versa.
- Once a team reaches `applied` status or later, membership (and therefore chat
  participants) is frozen — no leave, no join-request-accept, no new invites accepted —
  until staff rejects/withdraws it.
- Concurrent-membership-change races (two simultaneous leaves, a join-request-accept racing a
  captain's submit) must be closed with `select ... for update` row locks on the team row,
  mirroring the pattern `invite_to_team`/`respond_team_invitation` already use — not left as
  an implicit assumption.
- Pool chat contact listing (`chat_contacts()` in `0026`) currently does an O(n) scan across
  every profile to compute relations; with every independent student related to every other
  independent student pool-wide, this must be paginated/limited rather than returning an
  unbounded list as the pool grows — flagged as a required consideration, not optional
  polish.
- Guardian consent for minors is handled out-of-band by staff (a phone call to the parent
  before account creation) and is explicitly not tracked or recorded by the platform — no
  age/consent fields or storage are required on the staff-creation screen.

## What's left to the builder

- Exact UI layout for the pool (list view fields, chat entry point, invite button
  placement).
- Exact wording/fields on the staff-only independent-account-creation screen.
- Whether pool invites expire the same way school invites do (7 days, per
  `0051_team_invite_expiry.sql`) — default: yes, reuse the same mechanism.
- Exact migration numbering/sequencing (next free migration number, currently after `0090`).
- Exact UI treatment for inviting/requesting-to-join a student who is visible in the pool but
  already locked into a registered team (per §2, they stay visible) — the action should be
  disabled/explained in the UI rather than silently failing or auto-declining, to avoid
  strangers repeatedly pinging someone who can't actually respond.
- Whether join requests expire the same way invites do (7 days) — default: yes, same
  mechanism as invite expiry (`0051_team_invite_expiry.sql`), applied to the new join-request
  table as well.
