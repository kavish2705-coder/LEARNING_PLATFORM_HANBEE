// Single translation layer between what Postgres/PostgREST actually says
// and what a user sees. Wired in at readError() in supabaseAuth.ts, the
// one chokepoint every API call in the app already passes through (see
// docs/error-message-catalog.md for how that was confirmed).
//
// Most of the ~278 raw `raise exception` messages already read fine on
// their own -- the catalog's own assessment was "the main gap is tone,
// not comprehension" -- so this isn't a line-for-line rewrite of all of
// them. It does three things instead:
//
//   1. Replaces the handful of messages that are either reused across
//      many unrelated actions (the generic "not allowed" guard, ~25
//      call sites) or read noticeably harsher than the rest, with a
//      single clear, polite version.
//   2. Detects genuine raw Postgres/system errors -- the kind that leak
//      straight through when a function isn't guarded (the clock_in
//      bug and its siblings, see Part 2 of the catalog) -- and replaces
//      them with one safe, generic apology instead of showing a column
//      or constraint name to a non-technical user.
//   3. Lightly polishes everything else so it's consistent: capitalized,
//      ends with a period, no stray technical prefixes.

const EXACT_REPLACEMENTS: Record<string, string> = {
  "not allowed": "You don't have permission to do that.",
  "account is not active": "Your account isn't active yet. Contact Hanbee staff if you think this is a mistake.",
  "not authenticated": "Please sign in to continue.",
  "not signed in": "Please sign in to continue.",
  "Your session has expired. Sign in again to continue.": "Your session has expired. Please sign in again.",
  "Session from session_id claim in JWT does not exist": "Your session has expired. Please sign in again.",
  "Invalid login credentials": "That email/username or password isn't right. Double-check and try again.",
  "you already clocked in today": "You've already clocked in today.",
  "you have not clocked in today": "You haven't clocked in yet today.",
  "you already clocked out today": "You've already clocked out today.",
  "staff work settings are not configured": "Something's not set up correctly on our side yet. Contact a manager to fix the staff work-hours settings.",
};

// Raw-leak detectors: patterns that only ever show up when a real
// Postgres error slipped through unguarded (see catalog Part 2). These
// are never safe to show as-is -- they can name real column/constraint
// names -- so every match becomes one generic, safe message.
const RAW_LEAK_PATTERNS: RegExp[] = [
  /null value in column/i,
  /violates (not-null|unique|foreign key|check) constraint/i,
  /duplicate key value violates/i,
  /relation ".*" does not exist/i,
  /column ".*" does not exist/i,
  /permission denied for/i,
  /syntax error at or near/i,
  /^ERROR:/,
];

const GENERIC_FALLBACK = "Something went wrong on our side. Please try again, and contact Hanbee staff if it keeps happening.";

function polish(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return GENERIC_FALLBACK;
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

export function humanizeError(rawMessage: string): string {
  if (!rawMessage) return GENERIC_FALLBACK;

  const exact = EXACT_REPLACEMENTS[rawMessage.trim()];
  if (exact) return exact;

  if (RAW_LEAK_PATTERNS.some((pattern) => pattern.test(rawMessage))) {
    return GENERIC_FALLBACK;
  }

  return polish(rawMessage);
}
