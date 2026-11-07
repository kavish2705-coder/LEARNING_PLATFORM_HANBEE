# Pending Tasks

Deferred work, tracked here instead of being built now, with the reason each
item is deferred so it isn't re-litigated later.

## Independent-student landing form — Phase B (needs a domain + paid email)

Phase A (in progress) closes the loop manually: landing form -> a real lead
row -> staff reviews on the Independent Students page -> staff creates the
real invite (already built) -> staff shares the signup link over WhatsApp by
hand. That's deliberately the right scope for now: free tier, no domain yet,
small number of students.

Once Hostinger + a real domain are set up, come back and do:

- **Automatic email on lead approval.** Right now staff taps a WhatsApp
  share button after approving a lead. Once a paid email provider exists,
  fire a transactional email with the real signup link automatically when
  staff approves the lead, instead of the manual WhatsApp tap. The lead
  table, the staff review step, and the real invite RPC do not need to
  change for this -- only the "how the link reaches the student" step gets
  automated.
- **Optionally, WhatsApp Business API** for the same step, if automated
  WhatsApp sending becomes worth the cost at that point -- not needed while
  the manual tap is fast enough for the current student count.
- **Point Supabase Auth's site URL / redirect URLs at the real subdomain**
  instead of `localhost`. Needed for auth email links (password reset,
  confirmation) to work correctly once the app has a real public URL.
- **Revisit whether any other staging-only assumptions break** once a real
  domain exists -- e.g. anything hardcoding `localhost:3001` in generated
  links (the independent-student invite link, the school student invite
  link) needs to resolve from `window.location.origin` already, which it
  does -- confirm this still holds after the domain change rather than
  assuming it.

## Site performance and reliability pass — staging first

The goal is to make the site feel responsive and reliable without making
unmeasured changes or risking production data. Profile the current staging
build first, fix the highest-impact bottlenecks, then repeat the same checks.
Do not apply database changes or deploy optimization work to production until
the staging target is confirmed and the staging checks pass.

1. **Confirm the environment and establish a baseline.**
   - Verify the app's Supabase URL/project reference, deployment environment,
     and Supabase CLI target all refer to staging. Stop if the target is
     labelled production or otherwise ambiguous.
   - **Initial local baseline (2026-11-06):** the frontend production build
     passed with Next.js 15.5.29, type checking, and generation of 66 routes.
     The shared first-load JavaScript is 103 kB; representative first-load
     sizes are 175 kB for `/`, 203 kB for `/dashboard`, 130 kB for
     `/dashboard/courses`, and 192 kB for `/dashboard/chat`. This is a local
     build-size baseline, not a deployed page-load or Core Web Vitals result.
   - A single integrated-browser capture of the local optimized homepage at
     desktop default viewport reported first contentful paint at about
     636 ms, DOMContentLoaded at 553 ms, and load at 736 ms. It transferred
     about 18.3 MB across 20 resources; both `hero-video.mp4` (~3.6 MB) and
     `race-track-video.mp4` (~13.8 MB) loaded, with both video elements set
     to `preload="auto"`. This is a one-run local observation, not a staging
     result; LCP/CLS and interaction latency were not measured.
   - **Public-domain observation (2026-11-06):** the owner supplied
     `https://hanbee.in` as the deployment to inspect. In one anonymous
     desktop browser capture, it returned HTTP 200; response time was about
     407 ms, DOMContentLoaded about 935 ms, and load about 1,963 ms. The
     browser reported FCP about 952 ms and 18.3 MB transferred across 20
     resources, including ~13.8 MB `race-track-video.mp4` and ~3.6 MB
     `hero-video.mp4`; both videos used `preload="auto"`. These are a
     single-run synthetic measurement, not field Core Web Vitals. Because
     `hanbee.in` is the public business domain and its environment was not
     independently verified as staging, treat it as potentially production:
     read-only anonymous check only, no login, account data, or changes.
   - **Environment confirmation is incomplete:** the owner identifies the
     linked `hanbee-staging` Supabase project and Arun deployment as staging,
     and says Supabase Dashboard displays Staging/preview.
     The CLI nevertheless reports the linked Supabase target environment as
     `production`, and the owner selected `.env` while the supplied project
     URL matches `.env.local`; `.env` points to another project. Reconcile
     this in the Supabase Dashboard and deployment settings, and confirm the
     deployed frontend URL before querying remote performance data or making
     remote changes. `https://hanbee.in` is only confirmed as a public-domain
     target; do not assume it is the Arun staging deployment.
   - A remote migration dry run completed without applying anything. It lists
     `0125_chat_group_admin_controls.sql` through
     `0129_razorpay_checkout.sql` as pending; do not apply them until the
     target/environment and migration impact are explicitly reviewed.
   - Record the current frontend build output, route bundle sizes, and page
     load behavior for representative public pages and authenticated student
     and staff flows on desktop and mobile.
   - Measure Core Web Vitals where available. Use these as targets, not
     assumed current results: LCP <= 2.5 seconds, INP <= 200 milliseconds,
     CLS <= 0.1 at the 75th percentile.
   - Record slow browser requests and Supabase/API calls, including endpoint,
     duration, response size, and whether repeated requests are necessary.
     Use test accounts and synthetic data; do not capture student secrets or
     unnecessary personal data.
2. **Profile the frontend before changing it.**
   - **Initial profiling completed (2026-11-06; no code changes):** source
     inspection of the current checkout and anonymous inspection of
     `https://hanbee.in` identify the following candidates. The public domain's
     deployed commit/environment was not verified, so these observations do
     not prove the live page is the current Arun branch.
   - The homepage is a client component and its compiled route chunk is about
     54.5 kB. It uses Framer Motion across the hero and animated sections.
     The shared first-load bundle is 103 kB. Profile with a bundle analyzer
     before considering client/server boundaries or reducing animation code;
     do not remove animation behavior speculatively.
   - On the public homepage, the below-fold track video downloads despite
     playback only starting in an `IntersectionObserver`, because its video
     element sets `preload="auto"`. The hero video also uses `preload="auto"`
     and autoplay, has no poster, and has no video-specific reduced-motion
     fallback. Both were fetched in the browser run and accounted for about
     17.4 MB of the 18.3 MB transfer. Next candidate: retain the hero's visual
     intent while testing an optimized poster/video strategy, and defer
     below-fold media until it is needed. Verify mobile, low-bandwidth, and
     reduced-motion behavior before adopting.
   - Existing precedent: `ExplodedCarArt` supplies a poster, uses
     `preload="metadata"`, and starts playback when in view. Evaluate whether
     the homepage videos can use a similarly deferred strategy without
     changing the intended experience.
   - `InteractiveCar` originally rendered `/rc-car-exploded.png` with a raw
     `<img>`; the public run transferred about 767 kB for that image (natural
     size 683 x 614). The local fix now uses `next/image` with explicit
     intrinsic dimensions, responsive `sizes`, and its default lazy loading.
     The mobile browser run made no image request while it was below the fold,
     then fetched a 384 px optimized source after scrolling: 22.5 kB decoded
     (22.8 kB transferred), about 97% smaller than the original. The desktop
     optimized response was about 55.8 kB, about 93% smaller. The image's
     rendered frame remained 571 x 380 px on desktop and 228 x 380 px on
     mobile; `object-fit: contain` and the existing CSS remain unchanged.
     These are local synthetic measurements; the deployment environment is
     not verified.
   - Google Fonts are requested by both the root layout stylesheet and a
     `globals.css` `@import`, with overlapping font families. The public
     browser saw two Google Fonts stylesheet requests; audit actual font-file
     transfers and required weights before consolidating to avoid removing
     needed typography.
   - The above are prioritized hypotheses/candidates, not implemented fixes.
     After confirming staging, capture repeatable baseline and mobile/
     reduced-motion cases, then make one change at a time and compare.
   - Check route-level JavaScript and shared bundles; identify expensive
     client components, avoidable hydration, and large third-party scripts.
   - Inspect images, fonts, and other static assets for oversized downloads,
     layout shifts, or render-blocking behavior. Initial local inventory found
     `race-track-video.mp4` at about 13.8 MB, `hero-video.mp4` at 3.6 MB,
     `car-assembly.mp4` at 2.2 MB, and `rc-cars-angle.png` at 1.5 MB. Verify
     actual route usage, delivery, and rendered sizes before deciding to
     compress, convert, defer, or replace them. The public directory has 99
     files totaling about 27.4 MB, including about 19.6 MB of video assets.
     The homepage's automatic video preloads are a measured candidate for
     follow-up, but should be validated on the confirmed staging deployment
     before changing playback or loading behavior.
   - Trace slow or duplicate data fetching, excessive refetching, and long
     lists. Consider pagination, query reuse, or lazy loading only where
     measurements show they help and preserve existing behavior.
   - Review loading, empty, retry, and error states so slow requests do not
     look like a frozen page and failures are visible.
3. **Profile Supabase and API workloads on staging.**
   - **Initial code-level profile completed (2026-11-06; no remote query or
     code change):** the staging identity is still unresolved operationally.
     The owner says Supabase Dashboard labels `hanbee-staging` Staging/preview,
     but the linked CLI dry run labels it `production`; therefore no remote
     query plan, Query Insights data, RLS execution plan, or student/staff
     authenticated request timing was collected.
   - `fetchMyCourses()` in `frontend/src/lib/coursesApi.ts` makes up to six
     sequential PostgREST reads (enrollments -> sections -> published courses
     -> modules -> lessons -> lesson completions). These dependencies explain
     some sequencing; profile the endpoint timings and payload sizes before
     replacing the flow with an RPC or batching requests.
   - `fetchCourseContent()` makes up to seven reads; it fetches modules and
     then lessons, fetches active/completed enrollments without an explicit
     student filter, then sections, completions, and materials. The enrollment
     RLS policy restricts students to their own rows but allows staff/managers
     to read all enrollments. Check actual row counts and staff usage before
     narrowing or changing this path; preserve staff preview and lesson
     progress behavior.
   - The local schema defines `UNIQUE (section_id, student_id)` on
     enrollments, whose leading column is `section_id`. The checked-in
     migrations do not define a standalone `student_id`-leading index, while
     the student course-list and RLS queries filter on `student_id`. Treat a
     composite or partial index as a candidate only after staging
     `EXPLAIN (ANALYZE, BUFFERS)`/Query Insights confirms a scan or meaningful
     latency and a migration-safe index benefit. Do not create an index based
     on this static observation alone.
   - The internal progress function calculates per-enrollment completion,
     lesson totals, and activity through correlated subqueries; staff
     `course_stats()` references that progress result for several metrics.
     Profile the actual plans and data volume before considering aggregation,
     caching, or function changes.
   - Static search found no shared frontend request-duration instrumentation
     (`performance.now`, `Server-Timing`, or equivalent). Use browser Network
     traces and Supabase Insights initially; decide whether narrow
     privacy-safe instrumentation is warranted after the staging baseline.
   - For the staging follow-up, capture representative student course-list
     and course-detail requests, staff course catalog/overview requests,
     row counts and response bytes, SQL plans/used indexes, and RLS costs.
     Use test accounts and synthetic or approved test data. Redact access
     tokens, student identifiers, and personal details from any shared
     output.
   - Identify slow/high-frequency queries using Supabase database/query
     insights and request timing. Check query plans and row counts before
     adding indexes or changing query shape.
   - Review indexes, RLS predicates, joins, and N+1 request patterns for the
     measured hot paths. Add schema/index changes only as reviewed,
     versioned migrations; do not create production indexes manually.
   - Check expensive API/Edge Function operations, timeouts, response sizes,
     and error handling. Preserve authorization and entitlement enforcement
     in database policies/functions.
4. **Fix and validate one measured bottleneck at a time.**
   - Prioritize by user impact and evidence; avoid speculative caching,
     broad rewrites, or relaxing RLS.
   - **Completed locally (2026-11-06):** changed the homepage's below-fold
     track video from `preload="auto"` to `preload="none"`. Its existing
     IntersectionObserver still starts playback when it enters view. On the
     same local optimized build/browser, the initial homepage transfer fell
     from about 18.3 MB across 20 resources to about 4.54 MB across 19
     resources, a reduction of about 13.8 MB (75%). The track video was
     absent from initial resource timing, then loaded (~13.8 MB) and played
     after scrolling it into view. The build/type-check passed. This is a
     local synthetic result only; the change has not been deployed or
     verified on the confirmed staging target. No database/API behavior
     changed.
   - **Completed locally (2026-11-06):** replaced the `InteractiveCar` raw
     image with responsive `next/image`, preserving the existing dimensions,
     frame styling, and `object-fit: contain`. On mobile the image stayed
     unfetched below the fold and loaded after scrolling; the optimized image
     response was about 22.8 kB (about 97% smaller than the 766,684-byte PNG).
     A desktop response was about 55.8 kB (about 93% smaller). The production
     build/type check passed. This is a local synthetic result only; the
     change has not been deployed or verified on staging. No API/schema
     behavior changed.
   - Add regression coverage for changed behavior, especially login, student
     course visibility/enrollment, staff workflows, and payment verification.
   - Run the frontend production build, relevant tests, and database/RLS
     suites. Repeat baseline measurements and document before/after results,
     routes, devices, and test environment.
5. **Staging database and release gate.**
   - Review the full pending migration list before any push. The reported
     staging CLI status showed local migrations `0125`-`0129` missing
     remotely, while the CLI labelled the linked project `production`;
     confirm project identity and use a remote dry run before applying
     anything. `0129` may change a test-only ₹1 Driver License price to
     ₹199.
   - After staging verification and approval, plan production changes
     separately: take/confirm a backup, review migration impact and configured
     prices, schedule deployment, monitor errors and query performance, and
     keep a rollback/recovery plan.

## Other items flagged earlier this session, not yet actioned

- Course-access payment activates the student's general `course_access` flag
  but does not identify a course or section. Staff must enroll the student in
  the intended section for it to appear under My Courses. Decide whether to
  keep this manual fulfillment step or associate each paid course offer with
  its section and enroll automatically; test payment-to-course fulfillment
  before relying on it in production.
- School staff role: audited and found no bugs (see session work), but was
  only spot-checked (overview, student invite, team formation UI) -- not a
  full lifecycle walkthrough the way independent students got.
- `chat/page.tsx` and `NotificationBell.tsx` were modified outside this
  session's own commits (seen in `736b3c5` on `Arun`) and have not been
  independently reviewed.
