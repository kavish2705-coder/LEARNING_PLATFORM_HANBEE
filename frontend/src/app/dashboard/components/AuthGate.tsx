"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { AUTH_SESSION_KEY, getCurrentAccount, readStoredSession, type SignedInAccount } from "../../../lib/supabaseAuth";

const ROLE_HOME: Record<string, string> = {
  student: "/dashboard",
  school_staff: "/dashboard/school/overview",
  staff: "/dashboard/hanbee/my-space",
  manager: "/dashboard/manager/monitor",
};

const SHARED = [
  "/dashboard/chat",
  "/dashboard/announcements",
  "/dashboard/settings",
  "/dashboard/leaderboard",
  "/dashboard/team",
  "/dashboard/license"
];

const ROLE_AREAS: Record<string, string[]> = {
  student: ["/dashboard", ...SHARED, "/dashboard/courses", "/dashboard/attendance", "/dashboard/achievements", "/dashboard/certificate", "/dashboard/ai-assistant", "/dashboard/join-school"],
  school_staff: [...SHARED, "/dashboard/school"],
  staff: ["/dashboard", ...SHARED, "/dashboard/hanbee", "/dashboard/courses", "/dashboard/users", "/dashboard/attendance"],
  manager: ["/dashboard", ...SHARED, "/dashboard/manager", "/dashboard/hanbee", "/dashboard/courses", "/dashboard/users", "/dashboard/attendance"],
};

// Shared with useSessionProfile's cache intent: re-verifying "who am I" is a
// real network round trip (GET /auth/v1/user, then GET /rest/v1/profiles),
// not free. AuthGate used to re-run that in full on every single in-app
// navigation (pathname was its effect's dependency), so every click paid
// for two sequential requests whose answer hadn't actually changed since
// the last one -- real wasted traffic at any scale, worse on slower
// connections. React Query's cache makes this correctly lazy: a real fetch
// only happens on first mount (or after staleTime), and ordinary navigation
// between two allowed pages reads the cached role with zero network cost.
const authQueryKey = ["auth-verify"] as const;

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = readStoredSession();

  const { data: account, error, isLoading } = useQuery<SignedInAccount>({
    queryKey: authQueryKey,
    queryFn: () => getCurrentAccount(session!),
    enabled: Boolean(session),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!session) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!account) return;

    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(account.session));
    const home = ROLE_HOME[account.role] ?? "/dashboard";
    const path = pathname ?? window.location.pathname;
    const allowed = ROLE_AREAS[account.role] ?? [];
    if (!allowed.some((area) => (area === "/dashboard" ? path === area : path === area || path.startsWith(`${area}/`)))) {
      router.replace(home);
    }
    // Deliberately only reacting to path/account changes here, not re-running
    // any network request -- the query above already owns that lifecycle.
  }, [session, account, pathname, router]);

  useEffect(() => {
    if (!error) return;
    const expiredSession = error instanceof Error && /refresh token|invalid jwt|unauthorized/i.test(error.message);
    if (expiredSession) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [error, router]);

  useEffect(() => {
    if (!account) return;
    if ((account.role === "staff" || account.role === "school_staff") && !account.approved) {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
    }
  }, [account]);

  if (!session) {
    return <main role="status" aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking your account…</main>;
  }

  if (error && !/refresh token|invalid jwt|unauthorized/i.test(error instanceof Error ? error.message : "")) {
    return (
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div>
          <p>{error instanceof Error ? error.message : "We couldn't verify your session."}</p>
          <button type="button" onClick={() => router.replace("/login")}>Return to sign in</button>
        </div>
      </main>
    );
  }

  if (isLoading || !account) {
    return <main role="status" aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking your account…</main>;
  }

  if ((account.role === "staff" || account.role === "school_staff") && !account.approved) {
    return (
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div>
          <p>Your account is waiting for approval. You can sign in after a manager or Hanbee staff member approves it.</p>
          <button type="button" onClick={() => router.replace("/login")}>Return to sign in</button>
        </div>
      </main>
    );
  }

  const path = pathname ?? "";
  const allowed = ROLE_AREAS[account.role] ?? [];
  const pathIsAllowed = allowed.some((area) => (area === "/dashboard" ? path === area : path === area || path.startsWith(`${area}/`)));
  if (!pathIsAllowed) {
    // The redirect effect above is already in flight; keep showing the
    // loading state instead of flashing this page's real content.
    return <main role="status" aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking your account…</main>;
  }

  return children;
}
