// Browser-side calls to this app's own /api/upi/* routes (frontend/src/app/api/upi/),
// which front the codemode-upi-pay integration in frontend/src/lib/upi/.
import { readStoredSession } from "./supabaseAuth";

export interface PublicUpiPayment {
  id: string;
  status: "pending" | "expired" | "paid" | "underpaid";
  amount: number;
  payAmount: number;
  ref: string;
  upiId: string;
  payeeName: string;
  link: string;
  qr?: string;
  expiresAt: string;
  utr: string | null;
  paidAmount: number | null;
  testMode?: boolean;
}

async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const res = await fetch(path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Something went wrong.");
  return body as T;
}

export function createLicenseUpiPayment() {
  return authedFetch<PublicUpiPayment>("/api/upi/license-payment", { method: "POST" });
}

export function createTournamentUpiPayment(teamId: string) {
  return authedFetch<PublicUpiPayment>("/api/upi/tournament-payment", {
    method: "POST",
    body: JSON.stringify({ team_id: teamId }),
  });
}

export function createCourseAccessUpiPayment() {
  return authedFetch<PublicUpiPayment>("/api/upi/course-access-payment", { method: "POST" });
}

export function getUpiPaymentStatus(id: string) {
  return authedFetch<PublicUpiPayment>(`/api/upi/payment/${encodeURIComponent(id)}`, { method: "GET" });
}

export function claimUpiUtr(id: string, utr: string) {
  return authedFetch<{ result: "paid" | "underpaid" | "not_found" | "used"; triesLeft: number }>(
    `/api/upi/payment/${encodeURIComponent(id)}`,
    { method: "POST", body: JSON.stringify({ utr }) },
  );
}

export function simulateUpiPayment(id: string) {
  return authedFetch<PublicUpiPayment>(`/api/upi/payment/${encodeURIComponent(id)}/simulate`, { method: "POST" });
}
