# HanbeeLms Multi-School Platform: Living Plan

The single reference for the schools, teams, role dashboards and chat redesign. Decisions, rules, what each migration does, what is built, and what is left. Update the status boxes as work lands. Related docs: `docs/SECURITY_PLAN.md` (security tracker and the kinds of security checking), `docs/PLAN.md` (dated changelog of everything built), `supabase/tests/README.md` (how to rerun the database security tests).

Status key: `[x]` built and proven, `[~]` in progress, `[ ]` not started.

---

## 1. What we are building

HANBEE runs an RC F1 tournament and an LMS. **Schools** take part **as teams**. A school's staff invite their own students, group them into teams, and monitor them. Students cannot sign up alone. The site is needed quickly, so the UI is **simple and replaceable**; the other developer's polished UI replaces it in about a month. The chat must feel exactly like WhatsApp.

## 2. Decisions log (from the user, in their own terms)

| Topic | Decision |
|---|---|
| Who builds | Backend first, then the UI, one role at a time, by us. The other developer's polished UI replaces ours later, so keep pages thin and logic in `lib/*Api.ts`. |
| School onboarding | A school self-registers. **Either the manager or Hanbee staff may verify it; the first to act wins** and it disappears from the other's "needs verification" list. |
| School staff | One owner, who can invite more school staff. |
| Manager | Few managers allowed while production issues are fixed; **exactly one at final production** (unique index plus a recovery procedure are on the launch checklist). Only the manager verifies or removes Hanbee staff. Hanbee staff cannot touch the manager. |
| Announcements | Manager and Hanbee staff post **site-wide**. School staff post **inside their school only** and can edit them. Announcements are never notifications. |
| Courses | Hanbee staff create courses and enroll students for now. School staff only see which of their students take which course and how far they are. Later: students apply and pay at the Apply click. |
| Payment | Static UPI QR plus a self-declaration checkbox shown at the "Apply" click (tournament or course). Hanbee staff verify it. Real gateway is later. |
| Tournament | Team based. Students see the upcoming tournament, their team and its members, and the leaderboard. School staff form teams. |
| Solo | Cannot be created directly. A student becomes solo when Hanbee staff add them, or when their school closes and they convert. Records stay under the original school's name. A solo student may take courses and enter the tournament by paying (as a team of one). |
| Monitoring | Done by the system, only for students participating in courses (lessons, completions, quizzes, auto attendance). Hanbee staff only clock in and out. No broad tracking. |
| Invites | No Supabase email. The site opens the staff member's own mail app (default app, Outlook web, Gmail) with the message ready, students in BCC, staff adds only their own To or Cc. |
| Old tests | The old browser tests (mock-page based) are deleted and replaced by a small role-based suite. |
| Free-tier limits | Deferred; upgrade to paid if activity grows. |

## 3. Roles and powers

| Role (`profiles.role`) | Who | Powers |
|---|---|---|
| `manager` | Hanbee owner side | Verify schools and Hanbee staff, remove Hanbee staff, see everything, site-wide announcements, chat with everyone. Never impersonates. |
| `staff` (**Hanbee staff**, needs `approved`) | Hanbee employees | Verify/suspend/revoke schools, school staff, students and solo users. Courses, enrollments, tournaments, site-wide announcements, chat with students of their own courses. Own space: clock in/out, tasks, schedule. |
| `school_staff` | Owner plus invited teachers of one school | Only their own school: invite students, teams, announcements (school only), schedule, chat (add/remove members), read-only course participation. |
| `student` | Invited by a school, or solo (`profiles.is_solo`) | Tournament dashboard first, LMS second. Shared chat. |

`staff` keeps meaning Hanbee staff everywhere in the database. `is_staff_or_manager()` therefore never includes school staff.

## 4. How the database enforces it (built)

Every rule lives in the database, never only in the browser. Suspended or revoked accounts have no role (`my_role()` returns null), so they lose staff powers at once.

| Migration | Adds |
|---|---|
| 0012 | AI assistant rate limit (`ai_chat_usage`) |
| 0013 | `calendar_events` |
| 0014, 0015 | Messaging RPC; fixed a recursive chat policy |
| 0016, 0017 | Security fixes: role self-promotion, attendance forgery, certificate forgery, time-entry forgery |
| 0018 | Certificate needs real completion; discussion pin/lock rules; invite forgery and role-escalation guards |
| 0019 | `complete_lesson()`: completion checked on the server (order, enrollment, quiz unlocked) |
| 0020 | Course content readable only by enrolled students and staff |
| 0021 | Profile reads scoped (students no longer read everyone's email) |
| 0022 | Role value `school_staff` |
| 0023 | `organizations`, `organization_members` (history kept), `profiles.account_status`, helper functions, read-only RLS |
| 0024 | **Invite-only signup in the database**, school registration, `verify_school`/`reject_school` (first wins, row locked), `invite_students`, `invite_school_staff`, `revoke_invitation`, `preflight_join`, `get_join_info`, `audit_log`, invitation guard |
| 0025 | `profiles.is_solo` (set when Hanbee staff invite a student with no school) |
| 0026 | **Chat v2**: conversation kinds, contact rules (`chat_can_message`, `chat_contacts`), automatic school groups with join/leave system messages, add/remove members (school staff for their own school, Hanbee staff and manager for any), pinned manager chats, unread counts, 30-per-minute rate limit, Realtime publication, `chat_conversations()`, `chat_members()`, `chat_mark_read()` |
| 0027 | **Tournaments**: `tournaments`, `tournament_teams`, `tournament_team_members` (with `org_id_at_join`), `tournament_results`, course `applications`; write functions only (`create_team`, `add_team_member`, `apply_team`, `decide_team`, `set_result`, `apply_for_course`, `decide_course_application`, `enroll_student`); leaderboard via `get_leaderboard()`; teams only while a tournament is `upcoming`; rejected is final |
| 0029 | **Dashboards' data and lifecycle**: `school_overview`, `school_students`, `school_course_participation`, `course_students` (with a "new" flag = enrolled in the last 14 days), `school_directory`, `site_tournament_overview`, `site_lms_overview`, `hanbee_staff_overview` (manager only), `set_account_status` (bans sign-in, ends sessions), `set_school_status` (suspend, reactivate, close = ends memberships), `convert_to_solo`, `join_school` (existing solo or ex-member joins a new school) |
| 0030 | Fix found by the 0029 test: `join_school` could not mark its invitation accepted; trusted-write flag for the invitation guard |
| 0031 | Hardening: trusted-write flags are honoured only when the running role is not `authenticated` or `anon` |
| 0033 | Task priority (low, medium, high) and status (todo, in progress, done) replacing pinning; `staff_work_settings` (start time, grace, time zone, working days; only the manager changes it); lateness computed by the server; `staff_attendance()` per day (present, late, absent, holiday, off, today, upcoming; holidays and days off never count as absent); the manager's performance overview gains late days, absent days and high-priority tasks |
| 0036 | `list_assessment_reviews()` and `list_certificates_overview()`: lesson reviews and certificates for the manager and Hanbee staff (everything) and school staff (own school only); students are refused |
| 0034 | Working on a holiday or a day off counts as present, never late |
| 0028 | **Tenant scoping**: announcements (`org_id`, pinned, edit and delete rules), calendar (`org_id`, personal `owner_id`), school staff read-only enrollments, discussions limited to enrolled students, profile visibility by school, anonymous tournament-registration insert closed, revocation honoured by course access and lesson completion |
| 0041 | Solo-student tournament entries, payment declaration, and the Hanbee tournament application review queue |
| 0042 | Server-side search and pagination for the school directory, with a matching count RPC |
| 0043 | Search, status filtering, pagination, and count RPCs for the assessment review queue |
| 0044 | Optional status/search filtering for course application listings |
| 0045 | Tracks the `auth.users` auto-confirm trigger in migrations and pins its `search_path` |
| 0046 | Makes per-user hourly AI capacity reservation atomic under concurrent requests |
| 0047 | Adds database payload-length checks for staff tasks and profile names, plus a staff-task index |
| 0048 | Enforces at most one manager with a partial unique index; promotes `info@hanbee.in` when that profile exists |
| 0049 | Adds notification read/count RPCs and notification creation for assessment, school, team, and application decisions |
| 0050 | Adds tournament-result change history and enforces unique ranks per tournament |
| 0051 | Adds seven-day team-invitation expiry and allows expired pending invitations to be replaced |
| 0052 | Adds search, pagination, and count RPCs for certificate listings and addable tournament students |
| 0053 | Persists each student's AI chat history with owner-scoped read/delete policies |
| 0054 | Fixes the ambiguous `usage_date` reference in the shared daily AI-capacity RPC |
| 0055 | Corrects the assessment-submission notification link to the current review route |
| 0056 | Adds an atomic per-user AI request-per-minute capacity RPC |
| 0057 | Publishes notifications to Supabase Realtime |
| 0058 | Adds a participant-scoped chat read-receipts RPC |
| 0059 | Seeds the Java course, section, and lessons when a staff/manager owner exists; skips demo content on an empty database |
| 0060 | Replaces the Java placeholder lessons with the 25 Java-notes chapters when the course exists |
| 0061 | Adds an optional validated hex colour to tournament teams |
| 0062 | Adds student ID and preferred team name fields, with guarded student-ID writes |
| 0063 | Adds the signed-in student's rank/points RPC for the latest tournament with results |
| 0064 | Adds per-user notification preferences and suppresses disabled notification kinds |
| 0065 | Allows rejected/withdrawn tournament team names to be reused |
| 0066 | Removes stale membership rows when a student re-enters a tournament as a solo team |
| 0067 | Makes school registration number and official email optional at signup |
| 0068 | Adds indexes for previously unindexed foreign-key columns |
| 0069 | Adds an atomic adjacent-module reorder RPC |
| 0070 | Adds atomic server-side module/lesson creation with locked parent ordering |
| 0071 | Adds atomic full-order RPCs for modules and lessons |

### The five allowed signup paths (everything else is refused)
1. `invite_token` plus the invited email: solo student, co-staff, or a manager-created Hanbee staff or manager account.
2. `join_token` (the school's shared link) plus an email on that school's list: a student joining their school.
3. `role = school_staff` with school name, registration number, official email and the guardian-consent confirmation: registers a new school (pending, owner unapproved until verified).
4. `role = staff`: Hanbee staff application (unapproved until the manager approves).
5. `role = manager` only when no manager exists (bootstrap).

Known limit: with no email confirmation, someone holding a school link who also knows another student's invited email could claim it first. Mitigations: the school sees who joined and can revoke and re-invite; real email confirmation comes with SMTP.

### Helper functions (all `SECURITY DEFINER`, safe from recursion)
`my_role()`, `is_manager()`, `is_hanbee_staff()`, `is_staff_or_manager()`, `is_active_account()`, `my_org_id()`, `is_org_member(org)`, `is_org_owner(org)`, `can_manage_org(org)`, `is_student_in_my_school(student)`, `is_enrolled_in_course(course)`, `can_see_profile(profile)`, `can_read_announcement(...)`, `can_access_thread(thread)`, `log_audit(...)` (callable only from other definer functions).

## 5. What each role sees (data scope)

| Viewer | Announcements | Calendar | Enrollments | Profiles |
|---|---|---|---|---|
| Student (school) | Site-wide plus their school's, by audience | Site-wide plus their school's | Their own | Themselves, approved Hanbee staff, their school's owner and staff, chat partners |
| School staff | Site-wide plus their school's; posts and edits only their school's | Their school's, site-wide, own personal | Read-only for their school's students | Their school's members |
| Hanbee staff | All; posts site-wide | All schools; manages site-wide, own personal | All | All |
| Manager | All; posts site-wide; can delete any | All except others' personal events | All | All |
| Anonymous | Nothing | Nothing | Nothing | Nothing |

## 6. Screens per role (simple UI, real data only)

- **Student (slide wizard, tournament first):** Tournament: overview (event, countdown, my team, status), leaderboard, announcements, chat, enrollment/apply (payment QR). LMS: course overview, announcements, attendance, AI assistant, chat, apply for a course.
- **School staff:** Overview (slide tabs Tournament | LMS), Students (bulk invite via mail app, joined or pending), Teams, Announcements (school only, editable), Schedule (day/week/month), Chat (add/remove members), Courses (read-only participation and progress).
- **Hanbee staff:** My space (clock in/out, attendance, tasks, schedule), Tournament overview, LMS overview, Schools (list, then school detail with Tournament and LMS tabs), Courses (cards, editor, student table with completion and a "new to this course" flag; a row opens that school's page), Announcements (site-wide), Chat (students of their own courses).
- **Manager:** Monitor, Verifications (schools and Hanbee staff), Schools, Hanbee staff overview (view only), Announcements (site-wide), Chat, own tasks.

## 7. Chat (WhatsApp behaviour)

Two panes on desktop; list then thread on mobile. List: avatar, name, last message, time, unread badge, search. Thread: bubbles with tails, day separators, time, sent and read ticks, unread divider, scroll-to-latest, growing input (Enter sends, Shift+Enter newline), optimistic send with retry, typing indicator, online dot, system messages ("X added Y"), group info. Live via Supabase Realtime. Not in week one: media, voice, reactions, search, push.

**Who may message whom** (enforced in the database by `chat_can_message` and `chat_contacts()`):
- Student: their school staff, and Hanbee staff who **own a course they are enrolled in**. Never other students except inside their school group.
- School staff: only their own school's students and staff, plus all Hanbee staff and the manager.
- Hanbee staff: only students in courses they own, school owners, other Hanbee staff, the manager.
- Manager: everyone; every school owner and Hanbee staff is always listed (pinned).
Each school gets an automatic student group; only school staff (own school), Hanbee staff and the manager may add or remove members; students never can.

## 8. Frontend approach

New code lives in `frontend/src/portal/` (`kit`, `auth`, `student`, `school`, `hanbee`, `manager`, `chat`) so it never collides with the other developer's redesign. Pages stay thin; data logic sits in hooks and `frontend/src/lib/*Api.ts`. A handover contract (`docs/FRONTEND_CONTRACT.md`: routes, data functions, screens) is written at the end. Reuse `AppShell`, `ProtectedRoute` (extend for school staff and pending or suspended states), `Reveal`, `ToastProvider`, `RichTextEditor`, `MessagesInbox` layout for chat, `StaffCourseEditorPage` with `coursesAdminApi`, `ScanToPayCard`, and the data modules already written: `rosterApi`, `attendanceApi`, `calendarApi`, `courseManagementApi`, `messagingApi`, `staffTasksApi`, `staffTimeApi`, `holidaysApi`, `inquiriesApi`, `certificatesApi`, `discussionsApi`, `invitationsApi`. The tournament side uses the scoped `.rc-theme`; the LMS stays light.

Invite mail links: `mailto:` (default app), Outlook web (`https://outlook.office.com/mail/deeplink/compose?...`), Gmail (`https://mail.google.com/mail/?view=cm&...`), plus Copy; students in BCC; batches of about 40 to stay inside link length limits.

## 9. Testing

- **Database (built):** `supabase/tests/rls/*.mjs` impersonate real roles and run inside a rolled-back transaction. Nine suites, 486 checks, all independent of the demo data: 0016-0021 regressions (15), 0023 (22), 0024 (45), 0026 chat (97), 0027 tournaments (149), 0028 (54), 0029 (56), 0033 tasks and staff attendance (34), 0036 reviews and certificates (14). Run them all after any policy change. See `supabase/tests/README.md`.
- **Browser (to build):** small role-based Playwright suite, one worker: school registers and is verified; invites; student joins and sees tournament first; school A cannot see school B; revoke hides tournament; chat live between two sessions; team apply shows the QR step. The old mock-based specs are deleted once the old pages are replaced. Known pre-existing failures: 5 dark-mode contrast specs and one theme-toggle spec.

## 10. Progress tracker

- [x] Cleanup: 33 test signup accounts deleted
- [x] Migrations 0022-0032 live, 438 database security checks passing (`supabase/tests/`)
- [x] `lib/portalApi.ts`, `lib/inviteMail.ts`, `lib/chatApi.ts`, `lib/tournamentPortalApi.ts`
- [x] Portal foundation: auth states in `AuthProvider` and `ProtectedRoute`, UI kit (`portal/kit`), per-role routes, demo seed (`supabase/tests/seed-demo.mjs`)
- [x] Auth and public screens: login, register school, join with school link, personal invite, Hanbee staff application, pending, suspended, school-inactive; `/tournament` is marketing only
- [x] Chat (WhatsApp-style): list, thread, ticks, unread, typing, group info with add/remove for those allowed, realtime with polling fallback
- [x] Shared pages: announcements (site-wide and per school), schedule (day, week, month), tasks, settings
- [x] Student portal: Tournament | Learning slide switcher, tournament overview, leaderboard, team, learning overview, courses and applying, closed-school banner with switch to solo
- [x] School staff portal: overview (Tournament | Learning), students, bulk invite by own mail app, invitations, co-teacher invite with copy link, teams, courses
- [x] Hanbee staff portal: my space (clock in/out, tasks), tournament management, LMS overview (with quiz review), schools directory with first-verifier-wins, school detail, courses with student table, applications
- [x] Manager portal: monitor, verifications, schools, Hanbee staff overview
- [x] Old mock pages (48 files) and 29 obsolete browser specs removed
- [ ] Browser suite: no `frontend/tests/e2e/` directory exists in this checkout, so the previously recorded 77-pass result is not verifiable here
- [x] Student dashboard redesigned as a simple template-style portal, with a real attendance page; solo option appears only when a school closes (join another school or continue solo)
- [x] Tasks redesigned: List and Board, Low/Medium/High priority, manager-only "All employees' tasks" tab (read only); Tasks menu for Hanbee staff, school staff and manager
- [x] Schedule redesigned like the reference: Week, Day, Month, mini calendar, holidays on the calendar, manager adds and deletes holidays; manager gets a Schedule menu item
- [x] Hanbee staff Attendance page; manager performance view (late, absent, high-priority tasks, detail panel) and a Working hours card
- [x] Lesson reviews and certificates for all roles: Hanbee staff Reviews (Waiting/Verified/All, verify, countdown to the 10-minute automatic unlock) and Certificates (search, verify box); manager read-only versions; school staff Lesson reviews and Certificates tabs on Courses; student Reviews, Certificates and a printable certificate page
- [x] Team-formation database backend (migrations 0038-0039): school team slots, configurable team size, student captains and invitations, same-school membership, proposal/return/approval flow, synchronized team chat, and role-scoped statistics; covered by `supabase/tests/rls/0039_team_formation.mjs` (58 assertions)
- [x] Student and school-staff team pages use the team-formation RPCs; solo students can create and submit a paid entry for Hanbee review
- [x] School staff, Hanbee staff and manager dashboards restyled to match the student template look (revoked invitations hidden behind a toggle; manager Monitor gains Recent sign-ins, one row per person)
- [x] Demo data for every page of every role (`supabase/tests/seed-demo.mjs` then `seed-demo-full.mjs`), a safe `cleanup-demo.mjs` (dry run by default; `--yes`, `--rollback-test`, `--include-seeded`), and an on-demand `demo-content.spec.ts` (`DEMO_CONTENT=1`) that opens every page for all four roles and screenshots it
- [ ] Tasks: subtasks (owner has not yet said yes or no)
- [ ] Visual review of every screen at 1280px and 390px by someone other than the builder (builders read screenshots for some screens only)
- [ ] Untested-by-browser flows: team create, add, apply and withdraw; solo team-of-one apply; course apply; closed-school banner; suspended and school-inactive pages
- [ ] Delete the demo data before real users (see launch checklist)
- [ ] Handover pass: final `docs/FRONTEND_CONTRACT.md` review for the polished redesign

### Known gaps (found while building, not yet fixed)
- Write functions in `portalApi.ts` and `tournamentPortalApi.ts` return only true or false, so screens show a generic "the server refused" message instead of the database's own reason.
- `chatApi.ts` cannot tell a rate-limit refusal from a contact-rule refusal and exposes no read state (`chatExtras.ts` in `portal/chat` works around both).
- Tasks have no pin (the table has no pinned column); open tasks are listed first.
- The verifications page cannot show a school's registration number (only the school detail page can).
- Old draft courses ("Untitled Skip Test", "Intro to Robotics", about 20) from earlier test runs still sit in the database.
- Only the student switcher pill slides; page content fades rather than slides.
- `lib/rosterApi.ts` is now unused (kept as a data module).

## 11. Launch checklist (before real users)

The one-manager unique index is in migration 0048; still write and verify its recovery procedure. Rotate the database password and Gemini key; replace seeded test accounts (`ava@student.edu`, `jamie@hanbeelms.edu`, `morgan@hanbeelms.edu`) or change their passwords; verify the permanent manager account; set JWT expiry in the dashboard; configure SMTP for password reset and email confirmation (signup is currently auto-confirmed); review privacy text for monitoring minors and guardian consent; set the real tournament date and venue; rate-limit and add CAPTCHA to the public inquiry form; configure the AI function's allowed origin; upgrade the Supabase plan if concurrent users grow.

## 12. Later (not this phase)

Real payment gateway; SMTP and email confirmation; certificates and discussions screens; chat media, voice, reactions, search, push; staging project and CI security suite; mandatory manager two-step login; the other developer's polished UI.
