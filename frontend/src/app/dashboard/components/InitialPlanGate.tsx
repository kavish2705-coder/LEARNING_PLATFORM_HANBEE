"use client";

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy, BookOpen } from "lucide-react";
import { useSessionProfile, sessionProfileKey } from "../../../lib/hooks/useSessionProfile";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import styles from "./access/accessBlocker.module.css";

// The one-time plan choice a brand-new independent student makes before
// they see any dashboard content at all (supabase/migrations/
// 0124_initial_plan_choice.sql enforces this server-side too -- both
// access flags must still be 'none'). Org/school students, staff, manager,
// and anyone who's already decided never see this.
export default function InitialPlanGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useSessionProfile();
  const [busy, setBusy] = useState<"tournament" | "course" | null>(null);
  const [error, setError] = useState("");

  const needsChoice = !isLoading && profile?.role === "student" && profile.is_solo
    && profile.tournament_access === "none" && profile.course_access === "none";

  if (!needsChoice) return <>{children}</>;

  async function choose(choice: "tournament" | "course") {
    setBusy(choice);
    setError("");
    try {
      await authenticatedSupabaseFetch("/rest/v1/rpc/choose_initial_plan", {
        method: "POST",
        body: JSON.stringify({ p_choice: choice }),
      });
      await queryClient.invalidateQueries({ queryKey: sessionProfileKey });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That didn't go through -- try again.");
      setBusy(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card} style={{ maxWidth: 620 }}>
        <h2 className={styles.title}>Choose your plan</h2>
        <p className={styles.body}>You can always add the other one later -- Hanbee staff just need to confirm it with a quick call first.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "left" }}>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose("tournament")}
            style={{ border: "var(--border-subtle)", borderRadius: 12, padding: 20, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left" }}
          >
            <Trophy size={22} style={{ marginBottom: 10, color: "var(--color-accent, #0891b2)" }} />
            <div style={{ fontWeight: 600, marginBottom: 6 }}>RC Tournament</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Driver License + per-tournament entry fees, as usual.</div>
            {busy === "tournament" && <div style={{ marginTop: 10, fontSize: 12 }}>Setting this up…</div>}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose("course")}
            style={{ border: "var(--border-subtle)", borderRadius: 12, padding: 20, background: "transparent", color: "inherit", cursor: "pointer", textAlign: "left" }}
          >
            <BookOpen size={22} style={{ marginBottom: 10, color: "var(--color-accent, #0891b2)" }} />
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Course only</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>A short qualifying quiz, then our team confirms the price with a call.</div>
            {busy === "course" && <div style={{ marginTop: 10, fontSize: 12 }}>Setting this up…</div>}
          </button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </div>
  );
}
