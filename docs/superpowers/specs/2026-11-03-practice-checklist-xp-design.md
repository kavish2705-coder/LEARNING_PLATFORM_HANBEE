# Server-side Practice Checklist & XP design

## Intent and why

The student dashboard currently shows an XP counter and a "Personal
Practice Checklist" (6 RC-car self-check items: Wheels, Car Body, Motor,
Wiring, Remote Controller, Battery). Both are entirely client-side today:

- `useUserXp.ts` hardcodes `BASE_XP = 1420` as the starting point for
  *every* account, and all XP earned afterward lives only in that
  browser's `localStorage`.
- `TournamentOverview.tsx`'s checklist items are a binary toggle
  (checked/unchecked) stored in `localStorage`, worth +15 XP each and
  +50 XP for completing all six. There is no "failed" state in the code
  despite one existing in the UI design — Arun confirmed this was a
  missed feature, not an intentional omission, and it was never wired to
  the database.

This is a real, recurring tool students use before practice — not
decoration — so it needs to be a real account-level feature: starts at
0, lives in the database, and failed items reach Hanbee staff so they
can help the student fix the car.

## Goals

- New accounts start at 0 XP, not 1420.
- The practice checklist's 6 items move through three real states:
  **not_checked → passed → failed**, stored per-student in the database.
- Marking an item **passed** awards +15 XP (same as today). Completing
  all 6 items within a calendar week earns a **+50 weekly bonus**,
  repeatable every week a student does it again.
- Marking an item **failed** puts it into a new **staff queue** (same
  pattern as the existing Scrutineering queue) so Hanbee staff can see
  it and reach out to help the student fix the car.
- A failed item can be flipped back to passed by **either** the student
  (once they've fixed it) **or** a staff member — whichever happens
  first closes it out; no double confirmation needed.
- Each item's "passed" state resets back to "not_checked" 24 hours after
  it was marked passed, so the student can claim it again the next day.
- A **failed** item is exempt from the 24-hour reset — it stays failed
  (and in the staff queue) until someone actually resolves it.
- "Failed" is reachable only from **not_checked** — there is no path
  from passed straight to failed. The UI's failed action is a separate
  button alongside "Check & Pass," available only while an item is still
  not_checked. This means passed items never need an XP clawback.
- The failed-item staff queue is **Hanbee staff only** (same audience as
  Scrutineering) — a student's own school staff do not see or resolve
  these.

## Non-goals (this round)

- The separate "bounties" section in `TournamentOverview.tsx`
  (`handleClaimBounty`) is explicitly **out of scope** — stays as-is,
  flagged as a pending follow-up for later.
- No redesign of XP for lessons/quizzes/certificates/tournament
  results — this round is specifically the practice checklist. (Earlier
  framing considered tying XP to broader real progress; this is the
  first, concrete slice of that.)
- Not touching the existing staff Scrutineering flow (the at-track,
  staff-performed inspection before a race) — this is a separate,
  student-run, at-home self-check tool.

## Anti-goals

- Don't let a student silently self-clear a failed item without it ever
  reaching staff — the whole point is staff visibility into what's
  broken.
- Don't require a background cron job to perform the 24-hour reset
  (Render's free/hobby tier makes scheduled jobs awkward) — the reset
  must be computed lazily at read time instead.

## Constraints

- Must follow this repo's existing backend pattern: SECURITY DEFINER
  Postgres RPCs + RLS, migrations numbered sequentially
  (next is `0120_...`), no ORM.
- Must follow the existing staff-queue UI pattern already used for
  Scrutineering / Tournament Entries (tabs: e.g. "Needs review" /
  "Reviewed", a count summary row, a searchable list).
- Production DB (`uthvqsnjqrvjqhfypamo`) is freshly migrated and empty
  of real user data right now, so this ships like any other new
  migration — no backfill/migration-of-existing-rows concern this time.

## Decided design (the how)

### Schema

New table `practice_checklist_status`, one row per (student, item):

```
student_id   uuid references profiles(id), part of PK
item_id      text check in ('wheels','body','motor','wiring','remote','battery'), part of PK
status       text check in ('not_checked','passed','failed') not null default 'not_checked'
passed_at    timestamptz null   -- when it was last marked passed (drives the 24h lazy reset)
failed_at    timestamptz null   -- when it was marked failed
resolved_by  uuid references profiles(id) null  -- who flipped a failed item back to passed (student or staff)
updated_at   timestamptz not null default now()
```

Primary key `(student_id, item_id)`. No history table — current-state
only, matching how the rest of this schema handles similar status
fields (e.g. `tournament_results`).

**Lazy 24h reset:** there is no cron job. Any RPC that reads a student's
checklist computes the effective status on the fly: if `status =
'passed'` and `now() - passed_at >= interval '24 hours'`, it's reported
(and written back) as `'not_checked'`. `'failed'` rows are never
auto-reset by this rule — they only change via an explicit resolve
action.

### XP storage

New table `xp_events` (event-sourced, append-only):

```
id          uuid primary key default gen_random_uuid()
student_id  uuid references profiles(id)
source      text not null        -- e.g. 'checklist_item:wheels', 'checklist_bonus'
amount      int not null
created_at  timestamptz not null default now()
```

A student's total XP is `coalesce(sum(amount), 0)` over their rows —
computed in the read RPC, no separate running-total column to keep in
sync. Starting XP is therefore naturally 0 for everyone with no rows.

A `unique (student_id, source)` constraint makes every award naturally
idempotent and self-limiting, as long as `source` encodes the period it
belongs to: a per-item daily pass uses
`'checklist_item:' || item_id || ':' || to_char(now(), 'YYYY-MM-DD')`
(so the same item can earn +15 again each new day, but never twice the
same day), and the weekly bonus uses
`'checklist_weekly_bonus:' || to_char(now(), 'IYYY-IW')` (once per ISO
week). No separate "already awarded" check is needed in the RPC logic —
the insert itself fails harmlessly (caught and ignored) if the event
already exists for that period.

### RPCs (all SECURITY DEFINER, mirroring existing patterns)

- `get_my_checklist()` — student reads own 6 items, with the lazy
  24h-reset rule applied before returning.
- `get_my_xp()` — student reads own total (sum of `xp_events`).
- `mark_checklist_item(p_item_id text, p_result text)` — student only,
  `p_result` in `('passed','failed')`, writes their own row:
  - `passed`: only allowed from `not_checked` (enforced by the RPC, not
    just the UI). Sets status/passed_at, inserts an `xp_events` row for
    +15. If this makes all 6 items currently-effectively-passed, also
    inserts a weekly-bonus event (see "XP storage" above for the
    idempotent-source mechanics).
  - `failed`: only allowed from `not_checked` (there is no passed→failed
    path, so no XP clawback is ever needed). Sets status/failed_at. No
    XP change.
- `staff_resolve_checklist_item(p_student uuid, p_item_id text)` —
  **Hanbee staff only** (not school staff — see goals); same effect as
  a student marking that one item passed (status, passed_at,
  resolved_by = auth.uid(), +15 XP to the student via the same
  idempotent-source event), but callable by staff on any student's row.
  Requires the item to currently be `'failed'`.
- `list_failed_checklist_items()` — Hanbee staff only; returns every
  row with `status = 'failed'` joined to the student's name/contact,
  for the new staff queue page.

### Frontend changes

- `useUserXp.ts`: replaced by a hook that calls `get_my_xp()` and
  re-fetches after any checklist action — no more `localStorage`
  accumulation, no `BASE_XP` constant.
- `TournamentOverview.tsx`'s checklist block: replace the
  `inspectionStatus` localStorage state with `get_my_checklist()` /
  `mark_checklist_item()`. Each item gets a third action for "failed"
  (the missing button from the original design), not just a toggle.
- New staff page, same shape as the existing Scrutineering queue
  (left sidebar nav entry, tabs, count summary, list with a "Mark
  Fixed" action calling `staff_resolve_checklist_item`).

## What's left to the builder

- Exact copy/wording for the staff queue page and any toast messages.
- Whether `staff_resolve_checklist_item` should also leave an optional
  staff note (e.g. "replaced the motor") — default to no note field in
  v1 unless it turns out to be trivial to add; a free-text `notes`
  column on `practice_checklist_status` can be added later without
  breaking anything.
- Icon/visual details for the new three-state button (reuse existing
  icon set already imported in `TournamentOverview.tsx` — `CheckCircle2`
  etc. — pick something sensible for "failed", e.g. a warning icon from
  `lucide-react`, already a project dependency).
- Sidebar placement/label for the new staff queue page (e.g. alongside
  "Scrutineering" in `Sidebar.tsx`'s `staffMenu`).
