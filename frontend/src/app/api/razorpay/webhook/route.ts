import {
  RazorpayError,
  settleCapturedRazorpayOrder,
  verifyWebhookSignature,
} from "../../../../lib/razorpay/server";

interface RazorpayWebhookPayment {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: {
      entity?: RazorpayWebhookPayment;
    };
  };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) {
    return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
  }
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    let body: RazorpayWebhookBody;
    try {
      body = JSON.parse(rawBody) as RazorpayWebhookBody;
    } catch {
      return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
    }

    if (body.event !== "payment.captured") {
      return Response.json({ received: true });
    }

    const payment = body.payload?.payment?.entity;
    if (
      !payment?.id ||
      !payment.order_id ||
      typeof payment.amount !== "number" ||
      !Number.isSafeInteger(payment.amount) ||
      !payment.currency
    ) {
      return Response.json({ error: "Captured payment payload is incomplete." }, { status: 400 });
    }

    await settleCapturedRazorpayOrder({
      orderId: payment.order_id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });
    return Response.json({ received: true });
  } catch (error) {
    if (error instanceof RazorpayError) {
      console.error("[razorpay] Webhook processing failed:", error.message);
    } else {
      console.error("[razorpay] Webhook processing failed:", error);
    }
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
