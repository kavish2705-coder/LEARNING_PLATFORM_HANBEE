// Types ported from codemode-upi-pay's index.d.ts
// (https://github.com/codemodeai/codemode-upi-pay, MIT licensed).

export type PaymentStatus = "pending" | "expired" | "paid" | "underpaid";

export interface PublicPayment {
  id: string;
  status: PaymentStatus;
  amount: number;
  payAmount: number;
  extraPaise: number;
  currency: "INR";
  ref: string;
  upiId: string;
  payeeName: string;
  link: string;
  qr?: string;
  orderId: string | null;
  createdAt: string;
  expiresAt: string;
  serverTime: string;
  paidAt: string | null;
  paidAmount: number | null;
  utr: string | null;
  bank: string | null;
  testMode?: boolean;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  amount: number;
  payAmount: number;
  ref: string;
  orderId: string | null;
  customer: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  paidAmount: number | null;
  utr: string | null;
  bank: string | null;
  payer: string | null;
  matchedBy: "ref" | "amount" | "utr" | null;
  utrTries: number;
}

export interface Alert {
  utr: string;
  amount: number;
  bank?: string | null;
  payer?: string | null;
  ref?: string | null;
  receivedAt: string;
}

export interface Store {
  init?(): Promise<void>;
  createPayment(input: {
    id: string; amount: number; ref: string; minutes: number;
    orderId?: string | null; customer?: string | null; note?: string | null; metadata?: Record<string, unknown>;
  }): Promise<Payment>;
  getPayment(id: string): Promise<Payment | null>;
  listPayments(opts?: { status?: string | null; orderId?: string | null; limit?: number }): Promise<Payment[]>;
  ingestAlerts(alerts: Alert[]): Promise<Payment[]>;
  matchAlerts(): Promise<Payment[]>;
  claimUtr(id: string, utr: string): Promise<{ result: "paid" | "underpaid" | "not_found" | "used"; settled: boolean; payment: Payment }>;
  claimSync(minSeconds: number): Promise<{ lastUid: number; uidValidity: number } | null>;
  finishSync(r: { lastUid: number | null; uidValidity: number | null; error: string | null }): Promise<void>;
  syncStatus(): Promise<{ lastRun: string | null; lastOk: string | null; lastError: string | null }>;
  unmatchedAlerts(limit?: number): Promise<(Alert & { paymentId: null })[]>;
}
