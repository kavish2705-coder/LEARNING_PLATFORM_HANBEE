# Hanbee Dashboard — Full UI/UX Audit

**Date:** 2026-11-05
**Scope:** Student, Hanbee Staff, and Manager roles (School/owner role credentials unavailable — see note). Audited against port 3003, a clean local instance separate from the in-progress review on port 3001.
**Method:** Live Playwright walkthrough of each role's real nav, cross-checked against `ui-ux-pro-max`'s UX guideline database, plus a codebase grep for color-token bypass.

---

## Executive Summary

The OKLCH token conversion and contrast gate landed cleanly with zero visual regression — that part of the system is solid. But the audit found the *components* largely don't use the token system at all: **758 raw hex/rgba color values exist outside `theme.css`**, including dozens of literal duplicates of the exact colors the tokens already define (`#10b981`, `#f59e0b`, `#ef4444`, `#7dd3e8`). This means the contrast gate and theme-switching only protect the handful of tokens it checks — most on-screen color is unguarded and, worse, **doesn't repaint between light and dark themes**, since it's hardcoded rather than token-driven. That is the single most urgent fix. Beyond that, the three roles audited (student, staff, manager) feel like three different products: nav item count ranges from 8 (student) to 17 (manager), accent-color usage goes from one disciplined hue (student) to five decorative hues per card (staff/manager). Two concrete content bugs were also found: a real typo ("RC Tounament") and a truncation bug that clips primary action-card titles mid-word on the Manager Overview page.

---

## Per-Role Findings

| Role | Page | Flaw | Severity | Fix Recommendation |
|---|---|---|---|---|
| Student | Overview | "0% · In Progress" status text uses a hardcoded `rgb(125, 211, 232)` (light cyan on transparent/white), not a theme token — measures well under WCAG AA on light backgrounds. | **Critical** | Replace with `var(--text-muted)` + a semantic `--color-info-text` token, or darken to a token that's already contrast-gated. |
| Student | Overview | "Next Race" card title reads **"RC Tounament"** — missing an 'r'. | High | Fix the typo in the source string (likely `TournamentOverview.tsx` or a copy constant it imports). |
| Student | Overview (mobile, 390px) | Search bar placeholder truncates to `"Se..."` while the `Ctrl K` hint keeps full width, because the hint isn't given lower layout priority. | Medium | Hide the `Ctrl K` hint below a `sm` breakpoint, or let the placeholder shrink via `text-overflow: ellipsis` with a `min-width` reserved for the hint. |
| Student | All pages | No motion tokens applied anywhere observed — card hovers/reveals use whatever each component already had (if anything), not `--motion-fast-*`/`--motion-moment-*`. | Medium | See cross-cutting motion-token gap below. |
| Staff | My Space (Overview) | Sidebar has 13 nav items in a fixed-height container with an internal scrollbar; "Settings" and the signed-in-user/sign-out card are pushed below the fold and only reachable by scrolling the nav itself. | High | Pin the user card + sign-out to the bottom outside the scrollable nav list (flex `mt-auto`), so they're always visible regardless of nav length. |
| Staff | My Space (Overview) | Stat cards use five different accent hues (cyan "Live Student Grid," indigo "Review tournament entries," green "SCRUTINEERING," purple "PACE BENCHMARK," amber elsewhere) with no evident semantic mapping (not consistently status-based) — reads as decorative rather than meaningful. | Medium | Either define an explicit category→hue mapping (e.g. hue = metric type, consistently) and document it, or collapse to the single `--accent` + semantic status tokens (success/warning/danger) already in `theme.css`. |
| Manager | Overview (Monitor) | **Action-center card titles are truncated mid-word**: "Review school ...", "Review staff a...", "Review tourna...", "Review course ...". These are the page's primary calls-to-action and the clipped text loses the actual subject of each action. | **Critical** | Give these titles `white-space: normal` + `line-clamp: 2` instead of single-line ellipsis, or widen the card / shrink the font. This is flagged Critical per `ui-ux-pro-max`'s own "Essential Text Truncation" guideline (clamping action-identifying text, not just decorative copy, is explicitly called out as critical-severity). |
| Manager | Overview (Monitor) | Breadcrumb reads **"Dashboard > Monitor"** while the sidebar's active/highlighted nav item is **"Overview"** — two different labels for the same page. | Medium | Rename one to match the other; "Overview" matches the pattern used by every other role, so standardize on that. |
| Manager | Overview (Monitor) | Same hardcoded-hex issue as student role: stat labels ("Registered schools," "Active students," "Published courses") and pill badges ("0 pending," "1 pending") use the same non-token color set found in the grep below. | High | Same fix as the cross-cutting item. |
| School/owner | — | Could not audit. `demo.owner1@hanbee.test` / `Demo#12345` was rejected (same as earlier this session for `demo.s1@hanbee.test` — the `@hanbee.test` seed accounts appear to be stale/rotated). Did not attempt further password guesses per the task's guardrail. | — | Provide a working school-role credential (or reseed `supabase/tests/seed-demo.mjs`) so this role can be audited in a follow-up pass. |

---

## Cross-Cutting Issues

### 1. Token system is defined but not adopted (Critical, highest priority)
A grep for raw colors under `frontend/src/app/dashboard` (excluding `theme.css` itself) found **758 hex/rgba occurrences**. A sample of the most common hex values and where they live:

| Hex | Count (sample) | Matches theme token | Files (sample) |
|---|---|---|---|
| `#10b981` | 40+ | `--color-success` | `TournamentOverview.module.css`, `license.module.css`, `HanbeeOverview.tsx`, `HanbeeLmsOverview.tsx`, `registrationStatus.module.css` |
| `#f59e0b` / `#fbbf24` | 20+ | `--color-warning` | `TournamentOverview.module.css`, `HanbeeLmsOverview.tsx`, `license/page.tsx` |
| `#ef4444` | 10+ | `--color-danger` | `announcements.module.css`, `registrationStatus.module.css` |
| `#7dd3e8` | 22+ | `--accent` (dark theme) | `license/page.tsx`, `TournamentOverview.tsx`, `license.module.css`, `Header.tsx`, `SearchBar.module.css` |

**Why this matters beyond cosmetics:** these are literal duplicates of colors already defined in `theme.css`, but copied at a single theme's value. In light mode, a component hardcoded to `#7dd3e8` (the *dark*-theme accent) will show the wrong hue — it can't repaint to the light theme's `oklch(51.1% 0.230 277.0)` indigo. This is very likely why the student Overview screenshot in light mode and the originally-reviewed dark-mode screenshot showed visually consistent accents only by coincidence (the hardcoded value happens to look plausible in both) rather than by correct theming. Any component using one of these hardcodes is **not actually theme-aware**, regardless of what `theme.css` says.

Not all 758 hits are problems — many are legitimate (shadow `rgba(0,0,0,...)` values, which `theme.css` itself intentionally still uses raw for `--clay-shadow-*`). The fix should target color hits that duplicate a semantic token's hue, not shadows.

### 2. Motion tokens are defined, not wired (Medium-High)
`--motion-fast-*` and `--motion-moment-*` exist in `theme.css` but no component CSS module or Framer Motion `transition` prop observed during this audit referenced them. Every animated element still uses its own ad-hoc duration (if any). This isn't a visible "bug" today, but it means the two-tier pacing design decision (150ms utilitarian vs. 380ms settle) currently has zero effect — it's aspirational, not real. Needs a follow-up pass that greps every `.module.css` for `transition:`/`animation:` and every `framer-motion` `transition={{...}}` prop and re-points duration/easing at the tokens.

### 3. Nav density and visual-language consistency varies sharply by role
- Student: 8 nav items, single accent hue used consistently.
- Staff: 13 nav items, five decorative accent hues on one page.
- Manager: 17 nav items, same multi-hue pattern, sidebar overflow problem noted above.

This isn't necessarily wrong — staff/manager genuinely have more operational surface area than a student — but there's no shared visual "weight" rule (e.g. hue reserved for status, not category) tying the three together as one product family. A reviewer moving between roles (as Kavish currently is) will likely perceive them as inconsistent.

### 4. `[data-theme="personalized"]` was left as HSL, not OKLCH
Confirmed this is real but low-risk: it only activates for users who've set a custom accent hue in Settings, and its *own* internal math (HSL hue/lightness sliders) is self-consistent. No visual clash observed in this audit, but it means the WCAG contrast gate (`scripts/check-contrast.mjs`) does **not** cover this theme at all — a user picking an unlucky custom hue/lightness combination has no automated protection against landing on a low-contrast primary-button-text pairing. Flagged for awareness, not an active bug.

---

## Prioritized Action Plan

**Phase 1 — Critical fixes (do first, low risk, high visibility)**
1. Fix the manager Overview action-card title truncation (clipped primary CTAs).
2. Fix the student Overview hardcoded-cyan contrast failure on "Practice readiness" status text.
3. Fix the "RC Tounament" typo.

**Phase 2 — Token adoption (the real fix, larger scope)**
4. Replace the highest-count hardcoded hex values (`#10b981`, `#f59e0b`/`#fbbf24`, `#ef4444`, `#7dd3e8`) with their matching `theme.css` custom properties, file by file, starting with the files already touched this session's contrast work (`TournamentOverview.module.css`, `license.module.css` — both outside the "don't touch" list) before touching anything near the other assistant's in-progress files.
5. Re-run `npm run check-contrast` after each batch to make sure no newly-exposed pairing regresses.

**Phase 3 — Consistency and polish**
6. Fix the Manager breadcrumb/active-nav label mismatch ("Monitor" vs "Overview").
7. Add `mt-auto`-pinned user card/sign-out to the staff/manager sidebars so they can't scroll out of reach.
8. Decide and document an explicit hue→meaning mapping for staff/manager stat cards (or collapse to the existing semantic tokens).
9. Fix the mobile search-bar/`Ctrl K` hint truncation at 390px.

**Phase 4 — Motion wiring (separate, larger pass)**
10. Grep and re-point existing transitions/animations at `--motion-fast-*`/`--motion-moment-*`, role by role, starting with the highest-frequency staff/manager queue surfaces.

**Not yet covered**
11. Re-attempt the School/owner role with working credentials.

---

## Screenshots

Saved to `docs/dashboard-screenshots/ui-audit-2026-11-05/`:
- `student-overview-light.png`
- `student-overview-mobile-390.png`
- `staff-myspace-overview.png`
- `manager-overview-truncation-bug.png`
