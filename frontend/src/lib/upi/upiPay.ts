// Adapted from codemode-upi-pay's src/index.js (MIT licensed). Trimmed to
// what this project needs: no generic multi-language HTTP handler or
// signed webhooks, since everything runs inside this one Next.js app --
// 'paid' is handled directly in-process (see singleton.ts).
import crypto from "crypto";
import { EventEmitter } from "events";
import * as link from "./link";
import * as inbox from "./inbox";
import { RULES, UpiError, fail, viewStatus } from "./rules";
import type { Payment, PublicPayment, Store } from "./types";

const newId = () => "pay_" + crypto.randomBytes(12).toString("hex");

export interface UpiPayOptions {
  vpa: string;
  payeeName: string;
  gmail?: { user: string; appPassword: string } | null;
  store: Store;
  expiresInMinutes?: number;
  refPrefix?: string;
  alertSenders?: string | string[];
  syncThrottleSeconds?: number;
  onPaid?: (payment: Payment) => void | Promise<void>;
  testMode?: boolean;
  logger?: { info(...a: unknown[]): void; warn(...a: unknown[]): void; error(...a: unknown[]): void };
}

export interface SyncResult { ran: boolean; alerts: number; credited: Payment[]; error: string | null }

export interface UpiPay {
  store: Store;
  on(event: "paid" | "underpaid" | "synced" | "error", fn: (...a: unknown[]) => void): UpiPay;
  off(event: string, fn: (...a: unknown[]) => void): UpiPay;
  createPayment(input: { amount: number; orderId?: string; customer?: string; note?: string; metadata?: Record<string, unknown>; qr?: boolean }): Promise<PublicPayment>;
  getPayment(id: string, opts?: { sync?: boolean }): Promise<Payment | null>;
  getPublicPayment(id: string, opts?: { sync?: boolean; qr?: boolean }): Promise<PublicPayment | null>;
  claimUtr(id: string, utr: string): Promise<{ result: "paid" | "underpaid" | "not_found" | "used"; payment: Payment; triesLeft: number }>;
  sync(opts?: { force?: boolean }): Promise<SyncResult>;
  start(everySeconds?: number): UpiPay;
  stop(): UpiPay;
  status(): Promise<{ upiId: string; payeeName: string; inboxConfigured: boolean; testMode: boolean; inbox: { lastRun: string | null; lastOk: string | null; lastError: string | null } }>;
  simulatePayment(id: string, amount?: number): Promise<Payment>;
}

export function createUpiPay(opts: UpiPayOptions): UpiPay {
  const o: Required<Pick<UpiPayOptions, "expiresInMinutes" | "refPrefix" | "syncThrottleSeconds" | "testMode">> & UpiPayOptions =
    Object.assign({ expiresInMinutes: 10, refPrefix: "PAY", syncThrottleSeconds: 10, testMode: false }, opts);
  if (!o.vpa || !link.VPA_RE.test(o.vpa)) throw new Error('createUpiPay: set vpa to your UPI ID, e.g. "yourshop@okhdfcbank".');
  if (!o.payeeName) throw new Error("createUpiPay: set payeeName, the name customers see in their UPI app.");
  const prefix = link.checkPrefix(o.refPrefix);
  const refRe = link.refPattern(prefix);
  const minutes = Math.max(2, Math.min(60, o.expiresInMinutes || 10));
  const log = o.logger || { info() {}, warn: (...a: unknown[]) => console.warn("[upi]", ...a), error: (...a: unknown[]) => console.error("[upi]", ...a) };
  const gmail = o.gmail && o.gmail.user && o.gmail.appPassword ? o.gmail : null;
  const store = o.store;
  if (!gmail && !o.testMode) log.warn("No gmail { user, appPassword } given: payments can't be confirmed automatically.");

  const events = new EventEmitter();
  events.on("error", () => {});
  let timer: ReturnType<typeof setInterval> | null = null;
  let running: Promise<SyncResult> | null = null;

  async function toPublic(p: Payment | null, withQr?: boolean): Promise<PublicPayment | null> {
    if (!p) return null;
    const upiLink = link.payLink({ vpa: o.vpa, name: o.payeeName, amount: p.payAmount, ref: p.ref });
    const out: PublicPayment = {
      id: p.id, status: viewStatus(p) as PublicPayment["status"], amount: p.amount, payAmount: p.payAmount,
      extraPaise: Math.round((p.payAmount - p.amount) * 100), currency: "INR", ref: p.ref, upiId: o.vpa,
      payeeName: o.payeeName, link: upiLink, orderId: p.orderId, createdAt: p.createdAt, expiresAt: p.expiresAt,
      serverTime: new Date().toISOString(), paidAt: p.paidAt, paidAmount: p.paidAmount, utr: p.utr, bank: p.bank,
    };
    if (o.testMode) out.testMode = true;
    if (withQr) out.qr = await link.qrSvg(upiLink);
    return out;
  }

  function toPrivate(p: Payment): Payment {
    return Object.assign({}, p, { status: viewStatus(p) as Payment["status"] });
  }

  async function announce(settled: Payment[]) {
    for (const p of settled || []) {
      const full = toPrivate(p);
      events.emit(p.status, full);
      if (o.onPaid && p.status === "paid") {
        try { await o.onPaid(full); } catch (e) { log.error("onPaid failed for", p.id, e instanceof Error ? e.message : e); events.emit("error", e); }
      }
    }
  }

  const api: UpiPay = {
    store,
    on: (ev, fn) => { events.on(ev, fn); return api; },
    off: (ev, fn) => { events.off(ev, fn); return api; },

    async createPayment(input) {
      const amount = Number(input.amount);
      if (!(amount >= 1) || Math.round(amount * 100) !== amount * 100 || amount > 1e7) fail("BAD_AMOUNT");
      const clean = (v: unknown, n: number) => (v == null || v === "" ? null : String(v).slice(0, n));
      const p = await store.createPayment({
        id: newId(), amount, ref: link.newRef(prefix), minutes,
        orderId: clean(input.orderId, 120), customer: clean(input.customer, 200), note: clean(input.note, 300),
        metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      });
      const pub = await toPublic(p, input.qr !== false);
      if (!pub) throw new Error("createPayment: store returned no payment");
      return pub;
    },

    async getPayment(id, opt) {
      let p = await store.getPayment(id);
      if (!p) return null;
      if ((!opt || opt.sync !== false) && p.status === "pending" && Date.parse(p.expiresAt) + RULES.matchAfterMs > Date.now()) {
        await api.sync().catch(() => null);
        p = await store.getPayment(id);
        if (!p) return null;
      }
      return toPrivate(p);
    },

    async getPublicPayment(id, opt) {
      const p = await api.getPayment(id, opt);
      return p ? toPublic(p, opt && opt.qr) : null;
    },

    async claimUtr(id, utr) {
      const u = String(utr || "").replace(/\D/g, "");
      if (!/^\d{12}$/.test(u)) fail("BAD_UTR");
      let r = await store.claimUtr(id, u);
      if (r.result === "not_found") {
        const s = await api.sync({ force: true }).catch(() => null);
        if (s && s.credited.some((p) => p.id === String(id))) r = { result: "paid", payment: (await store.getPayment(id))!, settled: false };
        else if (s) r = await store.claimUtr(id, u).catch((e) => (e instanceof UpiError && e.code === "TOO_MANY_TRIES" ? r : Promise.reject(e)));
      }
      if (r.settled) await announce([r.payment]);
      return { result: r.result, payment: toPrivate(r.payment), triesLeft: Math.max(0, RULES.maxUtrTries - (r.payment.utrTries || 0)) };
    },

    async sync(opt) {
      if (running) return running;
      running = (async (): Promise<SyncResult> => {
        const out: SyncResult = { ran: false, alerts: 0, credited: [], error: null };
        if (!gmail) {
          out.credited = await store.matchAlerts();
          await announce(out.credited);
          return out;
        }
        const state = await store.claimSync(opt && opt.force ? 0 : o.syncThrottleSeconds);
        if (!state) return out;
        out.ran = true;
        try {
          const r = await inbox.readInbox({
            user: gmail.user, appPassword: gmail.appPassword, alertSenders: o.alertSenders,
            refRe, ownVpa: o.vpa,
          }, state);
          out.alerts = r.alerts.length;
          out.credited = await store.ingestAlerts(r.alerts);
          await store.finishSync({ lastUid: r.lastUid ?? null, uidValidity: r.uidValidity ?? null, error: null });
        } catch (e) {
          out.error = inbox.describeError(e);
          await store.finishSync({ lastUid: null, uidValidity: null, error: out.error }).catch(() => null);
          log.error(out.error);
          events.emit("error", e);
        }
        await announce(out.credited);
        if (out.credited.length || out.error) events.emit("synced", out);
        return out;
      })();
      try { return await running; } finally { running = null; }
    },

    start(everySeconds) {
      api.stop();
      const ms = Math.max(5, everySeconds || 15) * 1000;
      timer = setInterval(() => { api.sync().catch(() => null); }, ms);
      if (timer.unref) timer.unref();
      api.sync().catch(() => null);
      return api;
    },
    stop() { if (timer) clearInterval(timer); timer = null; return api; },

    async status() {
      return { upiId: o.vpa, payeeName: o.payeeName, inboxConfigured: !!gmail, testMode: !!o.testMode, inbox: await store.syncStatus() };
    },

    async simulatePayment(id, amount) {
      if (!o.testMode) throw new UpiError("TEST_MODE_ONLY", "simulatePayment only works with testMode: true.", 403);
      const p = await store.getPayment(id);
      if (!p) fail("NOT_FOUND");
      const utr = String(crypto.randomInt(100000, 999999)) + String(crypto.randomInt(100000, 999999));
      const settled = await store.ingestAlerts([{ utr, amount: amount || p.payAmount, bank: "Test Bank", payer: "test@upi", ref: p.ref, receivedAt: new Date().toISOString() }]);
      await announce(settled);
      const result = await store.getPayment(id);
      if (!result) throw new Error("simulatePayment: payment vanished after settling");
      return toPrivate(result);
    },
  };
  return api;
}
