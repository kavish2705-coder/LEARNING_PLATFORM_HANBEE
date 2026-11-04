// What happens in OUR domain when codemode-upi-pay settles a payment --
// this is the piece upstream intentionally leaves to the integrator (see
// its onPaid option). orderId encodes which record to update: currently
// only "license:<studentId>" for Driver License purchases (the first,
// isolated payment surface moved onto this system -- tournament entry
// fees stay on the existing manual QR+UTR+staff-review flow for now).
import type { Payment } from "./types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

async function supabasePatch(path: string, body: Record<string, unknown>) {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PATCH ${path} failed: ${res.status} ${text}`);
  }
}

export async function settleUpiOrder(payment: Payment): Promise<void> {
  if (payment.status !== "paid") return; // underpaid is left for a human to chase; never auto-activates anything
  const orderId = payment.orderId || "";

  const licenseMatch = orderId.match(/^license:(.+)$/);
  if (licenseMatch) {
    const studentId = licenseMatch[1];
    await supabasePatch(`/rest/v1/driver_licenses?student_id=eq.${encodeURIComponent(studentId)}`, {
      status: "active",
      payment_declared: true,
      payment_reference: payment.utr,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return;
  }

  // Tournament entry fee, independent/solo captains only (school teams go
  // through school staff, a different flow). This only confirms PAYMENT --
  // it moves the team to 'payment_declared', the same state apply_team's
  // own payment_declared=true path produces. Staff still do the actual
  // team/roster review (decide_team) before it becomes 'verified'; auto-pay
  // replaces the "staff manually confirms the money arrived" sub-step, not
  // the whole review. Filtered to draft/proposed so a payment settling
  // late (after staff already decided the team some other way) is a no-op
  // instead of clobbering a later status.
  const tournamentEntryMatch = orderId.match(/^tournament_entry:(.+)$/);
  if (tournamentEntryMatch) {
    const teamId = tournamentEntryMatch[1];
    await supabasePatch(`/rest/v1/tournament_teams?id=eq.${encodeURIComponent(teamId)}&status=in.(draft,proposed)`, {
      status: "payment_declared",
      payment_declared: true,
      payment_reference: payment.utr,
    });
    return;
  }

  // Unrecognized orderId shape: nothing to settle automatically. Logged,
  // not thrown, so one bad/foreign orderId can't break the sync loop for
  // every other payment in the same batch (announce() awaits onPaid per
  // payment, sequentially).
  console.warn("[upi] settleUpiOrder: no handler for orderId", orderId, "payment", payment.id);
}
