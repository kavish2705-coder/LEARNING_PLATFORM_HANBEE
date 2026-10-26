# UI/UX Audit Findings — Student Pages

This is a list of real visual bugs found by actually clicking through every
student page with a logged-in test account, in all 3 color modes (Dark,
Light, and Personalized — the "pick your own color" theme). Fix status is
tracked below so the remaining findings stay actionable.

**How this was found:** real screenshots of a working account (real
tournament data, real team, real courses), not guesses from reading the
code. If something's listed here, it was actually seen on screen.

---

## ✅ Fixed — Personalized sidebar active-item contrast

Fixed by using `--accent-subtle-text` for the active item foreground.
The original failure was observed on all 12 student pages at a dark
personalized hue/lightness.

---

## Other bugs, page by page

### License page (`/dashboard/license`)
The small labels like "BEST LAP" and "TOP SPEED" are dark gray text on a
nearly-black card background. You can barely read them (contrast ~2.3:1,
should be 4.5:1+). Happens in all 3 themes.
**Fix:** make those caption labels a lighter gray on dark backgrounds.
**Status:** Fixed with a light caption color for the theme-independent
dark license-card surface.

A second, separate finding: the "RC Car & Race Info" card's row labels
("Car Model", "Remote Link", etc.) measured ~1.25:1 contrast in Light
mode. On inspection this card was also entirely hardcoded/fake data
("4WD RC Buggy", "2.4GHz Connected", "Checked & Ready to Drive" were not
sourced from any real record).
**Status:** Fixed by removing the card. There is no real car/equipment
data to show, so the honest fix is deleting a fake feature, not
re-coloring its text.

### Leaderboard page (`/dashboard/leaderboard`)
The summary could say **"#4 of 3"** because the rank and field size came
from separate queries. School-team and solo entries also lacked a clear
separate view, and leaderboard entries had no persisted race/lap metrics.
**Status:** Implemented in the leaderboard and migration `0086`. Rank and
verified field size come from one selected-tournament result set, with
places normalized to the verified entries. School Teams / Solo Entries
filters and recorded race/lap stats (participations, wins, top-3 finishes,
average lap time, and points) are included. Race times are sums of recorded
lap splits; the fastest finisher wins. Staff record per-entry race results
in Hanbee Tournament Results. Apply the migration before deploying the UI.

### My Team page (`/dashboard/team`)
If you only have 1 teammate out of a possible 5, the other 4 empty slots
just show as plain "+" symbols with no box or label — doesn't look like
part of the design, just looks broken/unfinished. Separately, the status
and roster badges in the header ran together with no spacing.
**Fix:** give empty slots a proper framed pill (filled = numbered circle,
empty = dashed "available" slot); add spacing between header badges.
**Status:** Fixed — Capacity Tracker slots now render as real pills, and
`.metaRow` spacing was added. Verified live in Dark, Light, and dark
Personalized themes.

### Courses page (`/dashboard/courses`)
If a student is only enrolled in 1 course, that one course card sits in a
3-column grid — leaving two big empty gaps next to it where the other
columns would be. Looks unfinished.
**Fix:** when there's only 1 (or 2) courses, don't force a fixed column
count — let the layout size itself to however many courses actually
exist.
**Status:** Fixed by switching the grid from `auto-fill` to `auto-fit`,
which collapses unused tracks instead of reserving them.

### Course lesson page (`/dashboard/courses/[courseId]`)
The breadcrumb at the top (the "Dashboard > Courses > ..." trail) shows
the raw database ID (a long random string of letters/numbers) instead of
the actual course name.
**Fix:** look up the real course title and show that instead of the raw ID
in the breadcrumb.
**Status:** Fixed — the header now fetches the real course title for
`/dashboard/courses/<uuid>` routes and shows it instead of the raw ID.

### AI Assistant page (`/dashboard/ai-assistant`)
The row of suggested-prompt buttons is wider than the screen — the last
one gets cut off at the edge, and there's no visible way to scroll to see
it (no arrow, no scrollbar hint).
**Fix:** either wrap the prompts onto a second row, or add a visible
scroll indicator so people know there's more to see.
**Status:** Already fixed in an earlier pass (a fade-out mask on the
scrollable row signals there's more to scroll to).

### Chat page (`/dashboard/chat`)
When you select a contact, their name is shown in **black text** on a
dark teal background — nearly unreadable in Dark mode and in the darker
Personalized setting.
**Fix:** the selected-contact row's text color needs to respond to the
current theme instead of being hardcoded to black.
**Status:** Fixed. Root cause: the contact row is a `<button>` with no
explicit `color` set, so browsers fall back to the default `buttontext`
(black) instead of inheriting the theme's text color. Now explicitly set
to follow the theme. Not yet re-verified against a real account with
actual contacts (the test account used had none to select).

A second Chat finding — a spurious horizontal scrollbar on the contact
list — is now fixed too. Root cause: `.contactItem:hover` translates the
row 4px to the right, and `.contactsList` only set `overflow-y: auto`
with no `overflow-x: hidden`, so that 4px of hover motion was enough to
trigger a real horizontal scrollbar. Reproduced and verified fixed live
with a real account that has actual contacts, in Dark and dark
Personalized themes.

### Courses / Attendance empty states
Both pages showed bare one-line text ("No courses found for this
filter.", "No attendance recorded yet.") with no icon, explanation, or
next step.
**Status:** Fixed — both now use the `EmptyState` component, matching the
pattern already used elsewhere. The Leaderboard page's "No tournaments
are available yet." had the same issue and was fixed the same way.

---

## Remaining findings

All findings from this round are fixed and verified live. A separate,
deeper pass also found and fixed fabricated data shown as real content
on the Overview, License, and Announcements pages (invented competitor
teams and lap times, fake announcement authors) -- see the git history
on `hanbeelms-dev` for details.
