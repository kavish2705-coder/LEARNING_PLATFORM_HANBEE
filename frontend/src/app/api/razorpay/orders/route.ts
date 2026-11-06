import { resolveUserFromRequest } from "../../../../lib/upi/serverAuth";
import {
  createUserRazorpayOrder,
  RazorpayError,
  resolvePaymentQuote,
  type RazorpayPurpose,
} from "../../../../lib/razorpay/server";

function parsePurpose(value: string | null): RazorpayPurpose | null {
  if (value === "driver_license" || value === "course_access" || value === "tournament_entry") return value;
  return null;
}

function respondError(error: unknown) {
  if (error instanceof RazorpayError) {
    const status = error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status >= 500) console.error("[razorpay] Checkout request failed:", error.message);
    return Response.json(
      { error: status >= 500 ? "We couldn't start secure checkout. Please try again or contact support." : error.message },
      { status },
    );
  }
  console.error("[razorpay] Checkout request failed:", error);
  return Response.json({ error: "We couldn't start secure checkout. Please try again or contact support." }, { status: 500 });
}

export async function GET(req: Request) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const purpose = parsePurpose(params.get("purpose"));
  if (!purpose) return Response.json({ error: "Unsupported payment type." }, { status: 400 });

  try {
    const quote = await resolvePaymentQuote({
      ownerId: user.id,
      purpose,
      referenceId: params.get("referenceId") ?? undefined,
    });
    return Response.json({ amount: quote.amount, currency: quote.currency });
  } catch (error) {
    return respondError(error);
  }
}

export async function POST(req: Request) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  let body: { purpose?: string; referenceId?: string };
  try {
    body = await req.json() as { purpose?: string; referenceId?: string };
  } catch {
    return Response.json({ error: "Invalid payment request." }, { status: 400 });
  }
  const purpose = parsePurpose(body.purpose ?? null);
  if (!purpose) return Response.json({ error: "Unsupported payment type." }, { status: 400 });

  try {
    const order = await createUserRazorpayOrder({
      ownerId: user.id,
      purpose,
      referenceId: body.referenceId,
    });
    return Response.json(order);
  } catch (error) {
    return respondError(error);
  }
}
