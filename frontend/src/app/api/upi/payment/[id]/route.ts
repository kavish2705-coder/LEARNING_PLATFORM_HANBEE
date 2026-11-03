import { getUpiPay } from "../../../../../lib/upi/singleton";
import { resolveUserFromRequest } from "../../../../../lib/upi/serverAuth";
import { UpiError } from "../../../../../lib/upi/rules";

// GET /api/upi/payment/:id -- poll status for the checkout UI. Public
// payment only (no customer/metadata), matching upstream's own
// "payment IDs are 96-bit random and can't be guessed" design -- but we
// still require sign-in, matching every other endpoint in this app.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const { id } = await params;
  const upi = getUpiPay();
  const payment = await upi.getPublicPayment(id, { qr: false });
  if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });
  return Response.json(payment);
}

// POST /api/upi/payment/:id -- "I've paid, here's my UTR" fallback, for
// when the bank's email hasn't arrived (or been read) yet.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { utr?: string };
  try {
    const upi = getUpiPay();
    const r = await upi.claimUtr(id, body.utr || "");
    return Response.json(r);
  } catch (e) {
    const status = e instanceof UpiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "We couldn't check that UTR.";
    return Response.json({ error: message }, { status });
  }
}
