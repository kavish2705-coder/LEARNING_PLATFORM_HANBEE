"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import styles from "./settings.module.css";
import { useTheme } from "../ThemeProvider";
import {
  authenticatedSupabaseFetch,
  getAccountProfile,
  readStoredSession,
  updateAccountProfile,
  updatePassword,

} from "../../../lib/supabaseAuth";

const NOTIFICATION_KINDS: { kind: string; label: string }[] = [
  { kind: "team_invitation", label: "Team invitations" },
  { kind: "team_verified", label: "Team approved" },
  { kind: "team_rejected", label: "Team not approved" },
  { kind: "application_verified", label: "Course application approved" },
  { kind: "application_rejected", label: "Course application rejected" },
  { kind: "assessment_verified", label: "Assessment reviewed" },
  { kind: "school_verified", label: "School verified" },
];

export default function SettingsPage() {
  const { theme, setTheme, accentHue, setAccentHue, accentLightness, setAccentLightness } = useTheme();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["account-profile"], queryFn: getAccountProfile });
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState<"" | "profile" | "password">("");
  const [preferredTeam, setPreferredTeam] = useState("");

  const { data: extra } = useQuery({
    queryKey: ["account-extra", profile?.id],
    queryFn: () => authenticatedSupabaseFetch<{ student_id: string | null; preferred_team_name: string | null }[]>(
      `/rest/v1/profiles?select=student_id,preferred_team_name&id=eq.${profile?.id}`,
    ),
    enabled: Boolean(profile?.id),
  });
  const studentId = extra?.[0]?.student_id ?? null;

  useEffect(() => {
    if (extra?.[0]) setPreferredTeam(extra[0].preferred_team_name ?? "");
  }, [extra]);

  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs", profile?.id],
    queryFn: () => authenticatedSupabaseFetch<{ kind: string; enabled: boolean }[]>("/rest/v1/notification_preferences?select=kind,enabled"),
    enabled: Boolean(profile?.id),
  });
  const enabledFor = (kind: string) => prefs?.find((p) => p.kind === kind)?.enabled ?? true;

  async function savePreferredTeam(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy("profile");
    setStatus(null);
    try {
      await authenticatedSupabaseFetch(`/rest/v1/profiles?id=eq.${profile.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ preferred_team_name: preferredTeam.trim() || null }),
      });
      await queryClient.invalidateQueries({ queryKey: ["account-extra"] });
      setStatus({ tone: "ok", text: "Preferred team name saved." });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't save your team name." });
    } finally {
      setBusy("");
    }
  }

  async function toggleNotification(kind: string, enabled: boolean) {
    if (!profile) return;
    setStatus(null);
    try {
      await authenticatedSupabaseFetch("/rest/v1/notification_preferences?on_conflict=user_id,kind", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: profile.id, kind, enabled }),
      });
      await queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't save that choice." });
    }
  }
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy("profile");
    setStatus(null);
    try {
      await updateAccountProfile({ id: profile.id, full_name: fullName.trim() });
      await queryClient.invalidateQueries({ queryKey: ["account-profile"] });
      setStatus({ tone: "ok", text: "Profile saved." });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't save your profile." });
    } finally {
      setBusy("");
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (newPassword.length < 8) {
      setStatus({ tone: "error", text: "Your new password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ tone: "error", text: "The two passwords don't match." });
      return;
    }
    const session = readStoredSession();
    if (!session) {
      setStatus({ tone: "error", text: "Your session has expired. Sign in again." });
      return;
    }
    setBusy("password");
    try {
      await updatePassword(session.access_token, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ tone: "ok", text: "Password changed." });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't change your password." });
    } finally {
      setBusy("");
    }
  }



  const initial = (profile?.full_name ?? "H").charAt(0).toUpperCase();

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage your account and preferences</p>
      </div>

      {status && <p role={status.tone === "error" ? "alert" : "status"} style={{ marginBottom: 12 }}>{status.text}</p>}

      <div className={styles.settingsLayout}>
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Profile Settings</h2>

          <div className={styles.profileTop}>
            <div className={styles.avatarLg}>{initial}</div>
            <div className={styles.avatarInfo}>
              <h3>{profile?.full_name ?? ""}</h3>
              <p>{profile?.email ?? ""}</p>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="full-name">Full Name</label>
              <input id="full-name" type="text" className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required />
            </div>
            <button type="submit" className={styles.saveBtn} disabled={busy !== "" || !profile}>
              {busy === "profile" ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </section>

        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Account & Security</h2>

          <form onSubmit={changePassword}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="new-password">New Password</label>
                <input id="new-password" type="password" autoComplete="new-password" className={styles.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="confirm-password">Confirm New Password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" className={styles.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </div>
            </div>
            <button type="submit" className={styles.saveBtn} disabled={busy !== ""}>
              {busy === "password" ? "Changing..." : "Change Password"}
            </button>
          </form>


        </section>

        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Student Details</h2>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="student-id">Student ID</label>
            <input id="student-id" type="text" className={styles.input} value={studentId ?? "Not set yet. Your school adds it."} readOnly />
          </div>
          <form onSubmit={savePreferredTeam}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="preferred-team">Preferred Team Name</label>
              <input id="preferred-team" type="text" className={styles.input} value={preferredTeam} onChange={(e) => setPreferredTeam(e.target.value)} maxLength={60} />
            </div>
            <button type="submit" className={styles.saveBtn} disabled={busy !== ""}>Save Team Name</button>
          </form>
        </section>

        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Notifications</h2>
          {NOTIFICATION_KINDS.map(({ kind, label }) => (
            <label key={kind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
              <span>{label}</span>
              <input type="checkbox" checked={enabledFor(kind)} onChange={(e) => void toggleNotification(kind, e.target.checked)} />
            </label>
          ))}
        </section>

        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Appearance</h2>

          <div className={styles.appearanceOptions}>
            <button className={`${styles.themeBtn} ${theme === "Dark" ? styles.themeBtnActive : ""}`} onClick={() => setTheme("Dark")}>
              <Moon size={16} /> Dark
            </button>
            <button className={`${styles.themeBtn} ${theme === "Light" ? styles.themeBtnActive : ""}`} onClick={() => setTheme("Light")}>
              <Sun size={16} /> Light
            </button>
            <button className={`${styles.themeBtn} ${theme === "System" ? styles.themeBtnActive : ""}`} onClick={() => setTheme("System")}>
              <Monitor size={16} /> System
            </button>
            <button className={`${styles.themeBtn} ${theme === "Personalized" ? styles.themeBtnActive : ""}`} onClick={() => setTheme("Personalized")}>
              <Palette size={16} /> Personalized
            </button>
          </div>

          {theme === "Personalized" && (
            <div style={{ marginTop: "32px", animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Palette size={18} style={{ color: "var(--accent)" }} />
                <h4 style={{ fontSize: "15px", fontWeight: "500" }}>Choose Your Vibe</h4>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                  <span>Color Hue</span>
                </div>
                <div className={styles.colorSliderWrapper}>
                  <input type="range" min="0" max="360" value={accentHue} onChange={(e) => setAccentHue(Number(e.target.value))} className={styles.colorSlider} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                  <span>Intensity (Light / Dark)</span>
                </div>
                <div className={styles.colorSliderWrapper}>
                  <input type="range" min="15" max="85" value={accentLightness} onChange={(e) => setAccentLightness(Number(e.target.value))} className={styles.lightnessSlider} />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
