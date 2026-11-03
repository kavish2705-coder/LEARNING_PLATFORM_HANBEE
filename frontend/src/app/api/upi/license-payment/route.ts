import { getUpiPay } from "../../../../lib/upi/singleton";
import { resolveUserFromRequest } from "../../../../lib/upi/serverAuth";
import { UpiError } from "../../../../lib/upi/rules";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

async function fetchLicenseFeeAmount(): Promise<number> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const res = await fetch(`${url}/rest/v1/payment_settings?select=license_fee_amount&limit=1`, {
    headers: { apikey: anonKey },
  });
  const rows = (await res.json()) as { license_fee_amount: number }[];
  return rows[0]?.license_fee_amount ?? 1;
}

async function ensureLicenseRow(studentId: string) {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  // Upsert so settle.ts's PATCH-by-student_id later has a row to match,
  // even for a student who's never declared a payment before.
  await fetch(`${url}/rest/v1/driver_licenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({ student_id: studentId, status: "unpaid" }),
  });
}

// POST /api/upi/license-payment -- authenticated student only. Creates (or
// reopens, per codemode-upi-pay's own createPayment semantics) a UPI
// payment for the Driver License fee and returns the QR/link for display.
export async function POST(req: Request) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  try {
    await ensureLicenseRow(user.id);
    const amount = await fetchLicenseFeeAmount();
    const upi = getUpiPay();
    const payment = await upi.createPayment({
      amount,
      orderId: `license:${user.id}`,
      customer: user.id,
    });
    return Response.json(payment);
  } catch (e) {
    const status = e instanceof UpiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "We couldn't start this payment.";
    return Response.json({ error: message }, { status });
  }
}
