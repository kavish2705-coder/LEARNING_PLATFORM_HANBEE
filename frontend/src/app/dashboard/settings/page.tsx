"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import styles from "./settings.module.css";
import { useTheme } from "../ThemeProvider";
import { getAccountProfile, readStoredSession, updateAccountProfile, updatePassword } from "../../../lib/supabaseAuth";

export default function SettingsPage() {
  const { theme, setTheme, accentHue, setAccentHue, accentLightness, setAccentLightness } = useTheme();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ["account-profile"], queryFn: getAccountProfile });
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState<"" | "profile" | "password">("");
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
                <input id="new-password" type="password" className={styles.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="confirm-password">Confirm New Password</label>
                <input id="confirm-password" type="password" className={styles.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </div>
            </div>
            <button type="submit" className={styles.saveBtn} disabled={busy !== ""}>
              {busy === "password" ? "Changing..." : "Change Password"}
            </button>
          </form>
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
