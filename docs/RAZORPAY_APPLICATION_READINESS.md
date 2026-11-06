# Razorpay application readiness — Hanbee

**Status:** Integration code is implemented; Razorpay merchant approval and
production launch are not verified. The project owner reports that migration
`0129_razorpay_checkout.sql` has been run in Supabase; this workspace cannot
independently confirm the remote database state.

This checklist is for preparing the merchant application, giving Razorpay a
clear and accurate view of the business, and safely enabling live payments.
Razorpay decides whether to approve and activate the account.

## What is already in place in the website code

- Public About, Contact, Fees, Terms, Privacy, and Refund pages exist.
- Contact publishes the legal entity, registered address, phone, support email,
  and support hours.
- The Terms, Privacy, and Refund pages describe Razorpay and the current
  payment/refund flow.
- Checkout uses server-created Razorpay orders. The server verifies payment
  details before activating an entitlement; a signed `payment.captured`
  webhook also reconciles captures.
- Independent tournament entries require staff review and approval before
  their captain can pay.
- The Fees page shows the configured Driver License amount. Tournament entry
  fees vary by event, and independent course prices are confirmed by staff.

These are source-code checks only. They do not prove that the pages are
deployed, publicly reachable, accurate for the business, or approved by
Razorpay.

## Improve the public application site before submitting it

1. **Verify real production pages.** Publish the site on the business domain
   using HTTPS. Open each page below in a private browser window, logged out,
   on desktop and mobile. Check links, spelling, addresses, contact channels,
   and that there are no placeholder or test messages:
   - `/about`
   - `/fees`
   - `/terms`
   - `/privacy-policy`
   - `/refund-policy`
   - `/contact`
2. **Make prices concrete and easy to review.** Confirm the configured Driver
   License fee matches the approved company price. Publish the actual price
   (or a clear price range and what changes it) for each course and tournament
   before accepting applications. A statement that prices will be confirmed
   privately may be insufficient for a reviewer. Keep the amount shown on the
   public fees page, staff quote, and Razorpay Checkout consistent.
3. **Describe exactly what each payment buys.** State what a Driver License,
   course access, or tournament entry includes, eligibility/age requirements,
   delivery or access period, event dates where applicable, and whether a
   customer must separately buy a kit or other item. Do not imply the entry fee
   guarantees a prize.
4. **Review the refund wording.** State the cancellation and refund conditions
   before checkout, including the tournament-entry non-refund rule after
   registration and the process for failed, delayed, duplicate, or service-not-
   provided cases. Have the business/legal reviewer check that terms comply
   with applicable consumer law; do not promise an unconditional refund denial.
5. **Make policies discoverable.** Keep Fees, Terms, Privacy, Refund, and
   Contact links visible from the public footer and near payment actions.
   Verify each link works without login.
6. **Keep the merchant identity consistent.** Compare the legal name,
   registered address, support email, phone, domain, and bank account name
   displayed/submitted against company records and Razorpay Dashboard details.
   Correct discrepancies before application.
7. **Be transparent about payment coverage.** The current Standard Checkout
   covers Driver Licenses, staff-priced independent course access, and
   staff-approved independent tournament entries. School-team payments remain
   staff-managed. Do not tell Razorpay that unimplemented payment flows are
   automated.

## Prepare the company application

1. Open a Razorpay account using a company-controlled email address and phone.
2. Choose the business type that exactly matches Hanbee Technologies Private
   Limited and provide the production website URL.
3. Complete the business profile and KYC in the Razorpay Dashboard. Based on
   the current Razorpay Private Limited company checklist, prepare (as
   applicable to the Dashboard's KYC route):
   - Company PAN and Certificate of Incorporation/CIN.
   - MOA and AOA if not automatically verified through CKYC.
   - The company's settlement bank account number and IFSC.
   - Authorised signatory PAN and government-approved address proof, plus
     Board Resolution or Power of Attorney.
   - Ultimate Beneficial Owner declaration and requested identity/ownership
     details. Razorpay's linked guidance currently asks to declare natural
     persons holding more than 10%; follow the live Dashboard threshold and
     document requirements.
4. Upload documents only through Razorpay's secure Dashboard. CKYC may fetch
   some documents automatically. Follow any additional document or video-KYC
   request that appears for this specific account.
5. Monitor the Dashboard and respond to clarification requests using the same
   business information and supporting records. Account activation and the
   decision are Razorpay's responsibility.

Never put KYC files, API secrets, or card data into this repository, support
chat, or public pages.

## Configure and verify the integration

Do these steps in a non-production environment first:

1. Confirm migration `0129_razorpay_checkout.sql` is applied in the intended
   Supabase project. Since migrations are ordered, check the project's
   migration history; do not rerun or manually paste an already-applied
   migration.
2. Set server-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, and
   `SUPABASE_SERVICE_ROLE_KEY` in the deployment secret manager. The three
   secrets must not be browser-exposed.
3. Configure a Razorpay webhook at
   `https://<production-domain>/api/razorpay/webhook` for `payment.captured`.
   Save the matching webhook secret in the hosting provider and redeploy.
4. Use Razorpay test credentials in a staging environment and exercise
   successful, failed, pending, duplicate, wrong-amount, and delayed-webhook
   cases. Confirm no access or entry is granted until a server-verified capture.
5. After account activation, install live credentials only in production.
   Verify webhook delivery and reconciliation with a carefully controlled
   transaction before inviting customers to pay.
6. Keep support and reconciliation procedures ready: staff should be able to
   search by Razorpay order/payment ID and explain what a customer should do
   when their bank shows a debit but Hanbee has not yet confirmed capture.

Existing UPI payment records/status flows remain for reconciliation; new UPI
payment-creation API calls return HTTP 410. This is an intentional API change.

## Current blockers to calling the site application-ready

- Production domain, deployment, and anonymous access to the pages have not
  been verified from this workspace.
- The exact customer-facing course and event prices still need business
  confirmation and clearer public disclosure where applicable.
- Razorpay account KYC/approval, live credentials, webhook registration, and
  successful live settlement are not verified.
- The owner reports migration `0129` was run, but no remote Supabase
  connectivity was available here to verify the applied migration or its
  resulting production values.
- A frontend build does not test the Razorpay Dashboard configuration,
  provider account, Supabase production state, or actual money movement.

## Verification performed for this checklist

- The scoped defensive security review found no confirmed vulnerabilities,
  including low-severity issues, in the Razorpay changes it reviewed. This was
  a static, scoped review, not a live penetration test or proof that no
  vulnerabilities exist.
- `npm run build` passed, including TypeScript validation and Next.js page
  generation.
- The repository's `npm run lint` did not complete: `next lint` opened its
  first-run interactive ESLint configuration prompt, and the workspace has no
  non-interactive lint configuration to use.
- Supabase RLS/database tests and payment transactions were not run. No
  database test URL, Supabase CLI, Docker, or Razorpay test credentials were
  available in this workspace. Do not treat the build or static review as
  evidence of a successful provider transaction.

## Pending work for the team

The items below are not reported vulnerabilities. They are outstanding
merchant-readiness, operational, and validation tasks. Finish the **Before
live payments** items before accepting real customer payments.

### Before submitting the Razorpay application

- [ ] **Confirm the public production site.** Test the deployed domain over
  HTTPS while logged out. Verify About, Fees, Terms, Privacy, Refund, and
  Contact pages, all footer links, and correct company/support details.
- [ ] **Confirm and publish actual prices.** Verify the configured Driver
  License fee and publish actual course/tournament prices (or clear ranges and
  price factors), what each purchase includes, and refund/cancellation terms.
  Ensure the public Fees page, staff quote, and checkout amount agree.
- [ ] **Review customer terms.** Have the business/legal reviewer check
  cancellation, non-refundable tournament entries, customer support, and
  failed/duplicate-payment wording against applicable consumer requirements.
- [ ] **Prepare and submit company KYC.** Complete Razorpay's current Dashboard
  checklist for the correct legal entity and respond to follow-up requests.
  Approval is Razorpay's decision.

### Before enabling live payments

- [ ] **Verify Supabase state.** Confirm in the intended project that migration
  `0129` is recorded as applied and inspect the configured fee value. The
  owner reports it has been run, but this workspace did not connect to verify
  it. Do not rerun an already-applied migration.
- [ ] **Configure production secrets safely.** Set live Razorpay keys and the
  webhook secret in the hosting provider's server-only secret manager; keep
  the Supabase service-role key server-only as well. Check build output and
  client bundles for accidental secret exposure.
- [ ] **Register and test the webhook.** Configure
  `https://<production-domain>/api/razorpay/webhook` for `payment.captured`,
  then confirm a signed event is delivered and reconciled exactly once.
- [ ] **Run staging payment tests.** With test credentials, verify successful,
  failed, pending, delayed-webhook, duplicate, wrong-amount/currency,
  mismatched-order, invalid-signature, unauthorized-user, and concurrent-order
  cases. Confirm none grants access or registers an entry before a verified
  capture, and check that each order can settle only its intended user and
  purpose.
- [ ] **Run database/RLS tests.** Provide a disposable Supabase test project or
  local Supabase CLI/Docker environment, then run schema coverage and the RLS
  suites. Do not use production customer data as test fixtures.
- [ ] **Complete controlled live verification.** After Razorpay approves and
  activates the account, verify live webhook delivery and perform a
  business-approved low-value transaction before general launch.

### Follow-up and compatibility

- [ ] **Prepare payment support operations.** Define who checks Razorpay
  payment/order IDs, how delayed debits are handled, and how refunds or
  duplicate captures are escalated and recorded.
- [ ] **Confirm old UPI API consumers.** New UPI payment-creation routes return
  HTTP 410. Check any external clients or undocumented integrations for
  callers that need migration; existing UPI records/status routes remain for
  reconciliation.
- [ ] **Decide whether school-team payments need checkout.** Those payments
  remain staff-managed and are not covered by this Razorpay flow.
- [ ] **Set up non-interactive linting.** Configure the repository's ESLint
  setup so `npm run lint` can run without a first-time interactive prompt.

## Official references

- [Razorpay account setup and KYC](https://razorpay.com/docs/build/llm-docs/payments/set-up.md)
- [KYC documents by business type](https://razorpay.com/docs/build/llm-docs/payments/business-types-kyc-documents.md)
- [Account activation support](https://razorpay.com/docs/build/llm-docs/payments/account-activation-support.md)
- [Standard Checkout integration steps and go-live checklist](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps.md)
