import { getUpiPay } from "../../../../../lib/upi/singleton";
import { resolveUserFromRequest } from "../../../../../lib/upi/serverAuth";
import { UpiError } from "../../../../../lib/upi/rules";

// GET /api/upi/payment/:id -- poll status for the checkout UI. Requires
// sign-in AND that the payment belongs to the caller -- payment ids are
// unguessable (96-bit random), but this is still a real settlement/status
// read, not something to rely on unguessability alone for.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const { id } = await params;
  const upi = getUpiPay();
  const full = await upi.getPayment(id);
  if (!full || full.customer !== user.id) return Response.json({ error: "Payment not found." }, { status: 404 });
  const payment = await upi.getPublicPayment(id, { sync: false, qr: false });
  return Response.json(payment);
}

// POST /api/upi/payment/:id -- "I've paid, here's my UTR" fallback, for
// when the bank's email hasn't arrived (or been read) yet. Same ownership
// check as GET: this settles a payment, so it must only ever act on the
// caller's own.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { utr?: string };
  try {
    const upi = getUpiPay();
    const existing = await upi.getPayment(id);
    if (!existing || existing.customer !== user.id) return Response.json({ error: "Payment not found." }, { status: 404 });
    const r = await upi.claimUtr(id, body.utr || "");
    return Response.json(r);
  } catch (e) {
    const status = e instanceof UpiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "We couldn't check that UTR.";
    return Response.json({ error: message }, { status });
  }
}
