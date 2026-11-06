import { resolveUserFromRequest } from "../../../../../lib/upi/serverAuth";
import { getOwnedRazorpayOrder, RazorpayError } from "../../../../../lib/razorpay/server";

export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  const { orderId } = await params;
  try {
    const order = await getOwnedRazorpayOrder(orderId, user.id);
    if (!order) return Response.json({ error: "Payment order not found." }, { status: 404 });
    return Response.json({ status: order.status });
  } catch (error) {
    if (error instanceof RazorpayError) {
      console.error("[razorpay] Could not read order status:", error.message);
    } else {
      console.error("[razorpay] Could not read order status:", error);
    }
    return Response.json({ error: "We couldn't check payment status. Please refresh or contact support." }, { status: 500 });
  }
}
