import { getUpiPay } from "../../../../lib/upi/singleton";
import { resolveUserFromRequest } from "../../../../lib/upi/serverAuth";
import { UpiError } from "../../../../lib/upi/rules";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

interface TeamRow {
  id: string;
  captain_id: string | null;
  status: string;
  org_id: string | null;
  tournament_id: string;
}

async function fetchTeam(teamId: string): Promise<TeamRow | null> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/tournament_teams?id=eq.${encodeURIComponent(teamId)}&select=id,captain_id,status,org_id,tournament_id`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const rows = (await res.json()) as TeamRow[];
  return rows[0] ?? null;
}

async function fetchEntryFee(tournamentId: string): Promise<number | null> {
  // tournaments' RLS policy ("tournaments visible to eligible accounts")
  // requires an authenticated session, not just the anon key -- this is a
  // server-side lookup with no user session to forward, so it needs the
  // service-role key (bypasses RLS) like the rest of this route, not anon.
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/tournaments?id=eq.${encodeURIComponent(tournamentId)}&select=entry_fee_amount`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const rows = (await res.json()) as { entry_fee_amount: number | null }[];
  return rows[0]?.entry_fee_amount ?? null;
}

// POST /api/upi/tournament-payment -- authenticated student only, body {
// team_id }. Creates (or reopens) a UPI payment for an independent/solo
// team's tournament entry fee. School-linked teams aren't handled here --
// they go through school staff and apply_team's own payment_declared flow.
export async function POST(req: Request) {
  const user = await resolveUserFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { team_id?: string };
  const teamId = body.team_id;
  if (!teamId) return Response.json({ error: "team_id is required." }, { status: 400 });

  try {
    const team = await fetchTeam(teamId);
    if (!team) return Response.json({ error: "Team not found." }, { status: 404 });
    if (team.captain_id !== user.id) return Response.json({ error: "Only the team captain can pay for this entry." }, { status: 403 });
    if (team.org_id !== null) return Response.json({ error: "School teams pay through school staff, not here." }, { status: 400 });
    if (team.status !== "draft") return Response.json({ error: "This entry isn't waiting on payment." }, { status: 400 });

    const amount = await fetchEntryFee(team.tournament_id);
    if (amount == null) {
      return Response.json({ error: "Hanbee staff haven't set an entry fee for this tournament yet. Contact them before paying." }, { status: 400 });
    }

    const upi = getUpiPay();
    const payment = await upi.createPayment({
      amount,
      orderId: `tournament_entry:${teamId}`,
      customer: user.id,
    });
    return Response.json(payment);
  } catch (e) {
    const status = e instanceof UpiError ? e.status : 500;
    const message = e instanceof Error ? e.message : "We couldn't start this payment.";
    return Response.json({ error: message }, { status });
  }
}
