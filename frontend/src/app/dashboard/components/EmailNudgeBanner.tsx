"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

export default function EmailNudgeBanner() {
  const { data: profile } = useSessionProfile();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem("email-nudge-dismissed") === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (profile?.role !== "student" || (profile.email && !profile.email.endsWith("@students.hanbee.internal")) || dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem("email-nudge-dismissed", "true");
      setDismissed(true);
    } catch {
      setDismissed(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "#fff7e6", color: "#704214", fontSize: 13 }}>
      <span style={{ flex: 1 }}>Add your email so you can sign in with Google and recover your account.</span>
      <Link href="/dashboard/settings" style={{ color: "#8a4b08", fontWeight: 600, whiteSpace: "nowrap" }}>Add email</Link>
      <button type="button" onClick={dismiss} aria-label="Dismiss email reminder" style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}
