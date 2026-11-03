"use client";

import { usePathname } from "next/navigation";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import type { AccountProfile } from "../../../lib/supabaseAuth";

// Learning isn't ready for real students yet -- blurred/blocked for them,
// but a test/dummy account can still preview it by being listed in
// NEXT_PUBLIC_LEARNING_PREVIEW_ACCOUNTS (comma-separated emails or
// usernames, matched case-insensitively). Remove this gate (and that env
// var) once Learning is ready for everyone.
const LEARNING_ONLY_PREFIXES = ["/dashboard/courses", "/dashboard/certificate", "/dashboard/ai-assistant", "/dashboard/attendance"];

function isPreviewAccount(profile: AccountProfile | undefined) {
  const allowlist = (process.env.NEXT_PUBLIC_LEARNING_PREVIEW_ACCOUNTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowlist.length || !profile) return false;
  const email = profile.email?.toLowerCase();
  const username = profile.username?.toLowerCase();
  return Boolean((email && allowlist.includes(email)) || (username && allowlist.includes(username)));
}

export default function LearningComingSoon({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: profile } = useSessionProfile();

  const isLearningRoute = Boolean(pathname && LEARNING_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix)));
  const blocked = isLearningRoute && profile?.role === "student" && !isPreviewAccount(profile);

  if (!blocked) return <>{children}</>;

  return (
    <div style={{ position: "relative", minHeight: "100%", height: "100%" }}>
      <div style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none", minHeight: "100%" }} aria-hidden="true">
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.45)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            padding: "32px 36px",
            borderRadius: 18,
            textAlign: "center",
            maxWidth: 360,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>Coming soon</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
            This part of Hanbee isn&apos;t open yet. Check back soon!
          </p>
        </div>
      </div>
    </div>
  );
}
