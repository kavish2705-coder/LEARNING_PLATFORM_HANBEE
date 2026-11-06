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
   - Check route-level JavaScript and shared bundles; identify expensive
     client components, avoidable hydration, and large third-party scripts.
   - Inspect images, fonts, and other static assets for oversized downloads,
     layout shifts, or render-blocking behavior.
   - Trace slow or duplicate data fetching, excessive refetching, and long
     lists. Consider pagination, query reuse, or lazy loading only where
     measurements show they help and preserve existing behavior.
   - Review loading, empty, retry, and error states so slow requests do not
     look like a frozen page and failures are visible.
3. **Profile Supabase and API workloads on staging.**
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
