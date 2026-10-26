# UI Audit — `DEVELOPMENT-BRANCH` (school staff dashboard)

Scope: the school staff dashboard changes in commits `39d74d8`, `dacbc28`,
`9eb812a`. Tested live with a real account (`principal@brookfield.edu`,
Brookfield Academy — 2 real students, 0 real course enrollments) across
Dark, Light, and Personalized themes.

---

## 1. Fake data shown instead of real data — `SchoolOverview.tsx` / `SchoolCourses.tsx`

**What happens:** Open School Courses (or Overview, if the account isn't
linked to a school, or the data request fails) and it shows:

> RC Car Aerodynamics & Chassis Tuning — 48 students — 85%
> Brushless Motor & ESC Telemetry — 36 students — 72%
> Pit Lane Strategy & Circuit Mastery — 30 students — 64%

None of this is real. Brookfield Academy has 0 real course enrollments
right now, but the page shows these three invented courses with invented
numbers instead.

**Where:** `frontend/src/app/dashboard/components/school/SchoolOverview.tsx`
and `SchoolCourses.tsx`, in the `DEFAULT_SCHOOL_OVERVIEW` /
`DEFAULT_SCHOOL_COURSES` constants, used as a silent fallback whenever
`fetchSchoolOverview()` / `fetchSchoolCourseParticipation()` throws, or
`fetchMyOrganizationId()` returns null.

**Why it matters:** a staff member can't tell the difference between "my
school genuinely has these courses" and "the real request failed and
you're looking at made-up numbers." If the API breaks in production,
this hides the failure completely instead of showing an error.

**Suggested fix:** on failure, show the real error message (there's
already an `error` state wired up for this) instead of falling back to
invented data. If you want a nicer first-run empty state for schools
with zero data, that's a good idea — but it should say "no courses yet"
with real zeros, not show three courses that don't exist.

---

## 2. Sidebar active nav item is unreadable in Personalized theme

**What happens:** Switch to Personalized theme with a dark color pick
(e.g. hue 338°, Intensity 15 — a fairly common choice), then look at
whichever sidebar item is active (Overview, Students, etc.). The text
is a dark maroon on a dark maroon background — essentially invisible.
It's not one page, it's every page, since it's the sidebar.

**Where:** this is the same class of bug as `.navLinkActive` in
`layout.module.css` — check what token it's using for text color.
Likely `var(--color-primary)`, which in Personalized theme *is* the raw
hue/lightness the user picked, so a dark pick makes both the background
tint and the text converge to the same dark color. The fix already
exists elsewhere in the app: swap to `var(--accent-subtle-text)`, which
is a pinned-safe-lightness token (keeps the user's hue, fixes the
lightness at 70%) so it stays readable at any Personalized setting.

**Suggested fix:** grep your branch for wherever the active sidebar
link sets its text color and make sure it's using
`--accent-subtle-text`, not `--color-primary` or `--text-main` directly.

---

## 3. Header search box text is clipped — "Quick Searc..."

**What happens:** The search box in the top header shows "Quick
Searc..." cut off mid-word on every page, in every theme.

**Where:** `frontend/src/app/dashboard/components/SearchBar.tsx:297` —
the placeholder text was changed from `Search...` to `Quick Search...`,
but the box's fixed width (set in `SearchBar.module.css`, `.searchTrigger`)
was sized for the shorter string and wasn't widened to match.

**Suggested fix:** either widen `.searchTrigger`'s min-width a bit, or
shorten the label back to something that fits (e.g. just "Search").

---

## 4. Course table header has a mismatched gray block in Light theme

**What happens:** On the School Courses page in Light theme, the table
header row ("COURSE / STUDENTS / AVERAGE PROGRESS") sits inside a
visibly gray bar that doesn't match the white card around it — looks
like a leftover/unstyled default, not an intentional design choice.

**Where:** `SchoolOverview.module.css`, `.dataTable thead`:
```css
.dataTable thead {
  background: rgba(0, 0, 0, 0.15);
}
```
A flat black overlay at 15% opacity reads as a subtle dark tint in Dark
theme (fine), but against a white/near-white card in Light theme it
reads as a flat gray block that doesn't blend in.

**Suggested fix:** use a theme-aware token instead of a hardcoded black
overlay — e.g. `var(--bg-card-hover)` or similar, so it stays
proportionate in both themes.

---

## 5. Teams page empty state is bare text, not styled like the rest of the app

**What happens:** When a school has no teams yet, the Teams page just
shows the plain sentence "No teams have been proposed yet." with no
icon, no card, no visual weight — inconsistent with how empty states
look everywhere else (Courses, Overview, Leaderboard, etc. all use a
centered icon + title + description card).

**Where:** `school/teams/page.tsx`.

**Suggested fix:** use the shared `EmptyState` component
(`components/ui/EmptyState.tsx`) the same way it's used on the other
pages, instead of a bare `<p>`.

---

## Summary for a quick fix pass

Priority order:
1. **#1 (fake data)** — most important, this can actively mislead a
   school about their own real numbers.
2. **#2 (sidebar contrast)** — accessibility issue, affects every page.
3. **#3, #4, #5** — polish items, quick fixes.
