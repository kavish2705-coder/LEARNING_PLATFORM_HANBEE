# Hanbee Landing Page Improvement Plan

**Status:** Landing-page copy refreshed on 2026-11-06; layout and interaction redesign remains a separate review item.
**Reviewed:** 2026-11-03; copy refresh: 2026-11-06
**Scope:** Public landing page, navigation, landing-page media and animation, FAQ, footer, and landing-page calls to action. Dashboard redesign is out of scope.

## Review baseline

The review covered the live landing page after a fresh reload, its page and stylesheet, the `Hero`, `Navbar`, animation primitives, ambient canvas, and independent-student modal. The shared browser initially showed a stale Next.js runtime error; restarting the local preview and reloading cleared it. The fresh page compiled and returned HTTP 200. The visible desktop design uses full-bleed RC-car imagery, a dark palette with amber accents, a fixed navigation bar, and a long sequence of content sections. A narrow viewport DOM check did not report document-width overflow, but the global stylesheet hides horizontal overflow; this is therefore not proof that every child layout fits. A full mobile visual and keyboard review remains necessary.

Relevant implementation surfaces:

- [`frontend/src/app/page.tsx`](../frontend/src/app/page.tsx) — page sections, FAQ, footer, and student modal
- [`frontend/src/app/page.module.css`](../frontend/src/app/page.module.css) — section layout, cards, and responsive styles
- [`frontend/src/components/Hero/Hero.tsx`](../frontend/src/components/Hero/Hero.tsx) and [`frontend/src/components/Hero/Hero.module.css`](../frontend/src/components/Hero/Hero.module.css) — hero media, headline, and CTAs
- [`frontend/src/components/Navbar/Navbar.tsx`](../frontend/src/components/Navbar/Navbar.tsx) and [`frontend/src/components/Navbar/Navbar.module.css`](../frontend/src/components/Navbar/Navbar.module.css) — fixed navigation and responsive behavior
- [`docs/UI_REDESIGN_AUDIT_PLAN.md`](./UI_REDESIGN_AUDIT_PLAN.md) — existing product and audit context, including the learning availability gate

## Direction to preserve

Keep the recognizable Hanbee motorsport identity: real RC-car photography, a dark track-inspired canvas, restrained warm amber accents, and confident editorial typography. Aim for **premium race engineering editorial**, not a generic SaaS landing page: precise hierarchy, purposeful negative space, authentic imagery, and motion that supports the story rather than competing with it.

The original car photo in the “Two liveries” section should remain a photo. This plan does not propose replacing it with an SVG or another car illustration.

## Findings to address

| Priority | Finding | Why it matters |
|---|---|---|
| P0 — trust | The landing page promises classroom features such as self-paced video and notes, auto-graded checks, and per-course progress. Existing audit notes say student learning routes are gated behind a “Coming soon” state for non-preview accounts. | Visitors may be promised a currently unavailable product. Confirm the real launch/preview state and each claim before polishing or amplifying it. |
| P1 — mobile navigation | At widths up to 900px, the navigation links are hidden. The inspected `Navbar` has no menu control or alternate navigation for those links. | Mobile visitors lose direct access to Courses, For Educators, and About. Provide an accessible compact navigation pattern or another deliberate mobile navigation treatment. |
| P1 — accessibility | The “Skip to content” link targets `#main`, but the main element contains both the navigation and page content. | The link does not bypass the navigation as expected. Move the target to the start of the actual page content and verify keyboard behavior. |
| P1 — first-screen contrast | In the fresh desktop screenshot, the fixed header sits over a bright portion of the hero image while the header text/backdrop is very subtle at the top of the page. | Logo and navigation legibility can vary with the image frame. Establish reliable contrast across the full hero, not just where the background happens to be dark. |
| P1 — story and page length | The page moves from the hero and ticker through benefits, two product tracks, four course stages, an exploded-parts image, a second car photo, a school flow, a brand statement, FAQ, and footer. Several sections repeat the same “learn/build/race” proposition. | The length and repeated messages can dilute the core offer and delay the visitor’s next step. Shape the sections into a clear, concise story while retaining the strongest proof. |
| P1 — conversion clarity | The hero presents “Start Learning” and “Independent Student”; the fixed header and later sections repeat account actions, while school registration follows a separate signup route. | Validate that each audience understands the next step and lands in the intended signup flow. Keep calls to action consistent without removing needed student and school paths. |
| P2 — motion and media | The hero switches to a still image for reduced-motion users, but the school video is played by an intersection observer without checking reduced-motion preference. The school video has no poster and uses `preload="auto"`. Multiple sections also animate into view. | Respect motion preferences consistently, provide a dependable still frame, and avoid unnecessary media downloads or playback—especially on mobile and slower connections. |
| P2 — visual consistency | Multiple sections combine full-bleed media, gradients, blur, glass cards, ambient effects, and glow treatments. Several content sections also use large inline style blocks. | Refine a small set of repeatable section, type, surface, and spacing treatments so the experience feels intentionally art-directed rather than effect-heavy. |
| P2 — navigation state | The header marks “Home” active initially and updates the active item on click, rather than reflecting the section currently in view. | The visual active state can become inaccurate during scrolling and does not communicate current location semantically. |
| P2 — claim clarity | Copy uses product-specific terms (for example “FC”) and makes detailed claims about mentors, school verification, payments, courses, and competition. | Confirm terminology and operational details with the product owner; explain unfamiliar terms and avoid unsupported promises. |

## Full-page component and interaction inventory

This inventory makes the planned redesign concrete at the level of visible and interactive elements. “Audit” means inspect, test, and agree on behavior; it does not authorize changing or removing a component without review. The live feature/API state and conversion routes must be verified before copy or behavior is finalized.

| Page area / component | Elements to design and verify | Required states, behavior, and decisions |
|---|---|---|
| Page frame and skip link | Main landmark, section order, anchor targets, skip link, page background, focus navigation. | Skip link must focus/land at the start of actual page content without trapping the user behind the fixed nav. Define visible focus treatment, smooth-scroll behavior for reduced-motion users, sticky-header anchor offset, heading order, and a single clear page-level `h1`. Verify anchor links with keyboard, screen reader, direct URL fragments, and browser back/forward. |
| Fixed header and wordmark | HANBEE logo link; Home, Courses, For Educators, About links; Sign In text link; Get Started button with arrow; transparent-to-solid scroll backdrop; fixed position and height change. | Define top-of-hero and scrolled states with stable contrast over every frame of the hero. All links need default, hover, keyboard focus, active/current-section, and pressed states; focus must not be clipped by the fixed bar. Active state must follow the actual section/current location, not only the last clicked item. Logo needs an explicit home destination and accessible name. Preserve navigation access below 900px with a deliberately designed menu/drawer or compact layout, including open/closed state, Escape/outside dismissal, focus behavior, scroll locking if modal, and destination selection. Respect reduced motion for entrance, spring resizing, blur and active underline. |
| Hero media and overlay | Hero video, poster/still fallback, object position/crop, dark readability gradients, image fallback, parallax wrapper. | Keep media decorative unless meaningful information is conveyed; avoid redundant alternative text. Confirm video playback, pause/stop behavior, autoplay constraints, reduced-motion fallback, data-saving/mobile behavior, poster loading, and failure state. Test contrast against bright car/body/table areas and ensure all copy/controls remain readable at alternate crops and short/tall viewports. No essential text may depend on video being available. |
| Hero intro and headings | “Learn · Grow · Belong” badge and dot; two-line H1; SVG underline; supporting statement. | Maintain an accessible, uninterrupted heading in the accessibility tree even if visual word animation remains. Verify line breaks, wrap, text zoom, 320px widths, localization/long copy, and heading hierarchy. Badge dot and underline are decorative and hidden from assistive technology. Ensure underline never collides with text and does not become an unexplained focus/interactive affordance. |
| Hero primary and secondary actions | “Start Learning” anchor and “Independent Student” modal button (or fallback link if modal callback is absent); arrow icons. | Product-owner-approved labels and destinations; distinguish the primary account path from independent-student inquiry/registration. Test keyboard activation, focus-visible, hover, active, visited/disabled where relevant, tap size, contrast, no layout shift, and arrow motion. Decorative arrows must be hidden from assistive technology; text must fully name each action. Never animate scale in a way that clips focus or causes layout/target instability. |
| Scrolling ticker | Duplicated ticker copy, amber dots, continuous marquee directly below hero. | Decide whether ticker is meaningful content or decoration. If decorative, ensure it is not read twice; if informative, expose an equivalent stable text list. Check seamless loop, speed, clipping, touch/keyboard expectations, pause behavior, reduced motion, and that it does not compete with the hero CTA or create motion discomfort. |
| “An LMS built for doers” section | Background photo, dark overlays, glass panel, eyebrow, heading/body copy, four numbered benefit rows. | Check text contrast and card legibility over the photo; tune crop and overlay independently. Numbering should communicate order only if ordered; otherwise use non-semantic decoration. Rows are currently informational, not links: do not show hover motion that implies clickability unless they become real links. Validate each benefit claim and the unfamiliar “FC” terminology. Review desktop two-column and mobile stacking order, card padding, row density, and focus/hover affordance consistency. |
| Tournament and classroom track cards | Track-section background photo/overlay, ambient canvas, section eyebrow/title, two cards, tag, title, descriptive paragraph, checkmark bullet list. | Confirm course availability and each promise (lesson formats, auto-grading, progress tracking, tournament entry, solo entry, live results, verified rosters). Distinguish active vs preview/unavailable features honestly. If cards are not links, keep hover/tilt from suggesting clickability; if a CTA is added, make the full action and destination explicit. Check mobile grid minimum widths (the current 380px min can exceed narrow viewports), text wrapping, card reading order, consistent checkmark alignment, icon contrast, and actual list semantics. Check decorative checks are hidden from assistive technology. |
| Curriculum / “Inside the RC track” cards | Four numbered stages, title and one-line descriptions, hover/tilt and reveal animation. | Verify curriculum stage order and real curriculum content. Decide whether cards are informational or navigable; do not make non-interactive cards look like buttons. Preserve readable numbered sequence in text, consistent card height, small-screen wrapping, touch behavior, and keyboard focus only if the cards become interactive. |
| Build showcase | Section eyebrow, headline, explanatory copy, exploded car component image inside photo frame/vignette. | Keep as a supporting technical illustration; preserve image rather than substituting an animation. Confirm all labels in the supplied image are legible at phone width and not repeated inaccurately in alt text. Use concise alt text if the image is meaningful, or empty alt if entirely redundant with adjacent copy. Check image loading dimensions/aspect ratio, crop, sharpness, watermark/overlay treatment, reveal motion, and no content clipping. |
| “Two liveries” photo banner | Number eyebrow (#09 · #23 · #60), heading, original side-by-side car image, shared photo frame, watermark patch. | Keep the original car photo; do not replace it with an SVG or generated technical drawing. Verify the three numbers and caption are factually accurate, both cars remain visible at every width, the watermark treatment is subtle and does not obscure the cars, and alt text matches the actual photo. Check image loading/CLS, frame treatment against other photos, and responsive margins. |
| School / educator section | Racing video background, overlay, glass panel, section copy, “Register your school” CTA and arrow, top-down car image, four numbered onboarding steps. | Confirm registration route, verification process, invite workflow, and course-progress claims. Ensure video has poster/still fallback and does not autoplay for reduced-motion users; pause when irrelevant/offscreen if appropriate. Establish mobile sequence (what schools get, how to start, proof), avoid three-column compression, make all steps legible, and validate CTA focus/hover/pressed states and destination. Treat numbered steps as an ordered list, not decorative boxes. |
| About / final persuasive section | Macro photo background, overlays, long centered value statement, “Start learning” CTA with arrow, “ask a question” link. | Keep this from repeating the hero verbatim; state one distinct reason to trust/choose Hanbee. Verify the photo crop and contrast over all text. Ensure the CTA uses the correct account path and secondary question link is discoverable, underlined/focus-visible, and not confused with an account-creation action. Review line length, text scale, and spacing between statement, CTA, and help link. |
| FAQ accordion | Questions heading, four native `details/summary` items, custom plus-to-X indicator, answer copy. | Keep native keyboard behavior unless replacing it with a fully equivalent accessible pattern. Verify summary focus indicator, `Enter`/`Space`, expanded state announcement, plus/X visual state and contrast, and answer reading order. Decide whether multiple items can remain open. Ensure target row is comfortably tappable, long questions wrap without colliding with the icon, and answers do not animate in a way that causes scroll jumps. Validate claims on payment, solo entry, car requirements, and student continuity with product/policy owners. |
| Footer | HANBEE wordmark and tagline; Platform links; Account links; copyright year. | Use semantic navigation landmarks and heading labels; verify all destinations, accessible names, keyboard focus, link contrast, and reasonable tap spacing. Avoid tiny low-contrast copyright and labels. Verify the dynamic year and ensure footer links work at narrow widths without awkward orphan columns. |
| Independent-student modal: opening/closing | Modal trigger, overlay/backdrop, close X icon, card entrance/exit, page behind modal. | Give the dialog a programmatic name and modal semantics; move focus into it, trap focus while modal, close with Escape, restore focus to the exact trigger, and prevent background interaction/scroll where appropriate. Backdrop click should not unexpectedly discard user-entered information; define unsaved-data confirmation/preservation. Close icon needs visible focus, adequate target size, and an accessible name. Respect reduced motion and safe-area/inertial scrolling on mobile. |
| Independent-student modal: intro and options | “Solo Driver Entry · 2026 Season” live-pulse dot, heading/subtitle, three track-selection cards with badge/radio visual, five location chips, conditional “Other City” input. | Confirm season text, availability, shipping/hub regions, track catalog, and claims before presenting as current. Replace custom clickable divs with a semantically correct, keyboard-operable radio group or equivalent; expose selected state, group label, focus, and arrow-key behavior. Location choices need a labelled single-choice group and selected state (`aria-pressed` or radio semantics); ensure chip labels and hub subtext remain distinguishable. Animate the Other-city field without hiding validation/focus or causing abrupt layout shifts; associate its label and instructions. |
| Independent-student modal: contact form | Full name, phone/WhatsApp, email, optional experience/goals textarea, required markers, placeholders and native validation. | Associate every input with a real `<label>`; required state cannot rely on a colored dot alone. Add clear format/help text and errors, preserve user input on retry, appropriate autocomplete/input modes, phone-country assumptions, and accessible focus-on-error. Review field order and two-column-to-one-column behavior. Avoid placeholder-only instructions. Confirm privacy/consent and retention messaging with product policy before collecting personal data. |
| Independent-student modal: submit/error/success | Submit arrow, disabled “Securing Entry…” state, API error box, success flag icon, success copy, follow-up promises, “Return to Platform” button. | Use one submission in flight, announce pending/error/success via appropriate live regions, prevent duplicate submissions, and restore an actionable retry path without clearing entered data on failure. Confirm endpoint success semantics. The current success view says “entry confirmed” and promises kit/curriculum/mentor follow-up; verify the endpoint actually guarantees all of these before displaying them. If only an application request is saved, use request-received language rather than confirmed-entry language. Ensure focus moves to success/error summary, and exit returns focus appropriately. |
| All controls and icons | Every anchor, button, FAQ marker, checkmark, arrow, close icon, live dot, numbered marker, and decorative canvas across the page. | Create a small icon grammar (consistent size, stroke, alignment, accent use). Every icon-only control needs an accessible name; decorative icons use `aria-hidden`/equivalent. A text-labelled action’s icon must not duplicate its spoken name. Define default, hover, focus-visible, active, disabled, loading, and error states. Restore visible keyboard outlines (global button reset currently removes default outline) with theme-safe focus rings; do not use color alone to indicate selection/status. Audit target size and separation for touch, SVG scaling, and icon/text baseline alignment. |

### CTA and destination map

| Visible action | Current behavior/destination | Plan and verification |
|---|---|---|
| Header HANBEE logo / Home | `#` / page top | Give both a stable home target; keyboard focus must be visible and fixed-header scroll must not obscure the destination. |
| Header Courses / For Educators / About | `#courses`, `#educators`, `#about` | Preserve valid section anchors, active-section state, mobile access, and header-offset behavior. |
| Header Sign In | `/login` | Confirm unauthenticated and already-authenticated behavior and return path. |
| Header Get Started | `/login?mode=signup` | Confirm role selection and avoid a generic CTA that loses the visitor’s intended path. |
| Hero Start Learning | `/login?mode=signup` | Product owner to confirm learning availability, intended audience, and signup destination before retaining this label. |
| Hero Independent Student | Opens the `IndependentStudentModal`; fallback path is `/login?role=Student` when no callback is supplied. | Keep one consistent real journey. Verify modal API outcome and ensure fallback does not silently bypass the application flow. |
| School Register your school | `/login?mode=signup&role=School` | Verify role preselection, verification expectations, and return state. |
| About Start learning | `/login` | Align wording and destination with the approved student acquisition path; avoid inconsistent behavior with the hero CTA. |
| About ask a question | `/apply` | Confirm that this form is appropriate for a visitor question and that it is keyboard-accessible. |
| Footer Platform links | `#courses`, `#educators`, `#about` | Same section target, focus, active-state and mobile behavior as header links. |
| Footer Account links | `/login`, `/login?mode=signup` | Ensure the labels and destinations match header actions and the approved signup journey. |
| Modal Close / Return to Platform | Closes and resets the modal form | Define whether close should reset or preserve fields; avoid silent data loss; return focus to the opener. |
| Modal Submit Registration | POST to `/api/independent-student` | Test pending, success, server error, network failure, retry and duplicate-click behavior. Success wording must reflect only what the API actually confirms. |
| Track and location choices | Set selected track/location; “Other City” reveals a required field. | Expose selection programmatically and visibly; keyboard-operable group semantics, focus state, validation and clear reset behavior. |
| FAQ summaries | Native disclosure open/close | Verify expanded state, keyboard activation, focus, and whether multiple answers may stay open. |

### Global visual and motion specification

- **Visual hierarchy:** establish one page-level H1; clear H2 section titles and H3 card titles; consistent eyebrow, body, metadata and fine-print styles. Control reading width, line length, whitespace, and section transitions so the page feels like a deliberate editorial journey.
- **Buttons and links:** define primary, secondary, text-link, and icon-only (only if needed) variants. For each, specify dimensions, typography, radius, icon size/gap, contrast, default/hover/focus/pressed/disabled/loading states, and mobile target size. Hover is supplemental; keyboard focus and touch feedback must remain clear.
- **Iconography:** standardize arrow direction, checkmark, close, FAQ expand/collapse, status/live dot and success indicator. Verify decorative vs informative semantics; do not introduce new icons to decorate every heading or list.
- **Color and surfaces:** retain the dark motorsport / warm amber identity, but document exact text/surface/border/focus/overlay colors and contrast. Glass blur, glow and gradients should be used only where they improve separation or readability; include a solid fallback for browsers without backdrop filters.
- **Typography:** preserve distinctive Hanbee display typography; measure real rendered font weights/fallbacks, avoid excessive uppercase tracking on small text, and test zoom/wrap at 200%.
- **Spacing and responsive grid:** define page gutters and section rhythm by viewport; check 320/390px phones, 768px tablet, 1024px compact desktop and 1440px wide desktop. Prevent grid min-content overflow, awkward two-column forms, off-screen fixed UI and oversized vertical gaps.
- **Motion inventory:** document the navbar entrance/scroll spring; hero parallax/text fade/word cascade/underline draw; CTA hover/tap/arrow; ticker; section reveals; card tilt; row/chip hovers; ambient canvas particles; school video; FAQ icon; modal open/close; conditional location field; and any scroll behavior. Each motion gets a purpose, trigger, duration/intensity, interruption/fallback, and reduced-motion behavior. No essential content may be delayed behind animation; pause/stop nonessential continuous motion where needed.
- **Performance and resilience:** include image dimensions/aspect ratios, poster and fallback states, lazy/deferred offscreen media, video pause policy, canvas visibility/cleanup, font fallback, and degraded-network checks. Measure before optimizing; avoid autoplaying multiple costly effects at once.
- **Form truth and privacy:** validate that the modal represents an application/request rather than a confirmed tournament entry unless the backend confirms actual entry. Confirm personal-data purpose, retention, consent/privacy copy, and follow-up channels with the product owner before keeping phone/WhatsApp and location collection.

## Proposed work sequence

### Phase 0 — Confirm the product truth

1. Decide whether classroom learning is available, preview-only, or not yet launched; align the landing-page course claims and signup destinations with that state.
2. Verify each claim about tournament entry, solo participation, school verification, mentorship, course formats, results, payments, and student data retention against the live product and approved policy.
3. Confirm the intended primary audiences and conversion goals: independent students, school staff, or both.

**Exit:** Every public-facing feature claim and CTA destination has an owner-approved source of truth.

### Phase 1 — Establish the baseline and interaction-state map

1. Capture the full page at desktop and mobile sizes, including all hover/focus/pressed states, FAQ open/closed, modal form/error/success states, footer, and every CTA destination.
2. Record an interaction inventory for each link, button, selection, accordion, modal field, decorative icon, media element, and animation using the component inventory above.
3. Add a usable mobile navigation pattern; verify all anchor links, fixed-header offsets, keyboard operation, active state, focus visibility and Escape behavior.
4. Correct the skip-link target; test heading/landmark order and visible keyboard focus.
5. Test the independent-student modal end-to-end, including server/network failure, retry, selected options, Other-city field, success, dismissal, and focus return.
6. Establish button/icon guidelines and capture before-state visuals for the agreed viewport matrix.

**Exit:** Every visible control and state is inventoried, its intent and destination are known, and all high-risk accessibility/trust gaps are documented.

### Phase 2 — Refine content and section composition

1. Organize the page around a simple narrative: what Hanbee is, what students build/learn, how schools participate, credible proof, and a clear next step.
2. Consolidate repetitive explanatory copy; retain only the strongest sections and real supporting imagery.
3. Preserve the existing car photography and editorial motorsport identity while using fewer competing background effects and card treatments.
4. Give each section a distinct job; define transition logic between hero, benefits, tracks/curriculum, physical build proof, schools, FAQ, and footer.
5. Use audience-specific, concise copy; explain acronyms at first use and distinguish verified product capabilities from future plans.
6. Confirm the original two-car photo remains a photo and set approved image crops/alt-text for each meaningful image.

**Exit:** Each section has a unique job, the page is easier to scan, and the student/school paths remain understandable.

### Phase 3 — Detailed visual system and component states

1. Define the landing page’s type scale, spacing/layout grid, photo frames, card/surface treatments, and responsive rules.
2. Specify button/link variants and every interactive state. Verify CTA hierarchy, focus rings, hover/tap feedback, loading/disabled behavior, and motion of inline arrows.
3. Define icon sizing/weight/semantics and the selected/expanded indicators for FAQ, track cards, location choices, and modal close/success states.
4. Validate contrast, legibility, focus visibility, semantic headings/labels, alt text, native accordion behavior, and touch size at all specified viewports.
5. Respect `prefers-reduced-motion` across Framer Motion, CSS, parallax, marquee, ambient canvas, and video. Avoid hiding content until an animation runs.
6. Provide suitable poster/fallback imagery; specify media loading/playback behavior for visibility, viewport, and connection conditions.
7. Check layout shift, image/video transfer, canvas cost, font fallback, and animation jank; optimize only after measuring.
8. Review browser console and hydration behavior after clean reloads, separating stale development-server errors from reproducible page issues.

**Exit:** The page remains understandable without animation, media failures, or a mouse, and loads smoothly on representative mobile conditions.

### Phase 4 — Validate the complete landing journey

- Review at 320px, 390px, 768px, 1024px, and 1440px widths; check for clipping, horizontal overflow, text collisions, and awkward image crops.
- Keyboard-test from the skip link through navigation, CTAs, FAQ, modal selections/fields/errors, and footer; verify focus order, visible focus, selection semantics and focus return.
- Test each CTA, inline icon affordance, nav active state, mobile menu state, FAQ open/close, modal open/close, conditional field and form submission state.
- Verify every CTA and navigation destination for independent students and schools, including error, cancel, and back-navigation paths where applicable.
- Recheck all copy and modal success promises against Phase 0 decisions; test reduced motion, blocked/slow media, fallback fonts and mobile touch use.
- Capture before/after screenshots for the full page and key interactive states; run project type/build checks and focused accessibility/performance checks.

**Exit:** All routes and claims are verified, no critical mobile or accessibility defects remain, and the visual changes are reviewed across the full page.

## Success criteria

- Clear, accurate explanation of the student and school journeys above the fold and at their relevant calls to action.
- No advertised capability contradicts the actual availability or signup flow.
- All navigation destinations are reachable on mobile and by keyboard.
- The skip link bypasses navigation and lands at the primary content.
- Every button/link has a distinct purpose and correct destination; every interactive control has designed default, hover/focus, pressed, disabled/loading, and error states as applicable.
- Every decorative icon is hidden from assistive technology; every informative or icon-only control has an accessible name; status/selection is not communicated by color alone.
- The modal has correct dialog semantics, field-label associations, keyboard selection semantics, validation/retry behavior, truthful success copy, and focus entry/containment/return.
- Every animation has an explicit purpose and reduced-motion/static fallback; no content depends on animation to appear.
- No horizontal overflow or overlapping content at the specified viewport widths.
- Text and controls maintain WCAG AA contrast; keyboard focus is visible; reduced-motion users are not forced into decorative motion or video.
- Real Hanbee car photography and the established motorsport character remain central to the design.

## Approval gate

This is a plan for review, not authorization to redesign. No implementation is included. Once approved, begin with Phase 0 and Phase 1, then review the proposed page flow before visual implementation.
