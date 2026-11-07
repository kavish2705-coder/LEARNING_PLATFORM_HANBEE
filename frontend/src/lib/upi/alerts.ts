// Ported from codemode-upi-pay's src/alerts.js (MIT licensed).
import type { Alert } from "./types";

const DEFAULT_SENDERS = [
  "bank.in", "hdfcbank.net", "hdfcbank.com", "icicibank.com", "sbi.co.in", "axisbank.com", "kotak.com",
  "idfcfirstbank.com", "indusind.com", "yesbank.in", "federalbank.co.in", "bankofbaroda.com", "bankofbaroda.co.in",
  "pnb.co.in", "canarabank.com", "unionbankofindia.co.in", "aubank.in", "rblbank.com", "bandhanbank.com",
];
const BANK_NAMES: [RegExp, string][] = [
  [/hdfc/, "HDFC Bank"], [/icici/, "ICICI Bank"], [/(^|\.)sbi\./, "SBI"], [/axis/, "Axis Bank"], [/kotak/, "Kotak"],
  [/idfc/, "IDFC FIRST Bank"], [/indusind/, "IndusInd Bank"], [/yes/, "Yes Bank"], [/federal/, "Federal Bank"],
  [/baroda|bob/, "Bank of Baroda"], [/pnb/, "PNB"], [/canara/, "Canara Bank"], [/union/, "Union Bank"],
  [/(^|\.)au(bank)?\./, "AU Bank"], [/rbl/, "RBL Bank"], [/bandhan/, "Bandhan Bank"],
];

function htmlToText(html: string) {
  return String(html || "")
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&#8377;|&#x20b9;/gi, "₹").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

const MONEY = "(?:₹|Rs\\.?|INR)\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)";
const AMOUNT_PATTERNS = [
  new RegExp(MONEY + "\\s*(?:has\\s+been|have\\s+been|is|was)?\\s*(?:credited|received|deposited)", "i"),
  new RegExp("(?:credited|received|deposited)\\s*(?:with|by|for|of)?\\s*(?:an?\\s+amount\\s+of\\s*)?" + MONEY, "i"),
  new RegExp("\\bamount\\s*(?:\\(\\s*(?:Rs\\.?|INR|₹)\\s*\\))?\\s*[:\\-]?\\s*(?:₹|Rs\\.?|INR)?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)", "i"),
];
const NEAR_CREDIT = new RegExp("(?:credited|received|deposited)([\\s\\S]{0,60}?)" + MONEY, "i");
const UTR_PATTERNS = [
  /\b(?:UTR|RRN|UPI\s*Ref(?:erence)?|Ref(?:erence)?|Transaction\s*(?:ID|Ref(?:erence)?))\s*(?:No\.?|Number|Num|ID|#)?\s*(?:\(\s*(?:RRN|UTR)\s*\))?\s*(?:is|:|-|=|#)?\s*:?\s*(\d{12})(?!\d)/i,
  /\bUPI\s*[/:-]\s*(?:[A-Z0-9]{2,4}\s*[/:-]\s*)?(\d{12})(?!\d)/i,
];

function money(s: string) {
  const n = Number(String(s).replace(/,/g, ""));
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export function parseAlert(subject: string, body: string, opts?: { refRe?: RegExp; ownVpa?: string }) {
  const o = opts || {};
  const text = (String(subject || "") + "\n" + String(body || "")).replace(/[ \t ]+/g, " ");
  const credit = text.search(/\b(credited|received|deposited)\b/i);
  const debit = text.search(/\b(debited|withdrawn|spent|sent to|paid to|transferred to)\b/i);
  if (credit < 0 || (debit >= 0 && debit < credit)) return null;

  let amount = 0;
  for (const re of AMOUNT_PATTERNS) {
    const m = text.match(re);
    if (m && (amount = money(m[1]))) break;
  }
  if (!amount) {
    const m = text.match(NEAR_CREDIT);
    if (m && !/bal/i.test(m[1].slice(-15))) amount = money(m[2]);
  }

  let utr = "";
  for (const re of UTR_PATTERNS) {
    const m = text.match(re);
    if (m) { utr = m[1]; break; }
  }
  if (!utr) {
    const all = text.match(/(?<![\d*Xx])\d{12}(?!\d)/g) || [];
    if (new Set(all).size === 1) utr = all[0] || "";
  }
  if (!amount || !utr) return null;

  const refMatch = o.refRe ? text.match(o.refRe) : null;
  const own = String(o.ownVpa || "").toLowerCase();
  const payer = (text.match(/[a-z0-9._-]{2,64}@[a-z][a-z0-9-]{1,40}(?![a-z0-9.-])/gi) || [])
    .find((v) => v.toLowerCase() !== own) || "";
  return { amount, utr, ref: refMatch ? refMatch[1].toUpperCase() : "", payer };
}

function domainOf(address: string) {
  const m = String(address || "").trim().toLowerCase().match(/@([a-z0-9.-]+)$/);
  return m ? m[1].replace(/\.$/, "") : "";
}

export function senderList(value?: string | string[]) {
  const list = (Array.isArray(value) ? value : String(value || "").split(/[\s,]+/))
    .map((s) => String(s).trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  return list.length ? list : DEFAULT_SENDERS;
}

export function allowedSender(address: string, list: string[]) {
  const addr = String(address || "").trim().toLowerCase();
  const dom = domainOf(addr);
  if (!dom) return false;
  return list.some((e) => (e.includes("@") ? addr === e : dom === e || dom.endsWith("." + e)));
}

function headerLines(raw: Buffer | string) {
  const s = Buffer.isBuffer(raw) ? raw.toString("latin1") : String(raw || "");
  const end = s.search(/\r?\n\r?\n/);
  return (end < 0 ? s : s.slice(0, end)).replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/);
}

function parseAuthResults(value: string) {
  const parts = String(value || "").replace(/\([^()]*\)/g, " ").split(";").map((p) => p.trim()).filter(Boolean);
  const server = (parts.shift() || "").split(/\s+/)[0].toLowerCase();
  const results = parts.map((p) => {
    const m = p.match(/^([a-z0-9_-]+)\s*=\s*([a-z0-9_-]+)(.*)$/i);
    if (!m) return null;
    const props: Record<string, string> = {};
    (m[3].match(/[a-z0-9_.-]+=[^\s;]+/gi) || []).forEach((kv) => {
      const i = kv.indexOf("=");
      props[kv.slice(0, i).toLowerCase()] = kv.slice(i + 1).replace(/^"|"$/g, "").toLowerCase();
    });
    return { method: m[1].toLowerCase(), result: m[2].toLowerCase(), props };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  return { server, results };
}

const aligned = (d: string, from: string) => !!d && (d === from || from.endsWith("." + d) || d.endsWith("." + from));

export function verifySender(raw: Buffer | string, list?: string[], authServer?: string) {
  const lines = headerLines(raw);
  const froms = lines.filter((l) => /^from\s*:/i.test(l));
  if (froms.length !== 1) return { ok: false, reason: "needs exactly one From header" };
  const addrs = froms[0].replace(/^from\s*:/i, "").match(/[^\s<>"',;:]+@[^\s<>"',;:]+/g) || [];
  if (addrs.length !== 1) return { ok: false, reason: "needs exactly one From address" };
  const address = addrs[0].toLowerCase(), from = domainOf(address);
  if (!allowedSender(address, list || DEFAULT_SENDERS)) return { ok: false, reason: "sender is not on the bank list", domain: from };
  const ar = lines.find((l) => /^authentication-results\s*:/i.test(l));
  if (!ar) return { ok: false, reason: "no Authentication-Results header", domain: from };
  const { server, results } = parseAuthResults(ar.replace(/^authentication-results\s*:/i, ""));
  if (server !== (authServer || "mx.google.com")) return { ok: false, reason: "not checked by Gmail", domain: from };
  const dmarc = results.some((r) => r.method === "dmarc" && r.result === "pass" && r.props["header.from"] === from);
  const dkim = results.some((r) => r.method === "dkim" && r.result === "pass" &&
    aligned(r.props["header.d"] || domainOf(r.props["header.i"]), from));
  return dmarc || dkim ? { ok: true, domain: from, address } : { ok: false, reason: "DKIM/DMARC did not pass", domain: from };
}

function bankName(domain: string) {
  const d = String(domain || "").toLowerCase();
  const hit = BANK_NAMES.find(([re]) => re.test(d));
  return hit ? hit[1] : d;
}

export async function toAlert(raw: Buffer | string, receivedAt: string | number | Date, opts?: { alertSenders?: string | string[]; authServer?: string; refRe?: RegExp; ownVpa?: string }): Promise<Alert | null> {
  const o = opts || {};
  const sender = verifySender(raw, senderList(o.alertSenders), o.authServer);
  if (!sender.ok || !sender.domain) return null;
  const { simpleParser } = await import("mailparser");
  const mail = (await simpleParser(raw, { skipImageLinks: true, skipTextToHtml: true, skipTextLinks: true })) as {
    subject?: string; text?: string; html?: string | false;
  };
  const info = parseAlert(String(mail.subject || ""), mail.text || htmlToText(String(mail.html || "")), { refRe: o.refRe, ownVpa: o.ownVpa });
  if (!info) return null;
  return {
    utr: info.utr, amount: info.amount, bank: bankName(sender.domain), payer: info.payer, ref: info.ref,
    receivedAt: new Date(receivedAt || Date.now()).toISOString(),
  };
}

export { DEFAULT_SENDERS };
