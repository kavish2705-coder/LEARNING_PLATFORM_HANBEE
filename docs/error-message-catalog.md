# Error message catalog

Why this exists: every error the site shows a user today is the raw
string PostgREST/Postgres returns from an RPC call. Confirmed in
`frontend/src/lib/supabaseAuth.ts`'s `readError()` / `supabaseFetch()`:
on a non-OK response it reads `body.message || body.msg ||
body.error_description || body.error || fallback` and throws that
verbatim as `Error.message`. Every other API wrapper
(`teamFormationApi.ts`, `tournamentAdminApi.ts`, `poolApi.ts`, etc.)
calls through `authenticatedSupabaseFetch`, which is built on the same
`supabaseFetch`/`readError` pair — so this passthrough is universal,
not file-specific. There is currently **no translation layer anywhere**
between a Postgres error and what the user sees.

This catalog is the starting point for writing friendly replacements.

---

## Part 1 — Deliberate, already-readable messages

These are intentional `raise exception '...'` strings already written
into the SQL migrations (latest version of each function only; earlier
superseded versions are omitted). They read fine as-is in most cases —
the main gap is tone/formatting consistency, not comprehension. Grouped
by feature area.

### Auth, signup & invitations
| Function | Message | When a user sees it |
|---|---|---|
| `handle_new_user` | This invitation is invalid or has expired | Signing up with a dead/used invite link |
| `handle_new_user` | This school is not active | Signing up to a suspended/closed school |
| `handle_new_user` | This school link is invalid | Signup via a broken school join link |
| `handle_new_user` | This email has not been invited by the school | Signup email doesn't match an invite |
| `handle_new_user` | A username is required for this account | Student signup missing username |
| `handle_new_user` | School name and the guardian-consent confirmation are required | School self-signup missing fields |
| `handle_new_user` | Signups are by invitation only | Open signup attempt when invite-only is enforced |
| `invite_preview` | This invitation is invalid or has expired | Opening a signup link to preview who it's for |
| `guard_invitation` | only Hanbee staff may invite a solo student | Non-staff trying to invite an independent student |
| `guard_invitation` | you cannot invite students for this school | School staff inviting outside their own school |
| `guard_invitation` | only the school owner may invite school staff | Non-owner school staff inviting other staff |
| `guard_invitation` | only a manager may invite staff or manager accounts | Non-manager inviting Hanbee staff/manager |
| `guard_invitation` | you cannot change this invitation | Editing someone else's invitation |
| `invite_students` / `invite_school_staff` / `invite_students_by_username` / `staff_create_independent_invite` | Two-factor authentication is required for this action. Enroll a 2FA device in your account settings. | Inviting without 2FA enabled (policy-gated action) |
| `invite_students` | this school is not active / no emails given / at most 200 emails per batch | Bulk-inviting students |
| `staff_create_independent_invite` | a full name is required / invalid email / that email is already in use / that email already has a pending invite | Creating an independent-student invite |
| `revoke_invitation` | not allowed | Revoking someone else's invite |

### Schools
| Function | Message | When a user sees it |
|---|---|---|
| `verify_school` / `reject_school` | only the manager or Hanbee staff may verify/reject a school · school not found | Reviewing a pending school signup |
| `set_school_status` | school not found / use verify_school or reject_school / verify or reject this school first / a closed school stays closed | Changing a school's status |
| `rotate_school_join_link` | not allowed / school not found | Regenerating a school's join link |
| `convert_to_solo` | only an active student account can become solo / you still belong to a school | A student converting to independent status |

### Tournaments & entries
| Function | Message | When a user sees it |
|---|---|---|
| `create_tournament` / `update_tournament` | only Hanbee staff may create/edit tournaments · end must not be before start · entry fee cannot be negative · tournament not found | Staff tournament setup form |
| `set_result` | only Hanbee staff may set results · results can only be set for a verified team · rank % is already taken by another team | Staff entering race results |
| `create_team` | only staff of an active school may create a team · this tournament is not open for teams · team name is required · a team with this name already exists | School staff starting a team |
| `create_solo_team` | only an active solo student may enter as a team of one · this tournament is not open for entries · you already have an entry for this tournament | Independent student solo entry |
| `apply_team` | this team has already applied · this tournament is not open for applications · a team must have between 1 and % players · enter the UPI transaction ID / UTR | Submitting a team for review |
| `decide_team` | only Hanbee staff may decide on a team · decision must be verified or rejected · team not found · only an applied team can be decided | Staff approving/rejecting a team entry |
| `tournament_application_queue` | only Hanbee staff or a manager can review tournament entries | Opening the entry-review queue |

### Team formation (school & independent/pool)
| Function | Message | When a user sees it |
|---|---|---|
| `add_team_member` / `remove_team_member` | not allowed · the team can only change while it is a draft · this student is not an active member of your school · this student is already in a team for this tournament | Managing a school team's roster |
| `enforce_team_size` | this team is full (% players) | Adding a member past capacity |
| `enforce_team_slots` / `set_team_slots` | your school has already used all % of its team slots · team slots can only be set while upcoming · choose between 1 and 20 teams · you already have % teams; withdraw one first | School staff allocating team slots |
| `student_start_team` | this tournament is not open for teams · your school staff have not opened team slots yet · you are already in a team for this tournament · give the team a name of up to 40 characters · choose a valid class/division · a team with this name already exists | Student starting a school team |
| `start_pool_team` | only an independent student can start a pool team · this tournament is not open for teams · you are already in a team for this tournament · give the team a name of up to 40 characters · a team with this name already exists | Independent student starting a pool team |
| `invite_to_team` | team not found · only the captain or school staff can invite · the team can only change while forming · you can only invite students of your own school / other independent students · already in a team · no open spots left · already invited | Inviting a teammate |
| `respond_team_invitation` | this invitation has already been answered · this invitation has expired · this team is no longer forming · you are already in a team for this tournament | Accepting/declining a team invite |
| `cancel_team_invitation` | not found / not allowed | Canceling a sent invite |
| `leave_team` | ask your school staff: a submitted team can only change if they send it back · this team has already applied and can no longer be left | Leaving a team |
| `submit_team` | only the captain can submit the team · this team has already been submitted · this tournament is not open for teams · a team needs exactly % players | Submitting a team |
| `return_team` | only a submitted team can be sent back | Staff sending a team back for edits |
| `request_join_team` | only an independent student can request to join a pool team · team not found · you can only request to join an independent pool team · the team can only change while forming · you are already the captain · already in a team · already have a pending request | Requesting to join a pool team |
| `respond_join_request` | decision must be ... · not found · only the captain can respond · already answered · team no longer forming · already in a team · no open spots left | Captain approving/rejecting a join request |
| `join_school` | only an active student can join a school · you already belong to a school · this school link is invalid · this email has not been invited by the school | Student joining a school via link |

### Courses / LMS
| Function | Message | When a user sees it |
|---|---|---|
| `complete_lesson` | not signed in · account is not active · lesson not found · not enrolled in this course · complete the earlier lessons first · the lesson quiz is not unlocked yet | Marking a lesson complete |
| `issue_certificate` | not authenticated · course not found · course has no published lessons · not enrolled in this course · course not completed (% of % lessons) | Claiming a certificate |
| `apply_for_course` | only a student with an active school, or a solo student, may apply · this course is not open for applications · you are already enrolled · enter the UPI transaction ID / UTR · you have already applied | Applying to a course |
| `decide_course_application` | only Hanbee staff may decide · decision must be verified or rejected · application not found · already decided · a section is required to verify · applicant is not an active student | Staff reviewing a course application |
| `enroll_student` | only Hanbee staff may enroll students · the student account is not active · section not found | Directly enrolling a student |
| `reorder_module` / `set_module_order` | only Hanbee staff may reorder course modules · direction must be up or down · module not found · the given order does not match this course / contains a module that doesn't belong | Reordering course modules |
| `add_module` / `add_lesson` | only Hanbee staff may add modules/lessons · title is required | Adding course content |
| `set_lesson_order` | only Hanbee staff may reorder lessons · order mismatch · contains a lesson that doesn't belong to this module | Reordering lessons |
| `guard_discussion_thread` / `guard_discussion_post` | only staff may pin or lock threads · thread is locked · author_id/*_id are immutable | Course discussion threads |
| `course_application_rate_limit` | too many applications submitted recently · too many applications from this email today | Rapid repeated course applications |

### Staff operations
| Function | Message | When a user sees it |
|---|---|---|
| `clock_in` | only Hanbee staff can clock in · you already clocked in today | Staff clocking in |
| `clock_out` | only Hanbee staff can clock out · you have not clocked in today · you already clocked out today | Staff clocking out |
| `guard_time_entry_write` | work_date must be today | Any direct write attempt on a time entry not dated today |
| `staff_attendance` | not allowed · invalid range | Viewing attendance reports |
| `hanbee_staff_overview` | only the manager may view this | Manager-only overview page |
| `manager_assign_staff_task` | only the manager can assign a task · priority must be low/medium/high · a task title is required · the selected staff member was not found | Manager assigning a task |
| `set_account_status` | account not found · you cannot change your own status · Hanbee staff may only act on school staff and students · not allowed · 2FA required | Suspending/reactivating an account |
| `dismiss_independent_student_lead` / `mark_independent_student_lead_converted` | only Hanbee staff and managers can review leads · this lead was not found or has already been reviewed | Managing independent-student leads |
| `invitation_rate_limit` / `pending_schools_cap` / `pending_staff_cap` | too many invitations this hour · too many staff invitations today · too many schools/staff waiting for verification | Hitting a platform rate limit |

### Payments & scrutineering
| Function | Message | When a user sees it |
|---|---|---|
| `staff_mark_payment_received` | only Hanbee staff or a manager can mark payment received · team not found · this entry is not waiting on a payment declaration | Staff confirming a payment |
| `submit_scrutineering_inspection` | only Hanbee staff may record an inspection · invalid status · a completed checklist is required · the checklist must cover exactly the approved items · every item must pass before marked passed · team not found · This inspection changed since you opened it; reload before saving | Staff running a car inspection |
| `team_eligibility` / `get_scrutineering_inspection` | team not found · not allowed | Checking a team's race eligibility |

### Chat & misc
| Function | Message | When a user sees it |
|---|---|---|
| `create_group_conversation` | not allowed · give the group a name of up to 60 characters · add at least one other person · a group can have at most 30 other members · you are not allowed to add this person to a group | Starting a group chat |
| `export_my_data` / `delete_my_account` | not authenticated · account not found · The sole manager account cannot self-delete... · This account has already been deleted | Account data export/deletion (Settings page) |
| `reserve_ai_daily_capacity` / `reserve_ai_user_hourly_capacity` / `reserve_ai_user_minute_capacity` | not allowed · limits/windows out of range | AI feature rate limiting (internal, shouldn't normally surface to users) |
| Many list/overview RPCs (`school_overview`, `school_students`, `course_stats`, `team_statistics`, `list_assessment_reviews`, `list_certificates_overview`, etc.) | not allowed | Generic permission guard on ~15 different read endpoints — same message reused everywhere, worth a single shared friendly replacement |

**278 total messages across 94 functions.** The generic `not allowed` guard alone accounts for roughly 25 of them across unrelated endpoints — a single well-written replacement ("You don't have permission to view this.") would cover most of that group at once.

---

## Part 2 — Raw/leaky errors (the real bugs)

Functions that can still leak a raw Postgres constraint-violation string
straight to the UI, ranked by severity.

### 1. HIGH — `clock_out()` silently misbehaves on the same missing-settings bug as `clock_in()`
**File:** `0107_staff_clock_in_out.sql` (lines 36-60)
**Root cause:** identical to the `clock_in` bug just fixed — `select * into s from staff_work_settings limit 1;` with no existence check. If that singleton row is missing, `s.timezone` is `NULL`, so `v_work_date := (now() at time zone s.timezone)::date` evaluates to `NULL`.
**What happens today:** unlike `clock_in` (which crashes on the `NOT NULL` insert), `clock_out` only *selects* with `work_date = NULL`, which matches nothing — so it falls through to `raise exception 'you have not clocked in today'`. This is a **wrong, misleading message**, not a crash: a staff member who genuinely clocked in earlier today would be told they never did, with no mention of the real cause.
**Fix:** same as the `clock_in` fix — ensure `staff_work_settings` always has exactly one row (the `insert ... where not exists` statement already given to Arun covers this), and ideally both functions should explicitly check `if s.id is null then raise exception 'staff work settings are not configured' end if;` so a future missing-row situation fails loudly and correctly instead of silently returning a wrong-but-plausible message.

### 2. MEDIUM — Same singleton-read pattern, read-only context
**File:** `0033_task_priority_staff_attendance.sql`, latest overridden by `0035_attendance_not_before_account.sql`
**Functions:** `staff_attendance()`, `hanbee_staff_overview()` also do `select * into s from staff_work_settings limit 1;` with no guard.
**What happens today:** both are read/report-only (no insert/update using `s`'s fields in a way that hits a `NOT NULL` column), so a missing settings row would produce `NULL`/wrong computed fields (e.g. "on time" status silently wrong) rather than a crash or raw Postgres error. Lower severity than #1, but worth including in the same settings-row fix since it's the same root cause.

### 3. LOW/INFORMATIONAL — No other unguarded `NOT NULL`/`unique`/`FK`/`check` footguns found at this severity
Swept all `create or replace function` bodies for plain `insert into`/`update` statements outside a `begin...exception when <violation> then raise exception...end` block, cross-referencing known `unique`/`not null`/`foreign key`/`check` constraints. Migration `0117_concurrent_insert_races.sql` already closed the three known double-click/unique-violation races (`clock_in`'s own-day duplicate, `add_team_member`, `join_school`). Everything else doing a risky insert/update (team creation, course applications, pool-team joins, etc.) is consistently preceded by an explicit existence/state check in application logic (e.g. "this team has already applied" is checked before the insert, not caught after), which is why Part 1's messages are the ones that actually surface for those paths — not raw constraint errors. The `staff_work_settings` singleton-read pattern above is the one real outstanding footgun class in this schema; no other config/settings singleton table exists besides `staff_work_settings` and `payment_settings` (introduced in `0110_payment_qr_and_reference.sql`) — `payment_settings` is always read defensively with `?? null`/optional-chaining on the frontend already, and no backend RPC reads it the unguarded way `staff_work_settings` was read.
