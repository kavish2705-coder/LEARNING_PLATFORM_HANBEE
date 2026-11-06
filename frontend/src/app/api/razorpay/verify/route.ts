import { resolveUserFromRequest } from "../../../../lib/upi/serverAuth";
import {
  fetchRazorpayPayment,
  getOwnedRazorpayOrder,
  RazorpayError,
  settleCapturedRazorpayOrder,
  verifyCheckoutSignature,
} from "../../../../lib/razorpay/server";

interface VerificationBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export async function POST(req: Request) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  let body: VerificationBody;
  try {
    body = await req.json() as VerificationBody;
  } catch {
    return Response.json({ error: "Invalid payment verification request." }, { status: 400 });
  }

  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    return Response.json({ error: "Razorpay returned incomplete payment details." }, { status: 400 });
  }

  try {
    const order = await getOwnedRazorpayOrder(orderId, user.id);
    if (!order) return Response.json({ error: "Payment order not found." }, { status: 404 });
    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      return Response.json({ error: "Payment signature is invalid." }, { status: 400 });
    }

    const payment = await fetchRazorpayPayment(paymentId);
    if (payment.order_id !== orderId || payment.amount !== order.amount_paise || payment.currency !== order.currency) {
      return Response.json({ error: "Payment details do not match this order." }, { status: 400 });
    }
    if (payment.status !== "captured") {
      if (payment.status === "failed") {
        return Response.json({ error: "Razorpay reports this payment failed. No entry or access was activated." }, { status: 402 });
      }
      return Response.json({ status: "processing" }, { status: 202 });
    }

    await settleCapturedRazorpayOrder({
      orderId,
      paymentId,
      amount: payment.amount,
      currency: payment.currency,
    });
    return Response.json({ status: "captured" });
  } catch (error) {
    if (error instanceof RazorpayError) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 500;
      if (status >= 500) console.error("[razorpay] Payment verification failed:", error.message);
      return Response.json(
        { error: status >= 500 ? "Payment verification is temporarily unavailable. Contact support with your Razorpay payment ID." : error.message },
        { status },
      );
    }
    console.error("[razorpay] Payment verification failed:", error);
    return Response.json({ error: "Payment verification is temporarily unavailable. Contact support with your Razorpay payment ID." }, { status: 500 });
  }
}
