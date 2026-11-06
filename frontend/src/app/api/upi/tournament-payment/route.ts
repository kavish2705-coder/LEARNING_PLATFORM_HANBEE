// UPI creation is disabled after the Razorpay checkout migration. Existing
// UPI payment records remain readable and can still be reconciled.
export async function POST() {
  return Response.json(
    { error: "UPI checkout is no longer available. Use the Razorpay checkout in your dashboard." },
    { status: 410 },
  );
}
