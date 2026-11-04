import { getUpiPay } from "../../../../lib/upi/singleton";
import { resolveUserFromRequest } from "../../../../lib/upi/serverAuth";
import { UpiError } from "../../../../lib/upi/rules";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

interface AccessRequestRow {
  id: string;
  student_id: string;
  direction: "add_course" | "add_tournament";
  status: "requested" | "awaiting_payment" | "active";
  staff_set_amount: string | number | null;
}

async function fetchAccessRequest(studentId: string): Promise<AccessRequestRow | null> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(
    `${url}/rest/v1/access_requests?student_id=eq.${encodeURIComponent(studentId)}&direction=eq.add_course&select=id,student_id,direction,status,staff_set_amount`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  const rows = (await res.json()) as AccessRequestRow[];
  return rows[0] ?? null;
}

// POST /api/upi/course-access-payment -- authenticated student only. Only
// reachable once staff have confirmed with the parent and student and set
// a price (access_requests.status = 'awaiting_payment') -- there is no
// amount for the student to choose or influence here.
export async function POST(req: Request) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  try {
    const request = await fetchAccessRequest(user.id);
    if (!request || request.student_id !== user.id) return Response.json({ error: "Request not found." }, { status: 404 });
    if (request.status !== "awaiting_payment" || request.staff_set_amount == null) {
      return Response.json({ error: "Hanbee staff haven't set a price for this yet. Wait for their call." }, { status: 400 });
    }

    const upi = getUpiPay();
    const payment = await upi.createPayment({
      amount: Number(request.staff_set_amount),
      orderId: `access:${request.id}`,
      customer: user.id,
    });
    return Response.json(payment);
  } catch (e) {
    const status = e instanceof UpiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "We couldn't start this payment.";
    return Response.json({ error: message }, { status });
  }
}
