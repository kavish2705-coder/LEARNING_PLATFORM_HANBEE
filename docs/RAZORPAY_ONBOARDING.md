# Razorpay onboarding and site-approval checklist

This is Hanbee's practical preparation guide for applying to Razorpay and
turning on live payments. It does not guarantee approval: Razorpay reviews the
merchant, business category, KYC, public website, and risk profile and may ask
for additional information.

For the current implementation status and prioritized website improvements,
see the [Razorpay application readiness checklist](RAZORPAY_APPLICATION_READINESS.md).

## 1. Prepare the public website

Before submitting the website URL, deploy the current production site on the
real business domain and verify it loads over HTTPS in a private browser
window. The reviewer should be able to open the public pages without a Hanbee
account:

- `/about` — accurate description of Hanbee and the learning/tournament
  services.
- `/fees` — one-time fees, how event/course fees are set, and what is included.
- `/terms` — terms for course access, Driver Licenses, and tournament entry.
- `/privacy-policy` — payment data and Razorpay sharing.
- `/refund-policy` — the non-refundable tournament rule and how failed or
  pending payments are handled.
- `/contact` — legal entity, registered address, working support email, and
  phone number.

Check all of the following before applying:

- The legal entity name, address, email, phone, and public domain match the
  business information submitted to Razorpay and the company's records.
- Product descriptions explain what the customer receives. Do not promise
  prizes or outcomes that are not supported by the published tournament rules.
- Prices are accurate and shown before a customer pays. Tournament prices are
  event-specific; course prices are confirmed by Hanbee staff with the student
  and parent/guardian before checkout. The Fees page reads the configured
  Driver License fee; verify it against the intended business price.
- The policy pages are linked from the public footer and from relevant
  payment/contact pages. The privacy, refund, and cancellation wording matches
  the actual payment process.
- There are no template placeholders, broken links, maintenance screens,
  misleading claims, or test payment instructions on the production site.
- Do not publish a live API key, secret, card data, or test credentials.

The URLs above are local routes. Replace `<production-domain>` with the
verified public host and open every route yourself before submitting it.

## 2. Create and activate the Razorpay account

1. Sign up at [Razorpay](https://razorpay.com/) using a business-controlled
   email address and phone number.
2. Select the registered business type that matches Hanbee Technologies
   Private Limited. Use the exact legal name and registration details; do not
   apply as an individual or sole proprietor if the company is the merchant.
3. In the Dashboard, complete the account activation/KYC flow and provide the
   public production website URL and business details requested.
4. Keep the Dashboard open for verification status and any requests for
   clarification or additional documents. Approval and activation are decided
   by Razorpay, not by this codebase.

Razorpay's current company KYC guidance says some documents may be fetched via
CKYC; if they are not, a Private Limited company may be asked for:

- Company PAN and Certificate of Incorporation/CIN.
- Memorandum of Association and Articles of Association.
- Bank account number and IFSC for the registered business; a cancelled-cheque
  video or other proof may be requested if verification fails.
- Authorised signatory PAN and address proof, plus a Board Resolution or Power
  of Attorney.
- Ultimate Beneficial Owner details/declaration, including owners above the
  current Razorpay threshold (the linked guide currently says to declare each
  natural person with more than 10% shareholding, with the requested PAN,
  Aadhaar, and ownership details).
- Any additional document requested in the Dashboard for the account's
  specific verification route.

Use the Dashboard's live checklist as authoritative: Razorpay's requirements
can change and vary by business profile and CKYC result. Send KYC documents only
through Razorpay's secure Dashboard, never through this repository or a public
website.

## 3. Deploy and configure checkout

Apply database changes from the repository root:

```powershell
supabase link --project-ref <your-project-ref>
supabase db push
```

In the frontend hosting provider's **server-side** environment, configure:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never use a `NEXT_PUBLIC_` prefix for the key secret, webhook secret, or
Supabase service-role key. Do not put secret values in source control or send
them to support chats.

In the Razorpay Dashboard, create a webhook pointing to:

```text
https://<production-domain>/api/razorpay/webhook
```

Subscribe to `payment.captured`, save the webhook secret in
`RAZORPAY_WEBHOOK_SECRET`, and redeploy. The server verifies checkout
signatures, confirms the payment with Razorpay before updating access, and
also processes the signed capture webhook. The database ledger is private to
server/service-role access and settles each order once. Production rejects
Razorpay test keys.

## 4. Test before switching to live payments

Use Razorpay test credentials in a non-production deployment and test:

1. A successful Driver License payment activates only the signed-in student's
   license.
2. A successful course payment activates only the staff-priced request for
   that student.
3. An independent tournament team cannot start checkout while it is a draft
   or before staff approval.
4. Staff review the captain/roster, contact the captain or solo player, then
   select **Approve for payment**. Only then can that captain see the payment
   action. A captured payment registers the entry.
5. Failed, pending, duplicate, mismatched-amount, and invalid-signature events
   do not grant access or register an entry.
6. A duplicate webhook does not apply the payment twice.
7. A payment shown as successful but still processing tells the customer not
   to pay again and gives them a payment ID to contact support with.

After Razorpay activates the account, replace test keys with live keys in the
production host only, deploy, and make a controlled low-value live transaction
before announcing checkout. Keep the Dashboard and webhook delivery logs open
to confirm captures are being delivered and reconciled.

## 5. Hanbee's tournament payment process

The tournament checkout deliberately follows this sequence:

1. The captain submits the independent entry for Hanbee review.
2. Hanbee staff review the entry, contact the team or solo player, and confirm
   the details.
3. Staff approve the entry for payment in **Tournament entry review**.
4. The captain signs in and pays the displayed fee using Razorpay Checkout.
5. The backend verifies capture and registers the entry. Tournament entry fees
   are non-refundable after registration, subject to applicable law and the
   published [Refund & Cancellation Policy](../frontend/src/app/refund-policy/page.tsx).

The approval opens checkout in the student's dashboard; this does not
automatically send a WhatsApp message or payment link. Continue the agreed
manual call/WhatsApp contact process unless a separate messaging integration
is requested and approved.

## Current go-live checks

- The production domain and live deployment have not been verified from this
  workspace.
- Razorpay account activation/KYC, live API keys, and webhook delivery need to
  be completed in Razorpay and the hosting provider.
- Confirm the actual tournament entry fee for each event and the course amount
  set by staff before launch.
- Migration `0129_razorpay_checkout.sql` changes the documented test-only
  ₹1 Driver License default to ₹199, preserving any other configured amount.
  Verify that migration has been applied to the production database and that
  the business confirms the ₹199 price before accepting live payments.
- School-team payment remains a staff-managed process; this Standard Checkout
  integration covers Driver Licenses, staff-priced independent course access,
  and staff-approved independent tournament entries.
- No live Razorpay transaction has been performed from this workspace.

## Official Razorpay references

- [Set up a Razorpay account and complete KYC](https://razorpay.com/docs/build/llm-docs/payments/set-up.md)
- [KYC documents for companies and businesses](https://razorpay.com/docs/build/llm-docs/payments/business-types-kyc-documents.md)
- [Account activation support](https://razorpay.com/docs/build/llm-docs/payments/account-activation-support.md)
- [Standard Checkout integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps.md)
