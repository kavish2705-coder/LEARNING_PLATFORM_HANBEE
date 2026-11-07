// Ported from codemode-upi-pay's src/inbox.js (MIT licensed). Reads new
// bank-alert emails from a Gmail inbox over read-only IMAP.
import * as alerts from "./alerts";
import type { Alert } from "./types";

const MAX_PER_RUN = 150;

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise<T>((_, reject) => {
      t = setTimeout(() => { onTimeout(); reject(Object.assign(new Error("Gmail took too long to answer"), { code: "TIMEOUT" })); }, ms);
    }),
  ]);
}

export interface InboxOpts {
  user: string; appPassword: string; alertSenders?: string | string[]; authServer?: string;
  refRe?: RegExp; ownVpa?: string; host?: string; port?: number; timeoutMs?: number;
}
export interface InboxState { lastUid?: number | null; uidValidity?: number | null }

export async function readInbox(opts: InboxOpts, state: InboxState | null) {
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: opts.host || "imap.gmail.com", port: opts.port || 993, secure: true,
    auth: { user: opts.user, pass: String(opts.appPassword || "").replace(/\s+/g, "") },
    logger: false, connectionTimeout: 8000, greetingTimeout: 6000, socketTimeout: 15000, disableAutoIdle: true,
  });
  const list = alerts.senderList(opts.alertSenders);
  const run = async () => {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    const out: { alerts: Alert[]; scanned: number; fromBanks: number; rejected: number; uidValidity?: number; lastUid?: number } =
      { alerts: [], scanned: 0, fromBanks: 0, rejected: 0 };
    try {
      const box = client.mailbox as { uidValidity: number | bigint; uidNext: number | bigint };
      const uidValidity = Number(box.uidValidity);
      const last = Number(state && state.lastUid) || 0;
      const fresh = !last || Number(state && state.uidValidity) !== uidValidity;
      let uids: number[] = fresh
        ? ((await client.search({ since: new Date(Date.now() - 2 * 86400e3) }, { uid: true })) as number[])
        : ((await client.search({ uid: `${last + 1}:*` }, { uid: true })) as number[]);
      uids = (uids || []).map(Number).filter((u) => fresh || u > last).sort((a, b) => a - b);
      out.uidValidity = uidValidity;
      out.lastUid = uids.length ? uids[uids.length - 1] : fresh ? Math.max(0, Number(box.uidNext) - 1) : last;
      const recent = uids.slice(-MAX_PER_RUN);
      out.scanned = recent.length;
      const banks: number[] = [];
      if (recent.length) {
        for await (const m of client.fetch(recent, { uid: true, envelope: true }, { uid: true })) {
          const from = m.envelope && m.envelope.from && m.envelope.from[0];
          if (from && alerts.allowedSender(from.address || "", list)) banks.push(m.uid);
        }
      }
      out.fromBanks = banks.length;
      if (banks.length) {
        for await (const m of client.fetch(banks, { uid: true, source: true, internalDate: true }, { uid: true })) {
          const a = m.source ? await alerts.toAlert(m.source, m.internalDate || new Date(), opts) : null;
          if (a) out.alerts.push(a); else out.rejected++;
        }
      }
    } finally {
      lock.release();
    }
    await client.logout().catch(() => {});
    return out;
  };
  try {
    return await withTimeout(run(), opts.timeoutMs || 20000, () => { try { client.close(); } catch { /* already closed */ } });
  } catch (e) {
    try { client.close(); } catch { /* already closed */ }
    throw e;
  }
}

export function describeError(e: unknown): string {
  const err = e as { responseText?: string; message?: string; authenticationFailed?: boolean } | undefined;
  const s = String((err && (err.responseText || err.message)) || e || "");
  if (/AUTHENTICATIONFAILED|Invalid credentials|authenticat/i.test(s) || err?.authenticationFailed) {
    return "Gmail rejected the login: use a 16-character App Password (Google Account -> Security -> App passwords).";
  }
  if (/TIMEOUT|too long/i.test(s)) return "Gmail took too long to answer.";
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN/i.test(s)) return "Couldn't connect to Gmail.";
  return "Couldn't read the inbox: " + s.replace(/[^\w .:,'-]/g, "").slice(0, 120);
}
