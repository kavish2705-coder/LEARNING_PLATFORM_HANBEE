#!/usr/bin/env node
// Enforced accessibility gate (not a checklist item): computes the real
// WCAG contrast ratio for every text/background token pair that actually
// appears together in the dashboard theme, and fails the build if any
// pair drops below 4.5:1. Run via `npm run check-contrast`.
//
// Token values are parsed directly out of theme.css's oklch(L% C H [/ A])
// definitions -- no separate "source of truth" to keep in sync by hand.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_PATH = join(__dirname, "..", "src", "app", "dashboard", "theme.css");

// oklch -> linear sRGB -> relative luminance, per the CSS Color 4 / WCAG
// reference formulas (same math used by hex_to_oklch.mjs in reverse).
function oklchToLuminance({ L, C, H }) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toSrgbLinearLum = (c) => Math.max(0, Math.min(1, c));
  // WCAG relative luminance uses linear-light RGB directly with these
  // coefficients (no sRGB gamma re-encoding needed, since oklch -> linear
  // sRGB above already is linear).
  const R = toSrgbLinearLum(rLin), G = toSrgbLinearLum(gLin), B = toSrgbLinearLum(bLin);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(tok1, tok2) {
  const L1 = oklchToLuminance(tok1);
  const L2 = oklchToLuminance(tok2);
  const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseOklchBlocks(css) {
  // Matches "--token-name: oklch(L% C H [/ A]);" within a selector block,
  // scoped per [data-theme="..."] / :root block so dark and light don't mix.
  // Alpha is kept (not dropped) so backgrounds can be properly composited.
  const themes = {};
  const blockRe = /(:root,\s*\[data-theme="dark"\]|\[data-theme="light"\])\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(css))) {
    const themeName = m[1].includes("light") ? "light" : "dark";
    const body = m[2];
    const tokenRe = /--([a-z0-9-]+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/g;
    let t;
    themes[themeName] = themes[themeName] || {};
    while ((t = tokenRe.exec(body))) {
      const [, name, L, C, H, A] = t;
      themes[themeName][name] = { L: parseFloat(L) / 100, C: parseFloat(C), H: parseFloat(H), A: A != null ? parseFloat(A) : 1 };
    }
  }
  return themes;
}

// Composites a (possibly translucent) token over an opaque base token in
// OKLab space (linear w.r.t. perceptual lightness, good enough for this
// gate), returning an opaque {L,C,H} for contrast math.
function compositeOverBase(token, base) {
  if (token.A >= 0.999) return token;
  const mix = (a, b) => a * token.A + b * (1 - token.A);
  // Approximate by mixing L and converting hue/chroma to a cartesian a/b
  // pair so a near-zero-chroma token (white/black with alpha) blends
  // toward the base's hue instead of producing a meaningless hue average.
  const toAB = (t) => [t.C * Math.cos((t.H * Math.PI) / 180), t.C * Math.sin((t.H * Math.PI) / 180)];
  const [a1, b1] = toAB(token), [a2, b2] = toAB(base);
  const L = mix(token.L, base.L);
  const a = mix(a1, a2), b = mix(b1, b2);
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H, A: 1 };
}

// Text/background pairs that actually appear together in the dashboard UI.
const PAIRS = [
  ["text-main", "bg-page"],
  ["text-main", "bg-card"],
  ["text-muted", "bg-page"],
  ["text-muted", "bg-card"],
  ["color-primary-text", "color-primary"],
  ["btn-secondary-text", "btn-secondary-bg"],
  ["accent-subtle-text", "accent-subtle-bg"],
];

const css = readFileSync(THEME_PATH, "utf8");
const themes = parseOklchBlocks(css);

let failed = false;
for (const [themeName, tokens] of Object.entries(themes)) {
  console.log(`\n${themeName} theme:`);
  const base = tokens["bg-page"];
  for (const [fg, bg] of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) {
      console.log(`  ? ${fg} / ${bg} -- token not found`);
      continue;
    }
    // Both sides composited over bg-page -- correct for a translucent
    // background (btn-secondary-bg, accent-subtle-bg), a no-op for an
    // already-opaque one (color-primary, bg-card's own alpha only
    // matters relative to what's behind IT, which is bg-page here).
    const bgOpaque = compositeOverBase(tokens[bg], base);
    const fgOpaque = compositeOverBase(tokens[fg], bgOpaque);
    const ratio = contrastRatio(fgOpaque, bgOpaque);
    const ok = ratio >= 4.5;
    if (!ok) failed = true;
    console.log(`  ${ok ? "OK " : "FAIL"} ${fg} on ${bg}: ${ratio.toFixed(2)}:1 ${ok ? "" : "(needs >= 4.5:1)"}`);
  }
}

if (failed) {
  console.error("\nContrast check FAILED -- one or more token pairs are below 4.5:1.");
  process.exit(1);
}
console.log("\nAll checked token pairs meet 4.5:1.");
