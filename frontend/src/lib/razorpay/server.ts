import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export type RazorpayPurpose = "driver_license" | "course_access" | "tournament_entry";

export interface RazorpayCheckoutOrder {
  orderId: string;
  keyId: string;
  amount: number;
  currency: "INR";
}

export interface RazorpayPaymentQuote {
  referenceId: string;
  amount: number;
  amountPaise: number;
  currency: "INR";
}

interface RazorpayOrderRow {
  razorpay_order_id: string;
  owner_id: string;
  purpose: RazorpayPurpose;
  reference_id: string;
  amount_paise: number;
  currency: "INR";
  status: "created" | "captured";
  razorpay_payment_id: string | null;
}

interface RazorpayOrderApiResponse {
  id: string;
  amount: number;
  currency: "INR";
}

interface RazorpayPaymentApiResponse {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

export class RazorpayError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "RazorpayError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new RazorpayError(`Payment service is not configured (${name}).`);
  return value;
}

function supabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
}

function serviceHeaders(): HeadersInit {
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${supabaseUrl()}${path}`, {
    ...init,
    headers: {
      ...serviceHeaders(),
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    console.error("[razorpay] Supabase request failed", response.status, text);
    throw new RazorpayError("We couldn't save or confirm your payment. Please contact support.", 502);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RazorpayError("The payment service returned an invalid response.", 502);
  }
}

function razorpayCredentials() {
  const keyId = requireEnv("RAZORPAY_KEY_ID");
  if ((process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") && keyId.startsWith("rzp_test_")) {
    throw new RazorpayError("Test-mode Razorpay keys cannot be used in production.");
  }
  return { keyId, keySecret: requireEnv("RAZORPAY_KEY_SECRET") };
}

async function razorpayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { keyId, keySecret } = razorpayCredentials();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    console.error("[razorpay] Provider request failed", response.status, text);
    throw new RazorpayError("Razorpay couldn't start this payment. Please try again or contact support.", 502);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RazorpayError("Razorpay returned an invalid response.", 502);
  }
}

export function amountToPaise(amount: number): number {
  if (!Number.isFinite(amount) || amount < 1 || Math.round(amount * 100) !== amount * 100 || amount > 1e7) {
    throw new RazorpayError("This payment amount is invalid. Please contact support.", 400);
  }
  return Math.round(amount * 100);
}

export async function getDriverLicenseFee(): Promise<number> {
  const settings = await supabaseRequest<Array<{ license_fee_amount: number | string }>>(
    "/rest/v1/payment_settings?select=license_fee_amount&limit=1",
  );
  const amount = Number(settings[0]?.license_fee_amount);
  amountToPaise(amount);
  return amount;
}

export async function resolvePaymentQuote(input: {
  ownerId: string;
  purpose: RazorpayPurpose;
  referenceId?: string;
}): Promise<RazorpayPaymentQuote> {
  const profiles = await supabaseRequest<Array<{ role: string; account_status: string }>>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(input.ownerId)}&select=role,account_status&limit=1`,
  );
  if (!profiles[0] || profiles[0].role !== "student" || profiles[0].account_status !== "active") {
    throw new RazorpayError("An active student account is required to pay.", 403);
  }

  let referenceId = input.ownerId;
  let amount: number;

  if (input.purpose === "driver_license") {
    const licenses = await supabaseRequest<Array<{ status: string }>>(
      `/rest/v1/driver_licenses?student_id=eq.${encodeURIComponent(input.ownerId)}&select=status&limit=1`,
    );
    if (licenses[0]?.status === "active") {
      throw new RazorpayError("Your Driver License is already active.", 409);
    }
    if (licenses[0]?.status === "payment_declared") {
      throw new RazorpayError("A Driver License payment is already awaiting staff review. Contact support before paying again.", 409);
    }
    amount = await getDriverLicenseFee();
  } else if (input.purpose === "course_access") {
    const requests = await supabaseRequest<Array<{
      id: string;
      student_id: string;
      status: string;
      staff_set_amount: number | string | null;
    }>>(
      `/rest/v1/access_requests?student_id=eq.${encodeURIComponent(input.ownerId)}` +
      "&direction=eq.add_course&select=id,student_id,status,staff_set_amount&limit=1",
    );
    const accessRequest = requests[0];
    if (!accessRequest || accessRequest.student_id !== input.ownerId) {
      throw new RazorpayError("Course access request not found.", 404);
    }
    if (accessRequest.status !== "awaiting_payment" || accessRequest.staff_set_amount == null) {
      throw new RazorpayError("Hanbee staff must confirm your course request and price before payment.", 403);
    }
    referenceId = accessRequest.id;
    amount = Number(accessRequest.staff_set_amount);
  } else {
    if (!input.referenceId || !/^[0-9a-f-]{36}$/i.test(input.referenceId)) {
      throw new RazorpayError("A valid team ID is required.", 400);
    }
    const teams = await supabaseRequest<Array<{
      id: string;
      captain_id: string | null;
      org_id: string | null;
      tournament_id: string;
      status: string;
      payment_approved_at: string | null;
    }>>(
      `/rest/v1/tournament_teams?id=eq.${encodeURIComponent(input.referenceId)}` +
      "&select=id,captain_id,org_id,tournament_id,status,payment_approved_at&limit=1",
    );
    const team = teams[0];
    if (!team) throw new RazorpayError("Tournament entry not found.", 404);
    if (team.captain_id !== input.ownerId) {
      throw new RazorpayError("Only the team captain can pay for this entry.", 403);
    }
    if (team.org_id !== null) {
      throw new RazorpayError("School team payments are handled by school staff.", 400);
    }
    if (team.status !== "applied" || !team.payment_approved_at) {
      throw new RazorpayError("Wait for Hanbee staff to contact you and approve this entry for payment.", 403);
    }
    const tournaments = await supabaseRequest<Array<{
      entry_fee_amount: number | string | null;
      status: string;
    }>>(
      `/rest/v1/tournaments?id=eq.${encodeURIComponent(team.tournament_id)}` +
      "&select=entry_fee_amount,status&limit=1",
    );
    const tournament = tournaments[0];
    if (!tournament || tournament.status !== "upcoming" || tournament.entry_fee_amount == null) {
      throw new RazorpayError("The tournament is not accepting payment right now.", 409);
    }
    referenceId = team.id;
    amount = Number(tournament.entry_fee_amount);
  }

  const amountPaise = amountToPaise(amount);
  return { referenceId, amount, amountPaise, currency: "INR" };
}

export async function createUserRazorpayOrder(input: {
  ownerId: string;
  purpose: RazorpayPurpose;
  referenceId?: string;
}): Promise<RazorpayCheckoutOrder> {
  const quote = await resolvePaymentQuote(input);
  if (input.purpose === "driver_license") {
    await supabaseRequest("/rest/v1/driver_licenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ student_id: input.ownerId, status: "unpaid" }),
    });
  }
  return createRazorpayOrder({
    ownerId: input.ownerId,
    purpose: input.purpose,
    referenceId: quote.referenceId,
    amount: quote.amount,
  });
}

export async function createRazorpayOrder(input: {
  ownerId: string;
  purpose: RazorpayPurpose;
  referenceId: string;
  amount: number;
}): Promise<RazorpayCheckoutOrder> {
  const amountPaise = amountToPaise(input.amount);
  const existing = await supabaseRequest<RazorpayOrderRow[]>(
    `/rest/v1/razorpay_orders?owner_id=eq.${encodeURIComponent(input.ownerId)}` +
    `&purpose=eq.${input.purpose}&reference_id=eq.${encodeURIComponent(input.referenceId)}` +
    "&status=eq.created&select=razorpay_order_id,owner_id,purpose,reference_id,amount_paise,currency,status,razorpay_payment_id&limit=1",
  );
  if (existing[0]) {
    if (existing[0].amount_paise !== amountPaise) {
      throw new RazorpayError("A payment is already open for a different amount. Contact Hanbee support before paying.", 409);
    }
    return {
      orderId: existing[0].razorpay_order_id,
      keyId: requireEnv("RAZORPAY_KEY_ID"),
      amount: existing[0].amount_paise,
      currency: existing[0].currency,
    };
  }

  const receipt = randomUUID().replaceAll("-", "");
  const providerOrder = await razorpayRequest<RazorpayOrderApiResponse>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        owner_id: input.ownerId,
        purpose: input.purpose,
        reference_id: input.referenceId,
      },
    }),
  });
  if (providerOrder.amount !== amountPaise || providerOrder.currency !== "INR" || !providerOrder.id) {
    throw new RazorpayError("Razorpay created an unexpected order. Please contact support.", 502);
  }

  try {
    await supabaseRequest<RazorpayOrderRow[]>("/rest/v1/razorpay_orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        razorpay_order_id: providerOrder.id,
        owner_id: input.ownerId,
        purpose: input.purpose,
        reference_id: input.referenceId,
        amount_paise: amountPaise,
        currency: "INR",
      }),
    });
  } catch (error) {
    if (!(error instanceof RazorpayError) || error.status !== 502) throw error;
    const concurrentOrder = await supabaseRequest<RazorpayOrderRow[]>(
      `/rest/v1/razorpay_orders?owner_id=eq.${encodeURIComponent(input.ownerId)}` +
      `&purpose=eq.${input.purpose}&reference_id=eq.${encodeURIComponent(input.referenceId)}` +
      "&status=eq.created&select=razorpay_order_id,owner_id,purpose,reference_id,amount_paise,currency,status,razorpay_payment_id&limit=1",
    );
    if (!concurrentOrder[0] || concurrentOrder[0].amount_paise !== amountPaise) throw error;
    return {
      orderId: concurrentOrder[0].razorpay_order_id,
      keyId: requireEnv("RAZORPAY_KEY_ID"),
      amount: concurrentOrder[0].amount_paise,
      currency: concurrentOrder[0].currency,
    };
  }

  return {
    orderId: providerOrder.id,
    keyId: requireEnv("RAZORPAY_KEY_ID"),
    amount: amountPaise,
    currency: "INR",
  };
}

export async function getOwnedRazorpayOrder(orderId: string, ownerId: string): Promise<RazorpayOrderRow | null> {
  const rows = await supabaseRequest<RazorpayOrderRow[]>(
    `/rest/v1/razorpay_orders?razorpay_order_id=eq.${encodeURIComponent(orderId)}` +
    `&owner_id=eq.${encodeURIComponent(ownerId)}` +
    "&select=razorpay_order_id,owner_id,purpose,reference_id,amount_paise,currency,status,razorpay_payment_id&limit=1",
  );
  return rows[0] ?? null;
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPaymentApiResponse> {
  return razorpayRequest<RazorpayPaymentApiResponse>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = razorpayCredentials();
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest();
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = requireEnv("RAZORPAY_WEBHOOK_SECRET");
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", webhookSecret).update(body).digest();
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function settleCapturedRazorpayOrder(input: {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
}): Promise<string> {
  return supabaseRequest<string>("/rest/v1/rpc/settle_razorpay_order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      p_order_id: input.orderId,
      p_payment_id: input.paymentId,
      p_amount_paise: input.amount,
      p_currency: input.currency,
    }),
  });
}
