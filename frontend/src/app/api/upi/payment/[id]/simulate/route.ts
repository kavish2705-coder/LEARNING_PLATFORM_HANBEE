import { getUpiPay } from "../../../../../../lib/upi/singleton";
import { resolveUserFromRequest } from "../../../../../../lib/upi/serverAuth";
import { UpiError } from "../../../../../../lib/upi/rules";

// POST /api/upi/payment/:id/simulate -- test-mode only. Pretends the
// bank's credit-alert email arrived, so the full settle-and-activate path
// can be verified before real Gmail credentials are configured. Fails
// with 403 the moment UPI_TEST_MODE isn't set, so this can never fire
// against real money in production.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const { id } = await params;
  try {
    const upi = getUpiPay();
    // Ownership check, same as the other payment routes -- test mode
    // already blocks this in production, but a payment that settles money
    // status should never trust "the id is unguessable" alone.
    const existing = await upi.getPayment(id);
    if (!existing || existing.customer !== user.id) return Response.json({ error: "Payment not found." }, { status: 404 });
    const payment = await upi.simulatePayment(id);
    return Response.json(payment);
  } catch (e) {
    const status = e instanceof UpiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "We couldn't simulate this payment.";
    return Response.json({ error: message }, { status });
  }
}
