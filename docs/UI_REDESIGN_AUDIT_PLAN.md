# Hanbee UI Audit & Premium Redesign Plan

**Status:** Audit baseline established; the first role-specific action-center slice is implemented. Full page-by-page redesign, multi-theme contrast validation, and visual sign-off remain open.
**Scope:** Current Next.js frontend in `frontend/`, covering public/auth flows, all dashboard roles, responsive layouts, and interactive overlays.

## Executive summary

Hanbee already has a recognizable motorsport identity, role-based dashboards, theme support, reusable UI components, and documented real-user walkthroughs. The next pass should preserve that identity while making every route feel like one intentional product: calm information hierarchy, consistent spacing and typography, dependable loading/error/empty states, accessible interactions, and layouts that work on phones as well as desktop.

“Premium” here means speed, clarity, and trust—not more gradients, glass, or animation. Every redesign decision must follow the live route tree, permissions, and backend/API contract. Never fill gaps with invented metrics, synthetic leaderboards, fake activity, or default-completed work.

The audit evidence is mixed in freshness. Existing screenshots predate some documented fixes; older design plans describe a different stack or role model. Treat them as historical context, not a current visual baseline. A complete sign-off requires fresh, authenticated screenshots and interaction checks for every role.

## Current app and audit coverage

### Personas and routes

The Next.js `app/` route tree and role gates are the source of truth; older route lists are not authoritative.

- **Student (school-linked and independent):** overview, driver license, leaderboard, team and team-start wizard, announcements, chat, settings, plus courses, lessons, certificates, attendance, and AI assistant behind the current learning availability gate.
- **School staff:** overview, students/invitations, courses, teams, schedule, announcements, chat, settings.
- **Hanbee staff:** My Space, LMS overview, schools and school detail, courses and editor, tournament entries/results, scrutineering, independent students, applications, license payments, assessment reviews, schedule, attendance, announcements, chat, settings.
- **Manager:** monitor, verifications, schools and school detail, Hanbee staff, tasks, tournament and LMS surfaces, schedule, announcements, chat, settings.
- **Public/auth:** landing page, login, signup, reset password, and apply.
- **Shared and edge routes:** dashboard shell, catch-all/not-found, error boundary, search, notification center, profile menu, theme controls, mobile navigation, confirmation dialogs, modal forms, and toast feedback.

The dashboard route inventory currently contains 47 `page.tsx` files, including role-specific, dynamic, and catch-all routes. Track each route’s owner, access rules, review status, representative states, and screenshot in a route matrix. Do not equate route count or successful loading with completed visual or interaction review.

### Verified findings from current source and existing audit records

| Priority | Finding | Evidence and consequence |
|---|---|---|
| P0 — trust | **Fixed:** the practice checklist previously started with Wheels, Car Body, and Motor checked and its saved values were shared across browser accounts. | `TournamentOverview.tsx` now initializes checks as incomplete and stores/restores values under a profile-specific key. Storage failures are surfaced to the student. Preserve this behavior and verify account switching and storage-failure cases in acceptance testing. |
| P1 — gamification trust | Client-side XP tasks are stored in one browser-wide local-storage key, not per signed-in profile. | `useUserXp.ts` uses `hanbee_completed_xp_tasks_map`; shared devices can carry earned XP between accounts. Scope XP persistence to the authenticated profile and define how existing browser-wide data is handled before presenting XP as account-owned. |
| P1 — audit coverage | Mobile layouts and accessibility have not had a documented whole-app audit; many data-changing actions have not been tested with safe test records. | `FRONTEND_OPEN_ITEMS.html` explicitly lists these as open. Do not treat successful page loads or screenshots as interaction/accessibility sign-off. |
| P1 — stale baseline | Existing dashboard screenshots show older content (including values later described as removed), and older design docs describe a different stack/role model. | Refresh screenshots before making design decisions; mark stale references historical and reconcile current references with the Next.js app and its four roles. |
| P1 — learning availability | Student learning routes are deliberately blocked behind a “Coming soon” overlay for non-preview accounts. | `LearningComingSoon.tsx` gates courses, certificates, AI assistant, and attendance. Decide availability and the intended preview/launch state before spending effort polishing hidden flows. |
| P2 — overlay accessibility | The notification panel is marked as a dialog but currently only closes on Escape/outside pointer; it has no focus-on-open/return behavior or explicit relationship to its trigger. | `NotificationBell.tsx` needs a deliberate non-modal popover/dialog pattern and keyboard/focus behavior. Contrast with the shared `Modal`, which already traps and restores focus. |
| P2 — CSS consistency | `layout.module.css` and other components contain `transition: all`; these make motion/property changes less predictable and are harder to audit for reduced-motion behavior. | Replace with explicit animated properties during the design-system pass; retain the existing reduced-motion protections and audit Framer Motion animations too. |
| P2 — unresolved product decisions | Earlier handover notes identify an ambiguous duplicate course-management page and unsupported settings/features. | Decide whether to remove/redirect or implement the duplicate route; do not show controls for capabilities that have no real backend behavior. |

These are source/document findings, not a claim that every route has been visually tested. Authenticated walkthroughs require authorized, isolated test accounts and disposable data for all four roles; do not alter real user records to create test states.

## First implementation slice — role-specific action centers

The shared `ActionCenter` now surfaces direct next steps on the student, school-staff, Hanbee-staff, and manager overview pages. Items are derived from data those pages already fetch: team/readiness/verified-rank state, school invitations and teams, assigned staff tasks and tournament operations, and manager verification/application queues. No backend changes or fabricated counts were introduced. The student checklist link scrolls to the existing practice checklist; Hanbee task links scroll to the existing task queue. The student practice checklist now starts with all checks incomplete and persists values per signed-in profile.

This is a functional feature slice, not completion of the full audit. Role-wide responsive and accessibility walkthroughs and a fresh authenticated screenshot baseline remain open; the browser-wide local XP store also needs account scoping.

## Recommended design direction

Keep the Hanbee racing/training identity and dark, light, and personalized themes. Refine existing accents, technical typography, and the card-based shell rather than replacing it with a generic SaaS template. Use “premium” to mean composed and dependable:

- **Color and theme:** establish semantic surface, text, border, focus, accent, status, and destructive-action tokens that work in dark, light, and personalized themes. Validate actual combinations; do not assume one accent or fixed color is accessible on every personalized background.
- **Type and layout:** define a legible heading/body/metadata scale, consistent line heights, spacing, content widths, and responsive breakpoints. Preserve readable zoom and long-content behavior.
- **Components:** standardize shared page headers, buttons, forms, status labels, tables, dialogs, loading/error/empty states, and focus styles without forcing different workflows into identical card grids.
- **Information hierarchy:** give each page a clear purpose, a small set of useful verified metrics, prioritized actions, and supporting detail.
- **Truthful data:** distinguish official/verified records from self-reported progress. Missing or failed data must never look like a real zero or successful result.
- **Motion and resilience:** keep motion purposeful and interruptible; honor reduced-motion preferences across CSS, Framer Motion, video, and other media. Use explicit transition properties where practical instead of blanket `transition: all`.

### Design-system guardrails

1. Inventory existing CSS variables, themes, components, and motion patterns before introducing tokens or abstractions.
2. Derive semantic tokens from the current product and validate them in all three supported themes, including personalized accent extremes.
3. Keep the system small: adopt shared tokens and primitives where they remove real inconsistency; avoid a wholesale component rewrite without evidence.
4. Treat touch-target dimensions as a usability target, not a substitute for testing layout, spacing, and mobile ergonomics.
5. Add or adopt test tooling only after confirming the repository’s existing test setup and whether the proposed check can run reliably.

## Implementation roadmap

### Phase 0 — Baseline and product decisions

1. Build a route/access matrix from the current route tree and role gates; mark obsolete plans and screenshots as historical.
2. Confirm learning availability, duplicate course-management ownership, and unsupported settings/features before redesigning affected surfaces.
3. Obtain approved isolated test accounts and disposable representative records for student (school-linked and independent), school staff, Hanbee staff, and manager flows.
4. Capture a reproducible baseline at desktop, tablet, and phone widths in dark, light, and representative personalized themes. Include loading, empty, long-content, error, and overlay states where safe and available.
5. Record known blockers, browser/tool versions, and the exact routes/states reviewed. The role-specific action center is already implemented; validate rather than re-plan it as new work.

**Exit:** route ownership/access, product decisions, test access, known blockers, and baseline evidence are recorded. No production data is used as disposable test data.

### Phase 1 — Shared design system and application shell

1. Inventory current global tokens and shared primitives; define only the needed semantic tokens for typography, spacing, surfaces, borders, status, focus, and motion.
2. Normalize sidebar, header, page title/breadcrumb, search, profile menu, notification center, responsive navigation, and content container.
3. Validate text and non-text contrast in all three themes, visible focus, target size/spacing, text scaling, and reduced motion.
4. Replace risky blanket transitions incrementally with explicit properties and ensure long names, translated copy, and dense content do not break flex/grid layouts.

**Exit:** the shared shell works at phone, tablet, and desktop widths; remains usable with keyboard/zoom; and passes theme contrast review.

### Phase 2 — Role landing dashboards

Redesign and validate each role home independently while using the shared shell:

- **Student:** next race/event, verified standing, team state, readiness checklist, and learning access status.
- **School staff:** student/invitation actions, team status, upcoming event, and real learning participation.
- **Hanbee staff:** review queues, tournament operations, schools/courses, and high-priority actions.
- **Manager:** verification and operational queues, school/staff overview, and clear escalation/actions.

Each tile must link to the relevant workflow and use live, permission-appropriate API data. Empty, loading, stale, and failed requests must be distinct and honest. Do not imply that self-reported checklist completion is official scrutineering or a verified result.

### Phase 3 — Page-by-page role coverage

Apply shared patterns to every route in the coverage inventory. For each page, verify purpose and hierarchy, role/permission behavior, responsive layout, real content, empty/loading/error states, filters/search, pagination or long-list behavior, and every primary/secondary action. Keep domain differences where they help users; do not force every page into the same dashboard-card layout.

### Phase 4 — Popovers, dialogs, forms, and feedback

Audit every interactive overlay as a product surface, including mobile behavior:

- Define separate semantics for non-modal popovers (notifications/profile/search) and modal workflows (confirmations, create/edit forms, payment/details).
- Ensure accessible names and trigger relationships, keyboard open/close, Escape/outside-click behavior, and appropriate focus entry/return. Trap focus only in modal dialogs.
- Add safe-area-aware sizing, contained scrolling, clear cancel/confirm actions, inline validation, disabled/loading states, and unsaved-change protection where applicable.
- Verify toasts and asynchronous errors are announced and do not obscure important controls.

### Phase 5 — Data-backed feature improvements

Prioritize features users can complete with existing, verified data:

1. **Role-specific action center:** validate the implemented overview cards against live API states; surface invitations, team setup, review queues, or verification work with direct links and verified counts.
2. **Useful dashboard search:** search real routes and permitted records; make results role-aware and keyboard navigable.
3. **Actionable notifications:** deep-link to the correct page, preserve read state, expose failure/retry states, and respect browser permission choices.
4. **Student readiness:** retain the profile-scoped, initially incomplete checklist; verify account switching, persistence, invalid stored values, and storage failures. Clearly distinguish self-reported practice from official scrutineering.
5. Add other features only after the user need, data source, permissions, and backend/API contract are agreed.

Do not present two-factor authentication, notification preferences, personal race rankings, payment automation, or other unsupported capabilities as working controls until the required backend behavior exists.

### Phase 6 — Acceptance and regression

- Test every route for all roles, including direct URL access and correct role redirects.
- Test at 320px, 390px, 768px, and 1280px or wider; verify no clipped controls, unintended horizontal scroll, or unusable tables.
- Test dark, light, and low/high-lightness personalized themes.
- Keyboard-only walkthrough: skip navigation, focus visibility/order, dialogs, popovers, tables, forms, and errors.
- Check WCAG AA text and non-text contrast, accessible names/labels, semantic structure, and focus visibility. Run automated accessibility checks where supported, then manually verify keyboard behavior; automation does not replace manual review.
- Verify reduced-motion behavior and media fallbacks, then check supported browsers/devices for navigation, layout, and interaction regressions.
- Exercise all state-changing actions on disposable test data and verify before/after state plus cancel/error cases.
- Capture before/after screenshots for every route and overlay; run the project's build/type checks and focused tests.

## Definition of done

- Every current public and dashboard route is in the reviewed route matrix with a role, access rule, review status, representative states, and fresh screenshot.
- Every high-use overlay and destructive/data-changing action has keyboard, touch, loading, validation, cancel, and error behavior verified.
- No invented/default-completed data is presented as user activity or official records.
- All four roles have polished, responsive home dashboards and consistent downstream pages.
- All three supported themes pass contrast and visual review; reduced-motion users are not forced through decorative animation or video.
- Responsive layouts pass at the agreed phone, tablet, and desktop sizes without clipping or unintended horizontal scrolling.
- Any newly requested feature is connected to its real data/API and has a testable acceptance criterion.

## Current blockers to full visual sign-off

1. Approved authenticated test access and disposable representative data for all four roles are required for full route/state verification.
2. The learning area’s intended launch state and duplicate course-management ownership need product decisions.
3. Existing dashboard screenshots/design plans are not a reliable current baseline and must be refreshed.
4. The browser-wide XP task store needs account scoping and a defined legacy-data handling behavior.

## Related focused plan

The public landing page has a separate, review-only assessment and sequence in [`LANDING_PAGE_IMPROVEMENT_PLAN.md`](./LANDING_PAGE_IMPROVEMENT_PLAN.md). Resolve its product-claim and navigation findings alongside Phase 0/Phase 1 here; do not treat that document as evidence that the landing-page changes have been implemented.
