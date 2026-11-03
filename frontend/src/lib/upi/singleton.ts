// Shared, server-only UpiPay instance. A module-level singleton guarded
// against Next.js dev-mode hot-reload creating duplicates (same pattern as
// a Prisma Client singleton) -- without the guard, every file edit would
// spin up a second interval poller against the same inbox.
import { createUpiPay, type UpiPay } from "./upiPay";
import { SupabaseUpiStore } from "./supabaseStore";

declare global {
  // eslint-disable-next-line no-var -- the global-singleton pattern requires var
  var __upiPay: UpiPay | undefined;
}

function buildUpiPay(): UpiPay {
  const vpa = process.env.UPI_VPA;
  const payeeName = process.env.UPI_PAYEE_NAME || "Hanbee";
  const testMode = process.env.UPI_TEST_MODE === "1" || process.env.UPI_TEST_MODE === "true";
  const gmailUser = process.env.UPI_GMAIL_ADDRESS;
  const gmailAppPassword = process.env.UPI_GMAIL_APP_PASSWORD;

  if (!vpa) {
    throw new Error(
      "UPI_VPA is not set. Add it (and UPI_PAYEE_NAME, UPI_GMAIL_ADDRESS, UPI_GMAIL_APP_PASSWORD, SUPABASE_SERVICE_ROLE_KEY) " +
      "to the frontend's server environment to enable automatic UPI payment confirmation. See docs/superpowers/specs or the " +
      "project_upi_auto_confirm_plan memory for the full setup steps.",
    );
  }

  return createUpiPay({
    vpa,
    payeeName,
    gmail: gmailUser && gmailAppPassword ? { user: gmailUser, appPassword: gmailAppPassword } : null,
    store: new SupabaseUpiStore(),
    testMode,
    onPaid: async (payment) => {
      const { settleUpiOrder } = await import("./settle");
      await settleUpiOrder(payment);
    },
  });
}

export function getUpiPay(): UpiPay {
  if (!global.__upiPay) {
    global.__upiPay = buildUpiPay();
    // Only start the background inbox poller on an actual server process,
    // and only once a real Gmail inbox is configured -- in test mode with
    // no gmail credentials, sync() still runs matchAlerts() against
    // whatever simulatePayment() has inserted, so start() is harmless to
    // call either way.
    if (typeof window === "undefined") {
      global.__upiPay.start(15);
    }
  }
  return global.__upiPay;
}
