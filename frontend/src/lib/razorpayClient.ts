import { readStoredSession } from "./supabaseAuth";

export type RazorpayPurpose = "driver_license" | "course_access" | "tournament_entry";

export interface RazorpayOrder {
  orderId: string;
  keyId: string;
  amount: number;
  currency: "INR";
}

export interface RazorpayQuote {
  amount: number;
  currency: "INR";
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const response = await fetch(path, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    throw new Error((body as { error?: string }).error || "Something went wrong.");
  }
  return body as T;
}

export function createRazorpayOrder(purpose: RazorpayPurpose, referenceId?: string) {
  return authedFetch<RazorpayOrder>("/api/razorpay/orders", {
    method: "POST",
    body: JSON.stringify({ purpose, referenceId }),
  });
}

export function getRazorpayQuote(purpose: RazorpayPurpose, referenceId?: string) {
  const query = new URLSearchParams({ purpose });
  if (referenceId) query.set("referenceId", referenceId);
  return authedFetch<RazorpayQuote>(`/api/razorpay/orders?${query}`, { method: "GET" });
}

export function verifyRazorpayPayment(payment: RazorpayPaymentResult) {
  return authedFetch<{ status: "captured" | "processing" }>("/api/razorpay/verify", {
    method: "POST",
    body: JSON.stringify(payment),
  });
}

export function getRazorpayOrderStatus(orderId: string) {
  return authedFetch<{ status: "created" | "captured" }>(
    `/api/razorpay/orders/${encodeURIComponent(orderId)}`,
    { method: "GET" },
  );
}
