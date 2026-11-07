// Ported from codemode-upi-pay's src/link.js (MIT licensed).
import crypto from "crypto";

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const VPA_RE = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,64}$/i;

export function checkPrefix(prefix?: string) {
  const p = String(prefix || "PAY").toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(p)) throw new Error('refPrefix must be 2 to 5 letters, e.g. "PAY".');
  return p;
}

export function newRef(prefix?: string) {
  let s = checkPrefix(prefix);
  for (let i = 0; i < 8; i++) s += REF_CHARS[crypto.randomInt(REF_CHARS.length)];
  return s;
}

export function refPattern(prefix?: string) {
  return new RegExp("\\b(" + checkPrefix(prefix) + "[" + REF_CHARS + "]{8})\\b", "i");
}

export function payLink(o: { vpa: string; name: string; amount: number; ref: string }) {
  const enc = (v: unknown) => encodeURIComponent(String(v)).replace(/%40/g, "@");
  return "upi://pay?pa=" + enc(o.vpa) + "&pn=" + enc(o.name) + "&am=" + Number(o.amount).toFixed(2) + "&cu=INR&tn=" + enc(o.ref);
}

export async function qrSvg(text: string, opts?: { margin?: number; dark?: string; light?: string }) {
  const QR = await import("qrcode");
  const o = opts || {};
  return QR.toString(text, {
    type: "svg", errorCorrectionLevel: "H", margin: o.margin == null ? 0 : o.margin,
    color: { dark: o.dark || "#0f172aff", light: o.light || "#ffffffff" },
  });
}
