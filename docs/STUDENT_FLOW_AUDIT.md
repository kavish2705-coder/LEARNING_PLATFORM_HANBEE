# Student Flow Audit — Login Through Every Dashboard Page

> **Update:** a follow-up pass tested the real student invite flow
> end-to-end (see §0 below) and the public `/apply` page. No bugs found
> in the invite mechanism itself.

Full walkthrough of the student experience, page by page, done live with a
real account (`teststudent@brookfield.edu`, Brookfield Academy — no team,
no course enrollments, 1,420 XP) via Playwright against the real Supabase
project. For each page: what's real data vs. what was hardcoded, and any
UI/UX flaws found. Everything marked "Fixed" below was fixed and verified
live during this same audit session, on branch `hanbeelms-dev`.

---

## 0. Student invite flow (login-page-adjacent)

Tested live, end to end, with a real school and a brand-new email:

1. **School staff sends an invite** (`/dashboard/school/students`) — real
   RPC call, real invite link generated
   (`/signup?invite_token=...&email=...`). Works correctly.
2. **New user opens the invite link** — signup form correctly pre-fills
   and locks the invited email address (dimmed, read-only), full name
   field is empty with example placeholder text only. No bugs.
3. **Account creation** — succeeds, auto-logs in, lands on `/dashboard` as
   a real `student` role account with zero console errors.
4. **School roster updates immediately** — the new student appears in
   the school's "Active students" list with honest real zeros (no team,
   0 courses), and the originating invitation flips from "Pending" to
   "Accepted" in the same view. Confirmed the entire
   invite → signup → org membership → roster pipeline is atomic and
   correct in production.
5. **`/dashboard/join-school` (existing-account join path)** — tested the
   edge case of an already-enrolled student opening a join link: the RPC
   correctly rejects with "you already belong to a school" and the UI
   shows that message clearly. The one console entry logged is just the
   expected 400 response from the rejected RPC call, not a real error.

**No bugs found in the invite mechanism.** One pre-existing UX issue
reproduced here: this page also has the blank-on-load flash (no skeleton)
seen on My Team — see §5 below.

**Separate finding — `/apply` (public "ask about a course" form, not the
invite flow):** the real course dropdown includes a garbled entry,
`",mcd uyl eer"`, alongside legitimate course titles like "Intro to
Design". This is dirty/test data sitting in the live `courses` table, not
a frontend bug — worth a cleanup pass on the courses table content itself.
No Hanbee logo on this page either (same as login/signup, noted below).

## 1. Login (`/login`)

- Real auth form, 4 role tabs (Student/School/Staff/Manager), Google/GitHub
  OAuth buttons. No hardcoded content.
- **Flaw:** no Hanbee logo on this page — the real logo asset added this
  session only went into the dashboard sidebar. Login/signup/landing pages
  still have no logo at all (not even the old text wordmark). Low priority,
  but worth a follow-up pass if the goal is a consistent, "solidified"
  first impression.

## 2. Overview (`/dashboard`) — ✅ Fixed

**Was:** The "Championship Standings" podium showed fully invented
competitor teams ("Team Redline Apex", "St. Xavier Tech", 11.42s lap
times, etc.) whenever the real tournament had no results yet — which is
the common case for a new account. Even when real data *was* available,
every opponent's car/best-lap/top-speed/readiness were hardcoded constants
identical for every row. The student's own "Best Qualifying Lap: 12.84s"
was also hardcoded, and the page conflated the student's gamified XP with
real competitive ranking.

**Now:** Uses the real `get_student_leaderboard` RPC exclusively. Shows an
honest empty state ("No verified entries yet") when there's nothing to
rank, real average lap time when available, and the student's actual
tournament points (not XP) for their own rank. Verified: this test account
correctly shows "No team yet", "Not ranked yet", "—" for lap time.

**Legitimate, clearly-disclosed gamification (not a flaw):** the "Pit-Stop
Bounties & Quests" section and "Practice Simulator XP" are self-contained
engagement features, explicitly labeled as such — not presented as real
external data.

## 3. Driver License (`/dashboard/license`) — ✅ Fixed

**Was:** "Best Lap: 12.84s", "Top Speed: 44.8 km/h", "Launch Reflex: 0.18s"
were hardcoded, identical for every student regardless of any real
activity. A second card ("RC Car & Race Info") was entirely fake data
("4WD RC Buggy", "2.4GHz Connected") — removed earlier this session.

**Now:** Best Lap reads the student's real average lap time from the
leaderboard RPC ("Not recorded yet" when there is none). Top Speed and
Launch Reflex were removed outright — there is no real per-student data
source for either anywhere in the schema, so inventing replacement values
wasn't an option; the honest fix was deleting the tiles. Race Points
correctly shows real XP.

## 4. Leaderboard (`/dashboard/leaderboard`)

Real data, real School Teams / Solo Entries tabs, real race stats (avg
lap, races, wins, top-3). No console errors. Already fixed earlier in the
session (was previously using a fake `benchmarkTeams` fallback).

## 5. My Team (`/dashboard/team`)

- Real roster (name, captain, role) when the student has an actual team —
  confirmed no fake stats are mixed into real teammate data.
- When the student has **no** team yet, a "Practice Racing Squad" is shown
  instead, with 3 fictional named teammates ("Rohan Varma", "Aarav Patel",
  "Priya Sharma") and fake lap times. **This is clearly labeled** —
  "Practice Squad · Simulation Active" badge, a banner saying "You are
  currently in a practice telemetry squad," and a "Create Official Squad"
  CTA — so this is a judgment call, not a trust-breaking bug like the ones
  above. Still, using real-sounding fake *names* for placeholder teammates
  is the one part that could briefly confuse a brand-new student. Consider
  swapping to obviously-placeholder names ("Sample Driver 2", etc.) if this
  comes up again.
- **Flaw:** the page renders completely blank for roughly 2 seconds on
  first load — no skeleton, no spinner, just empty space before content
  pops in. Not a crash, just a jarring loading experience. Same root cause
  likely affects other pages using the same data-fetch pattern (see
  `TournamentOverview.tsx`'s unused `loading` state flagged earlier this
  session).

## 6. Courses (`/dashboard/courses`) — ✅ Fixed

Real enrollment data. Empty state ("No courses found") uses the shared
`EmptyState` component. Clean.

**Not testable this pass:** the lesson detail page
(`/dashboard/courses/[id]`) requires a real course enrollment, which this
test account doesn't have. The breadcrumb-shows-raw-UUID bug on this page
was already found and fixed earlier in the session; worth a follow-up
visual check once an account with real enrollments is available.

## 7. Certificates (`/dashboard/certificate`)

Real data, honest empty state with a "Browse Courses" CTA. Clean.

## 8. AI Assistant (`/dashboard/ai-assistant`)

Real conversation history fetch, with an honest "fresh greeting" fallback
if history fails to load (not fake data — just a reasonable default
starting state). Brief "Loading your conversation…" flash during load,
same class of issue as My Team's blank-load gap, but here at least some
text is shown instead of nothing.

## 9. Live Attendance (`/dashboard/attendance`)

Real session clock, honest empty state for history. Clean.

## 10. Announcements (`/dashboard/announcements`) — ✅ Fixed

**Was:** 4 fully-invented fallback bulletins with fake staff names
("Vikram Singhania", "Marcus Vance", "Dr. A. Kulkarni") shown whenever an
org had zero real announcements — which, again, is the common case for a
new/small school. Every announcement (real or fake) also had a hardcoded
`acknowledgedCount` that implied social proof but was never backed by real
data and, it turns out, was never even displayed anywhere in the UI.

**Now:** Shows only real posts. This account's school has 2 real
announcements, both correctly attributed to real staff accounts (Jamie
Rivera, Hanbee Manager). Empty state upgraded to the shared `EmptyState`
component.

## 11. Chat (`/dashboard/chat`) — ✅ Fixed

Real contacts and real message history, verified with actual data (a real
contact, "Riley Brooks", with real message timestamps). Two issues fixed
this session:
- Selected-contact text was unreadable (browser-default black on a
  `<button>` with no explicit color) — now follows the theme correctly in
  Dark, Light, and Personalized.
- A spurious horizontal scrollbar on the contact list, caused by
  `.contactItem:hover`'s 4px translate pushing past the container with no
  `overflow-x: hidden` set — fixed and reproduced/verified with real data.

## 12. Settings (`/dashboard/settings`)

Real profile data (name, email), honest "Not set yet. Your school adds it"
for Student ID. Clean, no fabricated data.

**Flaw:** the content card only fills about half the available page width
on a standard desktop viewport, leaving a large unused blank area on the
right. Not broken, just not using the space well — worth revisiting in a
layout pass.

## 13. Achievements (`/dashboard/achievements`)

Not linked from the sidebar, reachable directly. Real data, honest empty
state ("Your milestones will appear here"). Clean.

---

## Summary

| Area | Status |
|---|---|
| Overview podium (fake competitors) | ✅ Fixed |
| License page (fake telemetry stats) | ✅ Fixed |
| Announcements (fake bulletins) | ✅ Fixed |
| Chat (contrast + scrollbar) | ✅ Fixed |
| My Team blank-load flash | Open — minor, no fake data involved |
| My Team practice-squad fake names | Open — disclosed, judgment call |
| Settings layout uses ~50% of width | Open — minor polish |
| No logo on login/signup/landing | Open — minor polish |
| Course lesson page | Not re-tested (needs an enrolled account) |

No remaining instance of fabricated data being shown as if it were real
was found anywhere in the student-facing flow during this pass. The
school-staff side (`HanbeeOverview.tsx` and related Hanbee-staff pages)
still has similar fake data patterns that were out of scope for this pass
(student dashboard only, per the current phase of work) and should get the
same treatment in the next round.
