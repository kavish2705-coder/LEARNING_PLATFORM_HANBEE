// Our adaptation of codemode-upi-pay's PostgresStore (src/stores/postgres.js)
// to this project's existing Supabase REST/RPC calling convention, instead
// of a separate raw `pg` connection. The upi_* tables and functions are the
// exact same schema as upstream (supabase/migrations/0122_upi_auto_pay.sql),
// reached here via the Supabase service-role key -- that key bypasses RLS
// the same way a direct privileged Postgres connection would, so the
// RLS-enabled-with-no-policies lockdown in that migration is preserved:
// only this server-side module can ever reach these tables, never a
// student's or staff member's own session.
import { UpiError, MESSAGES, round2 } from "./rules";
import type { Payment, Store, Alert } from "./types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set -- required for the UPI auto-pay integration.`);
  return v;
}

function supabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    const message = (body as { message?: string }).message || `${fn} failed`;
    const code = Object.keys(MESSAGES).find((k) => message.includes(k));
    if (code) throw new UpiError(code, MESSAGES[code][0], MESSAGES[code][1]);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

interface UpiPaymentRow {
  id: string; amount: string | number; pay_amount: string | number; ref: string; status: string;
  order_id: string | null; customer: string | null; note: string | null; metadata: Record<string, unknown> | string;
  created_at: string; expires_at: string; paid_at: string | null; paid_amount: string | number | null;
  utr: string | null; bank: string | null; payer: string | null; matched_by: string | null; utr_tries: number;
}

const num = (v: string | number | null) => (v == null ? null : round2(Number(v)));

function toPayment(r: UpiPaymentRow | undefined): Payment | null {
  if (!r || r.id == null) return null;
  return {
    id: r.id, amount: round2(Number(r.amount)), payAmount: round2(Number(r.pay_amount)), ref: r.ref,
    status: r.status as Payment["status"], orderId: r.order_id, customer: r.customer, note: r.note,
    metadata: (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) || {},
    createdAt: r.created_at, expiresAt: r.expires_at, paidAt: r.paid_at, paidAmount: num(r.paid_amount),
    utr: r.utr, bank: r.bank, payer: r.payer, matchedBy: r.matched_by as Payment["matchedBy"], utrTries: Number(r.utr_tries) || 0,
  };
}

export class SupabaseUpiStore implements Store {
  async init() {
    // The migration already created the tables/functions -- nothing to
    // auto-migrate at runtime, unlike upstream's PostgresStore.migrate().
  }

  async createPayment(i: { id: string; amount: number; ref: string; minutes: number; orderId?: string | null; customer?: string | null; note?: string | null; metadata?: Record<string, unknown> }): Promise<Payment> {
    const rows = await callRpc<UpiPaymentRow[]>("upi_create_payment", {
      p_id: i.id, p_amount: i.amount, p_ref: i.ref, p_minutes: i.minutes,
      p_order_id: i.orderId ?? null, p_customer: i.customer ?? null, p_note: i.note ?? null, p_metadata: i.metadata ?? {},
    });
    const p = toPayment(rows[0]);
    if (!p) throw new Error("upi_create_payment returned no row");
    return p;
  }

  async getPayment(id: string): Promise<Payment | null> {
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const res = await fetch(`${supabaseUrl()}/rest/v1/upi_payments?id=eq.${encodeURIComponent(id)}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const rows = (await res.json()) as UpiPaymentRow[];
    return toPayment(rows[0]);
  }

  async listPayments(opts?: { status?: string | null; orderId?: string | null; limit?: number }): Promise<Payment[]> {
    // Not used by our integration yet (no admin payments-list page) --
    // kept only to satisfy the Store interface. Implement via a REST
    // filter on upi_payments (service-role key) if one is needed later.
    void opts;
    return [];
  }

  async ingestAlerts(alerts: Alert[]): Promise<Payment[]> {
    const list = (alerts || []).map((a) => ({
      utr: a.utr, amount: Number(a.amount).toFixed(2), bank: a.bank || "", payer: a.payer || "", ref: a.ref || "", receivedAt: a.receivedAt,
    }));
    const rows = await callRpc<UpiPaymentRow[]>("upi_ingest_alerts", { p_alerts: list });
    return rows.map((r) => toPayment(r)).filter((p): p is Payment => p !== null);
  }

  async matchAlerts(): Promise<Payment[]> {
    const rows = await callRpc<UpiPaymentRow[]>("upi_match_alerts", {});
    return rows.map((r) => toPayment(r)).filter((p): p is Payment => p !== null);
  }

  async claimUtr(id: string, utr: string) {
    const r = await callRpc<{ result: "paid" | "underpaid" | "not_found" | "used"; settled: boolean }>("upi_claim_utr", { p_payment: id, p_utr: utr });
    const payment = await this.getPayment(id);
    if (!payment) throw new UpiError("NOT_FOUND", MESSAGES.NOT_FOUND[0], MESSAGES.NOT_FOUND[1]);
    return { result: r.result, settled: !!r.settled, payment };
  }

  async claimSync(minSeconds: number) {
    const rows = await callRpc<{ last_uid: number; uid_validity: number }[]>("upi_claim_sync", { p_min_seconds: minSeconds });
    const r = rows[0];
    return r ? { lastUid: Number(r.last_uid), uidValidity: Number(r.uid_validity) } : null;
  }

  async finishSync(r: { lastUid: number | null; uidValidity: number | null; error: string | null }) {
    await callRpc("upi_finish_sync", { p_last_uid: r.lastUid, p_uid_validity: r.uidValidity, p_error: r.error });
  }

  async syncStatus() {
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const res = await fetch(`${supabaseUrl()}/rest/v1/upi_sync?id=eq.1&select=last_run,last_ok,last_error`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const rows = (await res.json()) as { last_run: string; last_ok: string | null; last_error: string | null }[];
    const r = rows[0] || { last_run: null, last_ok: null, last_error: null };
    const lastRun = r.last_run ? new Date(r.last_run).toISOString() : null;
    return { lastRun: lastRun && lastRun.startsWith("1970") ? null : lastRun, lastOk: r.last_ok, lastError: r.last_error };
  }

  async unmatchedAlerts(limit?: number) {
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const res = await fetch(`${supabaseUrl()}/rest/v1/upi_alerts?payment_id=is.null&order=received_at.desc&limit=${limit || 50}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const rows = (await res.json()) as { utr: string; amount: string | number; bank: string | null; payer: string | null; ref: string | null; received_at: string }[];
    return rows.map((a) => ({ utr: a.utr, amount: round2(Number(a.amount)), bank: a.bank, payer: a.payer, ref: a.ref, receivedAt: a.received_at, paymentId: null }) as const);
  }
}
