// Ported from codemode-upi-pay's src/rules.js (MIT licensed).

export const RULES = {
  matchBeforeMs: 2 * 60e3,
  matchAfterMs: 30 * 60e3,
  utrAfterMs: 48 * 3600e3,
  holdAfterAlertMs: 10 * 60e3,
  lookBackMs: 3 * 86400e3,
  maxUtrTries: 5,
  maxOpenPerOrder: 5,
};

export class UpiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message?: string, status?: number) {
    super(message || code);
    this.code = code;
    this.status = status || 400;
  }
}

export const MESSAGES: Record<string, [string, number]> = {
  BAD_AMOUNT: ["Amount must be at least ₹1, with at most 2 decimals.", 400],
  NO_FREE_AMOUNT: ["Too many payments for this amount are open right now. Try again in a few minutes.", 429],
  TOO_MANY_OPEN: ["Too many open payments for this order. Finish or wait for one to expire.", 429],
  NOT_FOUND: ["Payment not found.", 404],
  TOO_MANY_TRIES: ["Too many UTR attempts for this payment. Contact the merchant.", 429],
  BAD_UTR: ["A UTR is the 12-digit number in your UPI app's payment details.", 400],
  ALREADY_SETTLED: ["This payment is no longer open -- refresh the page to start a new one.", 409],
};

export function fail(code: string): never {
  const m = MESSAGES[code] || [code, 400];
  throw new UpiError(code, m[0], m[1]);
}

export function viewStatus(p: { status: string; expiresAt: string }, now?: number) {
  if (p.status !== "pending") return p.status;
  return Date.parse(p.expiresAt) <= (now || Date.now()) ? "expired" : "pending";
}

export const round2 = (n: number) => Math.round(Number(n) * 100) / 100;
