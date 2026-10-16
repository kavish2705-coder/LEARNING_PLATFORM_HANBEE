"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AUTH_SESSION_KEY, getCurrentAccount, readStoredSession, type SupabaseSession } from "../../../lib/supabaseAuth";

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

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    // Re-validate on every path change, not just on mount. AuthGate wraps
    // the whole dashboard layout, so it never remounts between routes --
    // without this, an internal router.replace() redirect (e.g. a
    // school-staff account hitting a student-only URL) would land on the
    // new, correctly-authorized page but this effect would never re-run to
    // flip `ready` to true, freezing the app on "Checking your account..."
    // forever even though every request behind it had already succeeded.
    // Deliberately not resetting `ready` to false here: setReady(true) is
    // idempotent (React skips the re-render when the value is unchanged),
    // so ordinary in-app navigation between two allowed pages stays
    // instant -- only a genuinely disallowed path leaves `ready` false
    // long enough to show the spinner during its redirect.

    async function restoreSession() {
      const session = readStoredSession();
      if (!session) {
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      try {
        const account = await getCurrentAccount(session);
        if (!active) return;
        if ((account.role === "staff" || account.role === "school_staff") && !account.approved) {
          window.localStorage.removeItem(AUTH_SESSION_KEY);
          setMessage("Your account is waiting for approval. You can sign in after a manager or Hanbee staff member approves it.");
          return;
        }
        window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(account.session));
        const home = ROLE_HOME[account.role] ?? "/dashboard";
        const path = pathname ?? window.location.pathname;
        const allowed = ROLE_AREAS[account.role] ?? [];
        if (!allowed.some((area) => (area === "/dashboard" ? path === area : path === area || path.startsWith(`${area}/`)))) {
          router.replace(home);
          return;
        }
        setReady(true);
      } catch (error) {
        if (!active) return;
        const expiredSession = error instanceof Error && /refresh token|invalid jwt|unauthorized/i.test(error.message);
        if (expiredSession) {
          window.localStorage.removeItem(AUTH_SESSION_KEY);
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setMessage(error instanceof Error ? error.message : "We couldn't verify your session.");
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, [router, pathname]);

  if (message) {
    return (
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div>
          <p>{message}</p>
          <button type="button" onClick={() => router.replace("/login")}>Return to sign in</button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return <main role="status" aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Checking your account…</main>;
  }

  return children;
}
