# UI Audit — Round 2: Fix Pass

Follow-up to `UI_AUDIT_REPORT_2026-11-05.md`. Scope: fix the concrete bugs found, migrate the
highest-value raw-hex duplicates onto theme tokens, and wire the previously-unused motion tokens
into real transitions — with a "make it feel human-built, not AI-templated" mandate behind the
specific choices. Verified on port 3003 only; port 3001 and the other assistant's in-progress
files (`AccessRequestsQueue.tsx`, `accessBlocker.module.css`, `license/page.tsx`, `team/page.tsx`,
`UpiCheckout.tsx`) were never touched. `license/` and `team/` CSS modules were also left alone
entirely, even though a few contained the same duplicate-hex pattern — that area is someone else's
active work right now, and token migration there would create merge noise for no benefit today.

## What changed, and why

**1. Hex-to-token migration (root cause behind audit findings #1 and #3).**
Every exact duplicate of `--color-success` (`#10b981`), `--color-warning` (`#f59e0b`, `#fbbf24`,
`#d97706`, `#92400e`), `--color-danger` (`#ef4444`, `#dc2626`, `#b91c1c`), and the cyan accent
family (`#7dd3e8` → `--accent-subtle-text`, `#38bdf8` → `--color-primary`, `#0891b2` →
`--color-primary-hover`) was replaced with the actual token, across 9 CSS modules and 13 TSX
files (inline styles) that are safe to touch. This directly resolves finding #3 (the "0% · In
Progress" status text was rendering through one of these literals) and makes a real dent in
finding #1 — these were the highest-frequency, lowest-risk duplicates to migrate mechanically.
**Not done**: the long tail of one-off `#fff`/`#ffffff`/background-tint hexes (758 total minus
roughly 150 migrated here). Those need per-instance judgment — some are legitimately
context-specific (a box-shadow alpha, not a semantic color) — and blind find-replace on them risks
silent visual regressions I can't eyeball in the time available this pass. Left for a dedicated
follow-up.

**2. Manager action-card title truncation (finding #2), fixed properly, not just patched.**
The real cause wasn't the copy — `"Review school registrations"` was always the full string. It
was `ActionCenter.module.css`'s `.actionTitle` forcing `white-space: nowrap` + ellipsis on a
single line, while the "N pending" badge sat in the same horizontal row competing for the same
narrow card width. Fixed two things together: the title now clamps to 2 lines instead of 1
(`-webkit-line-clamp: 2`), and the pending badge moved from "squeezed in next to the title" to
"sitting under the title, same row as nothing else" — freeing up the actual width constraint
instead of just allowing more vertical room for a fight the title was still going to lose. Bumped
the title to `font-weight: 700` / `14.5px` / tighter letter-spacing while I was in there — a small
typographic-hierarchy move (title should visibly outweigh its description, which this component's
old `650` weight at the same visual register didn't deliver).

**3. Manager breadcrumb/nav label mismatch (finding #6).**
`Header.tsx`'s `PAGE_TITLES` map explicitly hardcoded `"/dashboard/manager/monitor": "Monitor"`,
while `Sidebar.tsx` labels the same route `"Overview"`. One-line fix: the breadcrumb now says
"Overview" too. This was a straightforward copy-paste leftover from before the route was renamed,
not a design decision to preserve.

**4. Motion tokens wired into real transitions (finding #7).**
`--motion-fast-duration`/`--motion-fast-ease` (150ms, no bounce) and
`--motion-moment-duration`/`--motion-moment-ease` (380ms, `cubic-bezier(0.16,1,0.3,1)`) existed in
`theme.css` but nothing referenced them. Now:
- Student Overview (`TournamentOverview.module.css`) and the shared `ActionCenter` component's
  hover/focus transitions reference the tokens directly instead of hardcoded `0.2s`/`0.25s ease` —
  real easing, not the browser-default `ease` curve that's one of the more recognizable "nobody
  thought about this" tells.
- `ActionCenter` gained a `pace` prop (`"fast"` | `"moment"`, default `"fast"`). Student Overview
  passes `pace="moment"`: its three "next steps" cards now reveal with a staggered
  `translateY(6px)+opacity` entrance (each delayed by `0.35× --motion-moment-duration` past the
  previous), respecting `prefers-reduced-motion`. Staff and manager keep the default `"fast"` —
  no stagger — because those are high-frequency work-queue surfaces where a cards-cascading-in
  animation would be a tax on repeat use, not a delight. This is the fast/moment distinction this
  session designed earlier, now actually doing something instead of sitting in a token file.
- Staff Overview (`HanbeeOverview.module.css`) got the same `ease` → `var(--motion-fast-ease)`
  swap on its hover transitions, consistent with the "staff surfaces are fast-tier" rule.

**On "feels AI-templated" specifically**: the single highest-leverage thing addressed this pass
is #2 — a title silently clipping mid-word is exactly the kind of thing that reads as "nobody
actually looked at this before shipping it," more than any color or motion choice does. The
`ActionCenter` title-weight bump and the moment-tier stagger on the student Overview are the two
concrete steps toward real hierarchy and intentional motion. I did **not** attempt a from-scratch
visual redesign (new macrostructure, new layout rhythm, new accent-hue rule across all 4 roles) in
this pass — that's a materially bigger undertaking than fix-and-verify within one session, and
doing it hastily on top of an already-in-progress parallel redesign (the other assistant's
license/team/payments work) risks exactly the kind of collision the user has repeatedly asked me
to avoid. See "Deferred" below for what a real structural pass would need.

## Verified (port 3003, screenshots not re-saved — same visual surfaces as Round 1, spot-checked live)

- `npm run check-contrast`: all 14 token pairs (dark + light) still pass, unchanged from Round 1 —
  5.08:1 / 6.28:1 on `color-primary-text`/`color-primary`, nothing regressed.
- `npx tsc --noEmit`: clean (excluding the other assistant's in-progress files, which were never
  touched).
- Manager Overview, logged in as `morgan@hanbeelms.edu`: all 4 action-center card titles render
  on one line in full, pending badges sit under the title, breadcrumb now reads "Overview".
- Student Overview, logged in as `ava@student.edu`: 0 console errors, token-driven colors render
  identically to before (expected — token migration is a value swap, not a visual change), stagger
  prop compiles and applies without layout shift.
- Staff Overview ("My Space"), logged in as `jamie@hanbeelms.edu`: 0 console errors, token-migrated
  colors (teal "UPCOMING" badge, green "SCRUTINEERING" badge, purple "PACE BENCHMARK" accent) all
  render correctly post-migration — no silent breakage from the hex→token swap.

## Outstanding / deferred, with reasons

| # | Finding | Status | Why deferred |
|---|---|---|---|
| 1 | 758 raw hex instances (partial fix this pass) | ~150 migrated, ~600 remain | Remaining instances are mostly one-off background tints and `#fff`/`#ffffff` text/shadow values that need per-instance judgment, not a safe mechanical swap. Needs a dedicated pass with before/after screenshots per file. |
| 4 | Typo "RC Tounament" | Not found in any frontend source file (`grep -rni "tounament"` across `frontend/src` returns nothing) | This is very likely a **database seed/content value** (a tournament name in Supabase, not a hardcoded string), outside frontend-code scope. Needs checking `supabase/seed.mjs` or the live `tournaments` table directly — flagging for the right venue rather than guessing at a fix. |
| 5 | Staff sidebar: 13 nav items overflow, push sign-out below the fold | Not fixed | Confirmed still present on live screenshot. Real fix needs either a collapsible nav-section pattern or a sticky-footer sign-out that survives scroll — a small structural layout change to `Sidebar.tsx`/`layout.module.css` I didn't want to rush in the time remaining, since `layout.module.css` is shared across all 4 roles and a careless change there has the widest blast radius of anything in this session. |
| 8 | Cross-role accent-hue / nav-density inconsistency | Not addressed | This is the "real redesign" item — deciding one deliberate accent-and-status-color rule and a consistent nav-density ceiling across all 4 roles, then applying it everywhere. That's a multi-session structural design pass, not a fix-pass item; doing it in the time remaining here would mean picking something fast and shallow, which defeats the point. |
| — | Raw-hex migration in `license/`, `team/` areas | Explicitly skipped | Those files are the other assistant's active working area per standing instruction. |

## Recommended next phase (if/when picked back up)

1. Finish the hex migration (the remaining ~600 instances), file by file, with a quick visual
   diff per file touched.
2. Fix the staff sidebar overflow with a real layout change (collapsible sections or a
   non-scrolling footer), tested at the actual 13/17-item counts.
3. Decide the one accent-and-status-color rule across all 4 roles and apply it — this is the
   actual fix for "looks AI-templated," more than any individual component polish.
4. Chase the "RC Tounament" string down to its actual source (seed data vs. live DB row) and fix
   it there.
