"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Monitor, Palette, Check, Lock, Save, CheckCircle2, AlertCircle, Camera, Trash2 } from "lucide-react";
import { useRef } from "react";
import { processProfileImage } from "../../../lib/imageUtils";
import styles from "./settings.module.css";
import { useTheme } from "../ThemeProvider";
import { useSessionProfile, sessionProfileKey } from "../../../lib/hooks/useSessionProfile";
import {
  authenticatedSupabaseFetch,
  readStoredSession,
  updateAccountProfile,
  updateMyEmail,
  updatePassword,
} from "../../../lib/supabaseAuth";

interface NotificationKindItem {
  kind: string;
  label: string;
  desc: string;
}

const NOTIFICATION_KINDS: NotificationKindItem[] = [
  { 
    kind: "team_invitation", 
    label: "Team invitations", 
    desc: "Alerts when a teammate invites you to join their racing squad" 
  },
  { 
    kind: "team_verified", 
    label: "Team approved", 
    desc: "Notification when your team formation is verified for the race grid" 
  },
  { 
    kind: "team_rejected", 
    label: "Team not approved", 
    desc: "Alerts if team submission needs updates or additional drivers" 
  },
  { 
    kind: "application_verified", 
    label: "Course application approved", 
    desc: "Confirmation when your learning course or workshop registration is accepted" 
  },
  { 
    kind: "application_rejected", 
    label: "Course application rejected", 
    desc: "Alerts when a course application could not be approved" 
  },
  { 
    kind: "assessment_verified", 
    label: "Assessment reviewed", 
    desc: "Feedback and results when your test or practice module is graded" 
  },
  { 
    kind: "school_verified", 
    label: "School verified", 
    desc: "Institutional verification status and school onboarding alerts" 
  },
];

// Keyed per account -- a single global key let one browser's notification
// toggles leak between different accounts signed in on the same machine
// (account B would see account A's cached preferences until the server
// sync happened to overwrite each individual kind).
function localPrefsKey(userId: string) {
  return `hanbee_notification_preferences:${userId}`;
}

export default function SettingsPage() {
  const { theme, setTheme, accentHue, setAccentHue, accentLightness, setAccentLightness } = useTheme();
  const queryClient = useQueryClient();

  const { data: profile } = useSessionProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState<"" | "profile" | "password">("");
  const [email, setEmail] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [preferredTeam, setPreferredTeam] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // Local state for notification toggles with local storage persistence,
  // keyed per account (profile.id isn't known at mount, so this loads once
  // the session resolves rather than via a lazy initializer).
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (typeof window === "undefined" || !profile?.id) return;
    try {
      const stored = window.localStorage.getItem(localPrefsKey(profile.id));
      setLocalPrefs(stored ? JSON.parse(stored) : {});
    } catch {
      setLocalPrefs({});
    }
  }, [profile?.id]);

  const { data: extra } = useQuery({
    queryKey: ["account-extra", profile?.id],
    queryFn: () => authenticatedSupabaseFetch<{ student_id: string | null; preferred_team_name: string | null; is_solo: boolean | null }[]>(
      `/rest/v1/profiles?select=student_id,preferred_team_name,is_solo&id=eq.${profile?.id}`,
    ),
    enabled: Boolean(profile?.id) && profile?.role === "student",
  });
  const studentId = extra?.[0]?.student_id ?? null;
  const isIndependentStudent = extra?.[0]?.is_solo ?? false;

  useEffect(() => {
    if (extra?.[0]) setPreferredTeam(extra[0].preferred_team_name ?? "");
  }, [extra]);

  // Fetch notification preferences from server when available
  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs", profile?.id],
    queryFn: async () => {
      if (!profile?.id || profile.id.startsWith("dummy-")) {
        return Object.entries(localPrefs).map(([kind, enabled]) => ({ kind, enabled }));
      }
      try {
        return await authenticatedSupabaseFetch<{ kind: string; enabled: boolean }[]>(
          "/rest/v1/notification_preferences?select=kind,enabled"
        );
      } catch {
        return [];
      }
    },
    enabled: Boolean(profile?.id),
  });

  // Sync server preferences into local state
  useEffect(() => {
    if (prefs && prefs.length > 0) {
      setLocalPrefs((prev) => {
        const next = { ...prev };
        for (const p of prefs) {
          next[p.kind] = p.enabled;
        }
        return next;
      });
    }
  }, [prefs]);

  const enabledFor = (kind: string) => {
    if (typeof localPrefs[kind] === "boolean") {
      return localPrefs[kind];
    }
    const fromServer = prefs?.find((p) => p.kind === kind);
    return fromServer ? fromServer.enabled : true;
  };

  async function toggleNotification(kind: string, nextState: boolean) {
    // 1. Optimistic instant local update
    const updated = { ...localPrefs, [kind]: nextState };
    setLocalPrefs(updated);
    if (profile?.id) {
      try {
        window.localStorage.setItem(localPrefsKey(profile.id), JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
    }

    const targetItem = NOTIFICATION_KINDS.find((k) => k.kind === kind);
    const actionLabel = nextState ? "enabled" : "disabled";

    // 2. Persist to server if real session -- the UI must not claim success
    // when this fails, so revert the optimistic update and report it.
    if (profile?.id && !profile.id.startsWith("dummy-")) {
      try {
        await authenticatedSupabaseFetch("/rest/v1/notification_preferences?on_conflict=user_id,kind", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ user_id: profile.id, kind, enabled: nextState }),
        });
      } catch (reason) {
        console.error("Failed to sync notification preference:", reason);
        const reverted = { ...localPrefs };
        setLocalPrefs(reverted);
        try {
          window.localStorage.setItem(localPrefsKey(profile.id), JSON.stringify(reverted));
        } catch {
          // Ignore storage errors
        }
        setStatus({
          tone: "error",
          text: `Couldn't save "${targetItem?.label || "Notification"}" -- please try again.`,
        });
        return;
      }
    }

    // 3. User feedback -- only reached once the server call (if any) succeeded.
    setStatus({
      tone: "ok",
      text: `${targetItem?.label || "Notification"} ${actionLabel}.`
    });

    setTimeout(() => {
      setStatus((current) => current?.text.includes("Notification") || current?.text.includes("enabled") || current?.text.includes("disabled") ? null : current);
    }, 2400);
  }

  async function savePreferredTeam(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy("profile");
    setStatus(null);
    try {
      if (!profile.id.startsWith("dummy-")) {
        await authenticatedSupabaseFetch(`/rest/v1/profiles?id=eq.${profile.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ preferred_team_name: preferredTeam.trim() || null }),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["account-extra"] });
      setStatus({ tone: "ok", text: "Preferred team name saved." });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't save your team name." });
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy("profile");
    setStatus(null);
    try {
      await updateAccountProfile({
        id: profile.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        age: age ? parseInt(age, 10) || null : null,
      });
      await queryClient.invalidateQueries({ queryKey: sessionProfileKey });
      await queryClient.invalidateQueries({ queryKey: ["account-profile"] });
      setStatus({ tone: "ok", text: "Profile details updated successfully." });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't save your profile." });
    } finally {
      setBusy("");
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    try {
      setUploadingAvatar(true);
      const dataUrl = await processProfileImage(file);
      await updateAccountProfile({
        id: profile.id,
        avatar_url: dataUrl,
      });
      await queryClient.invalidateQueries({ queryKey: sessionProfileKey });
      await queryClient.invalidateQueries({ queryKey: ["account-profile"] });
      setStatus({ tone: "ok", text: "Profile picture updated successfully!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo";
      setStatus({ tone: "error", text: msg });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.id) return;
    try {
      setUploadingAvatar(true);
      await updateAccountProfile({
        id: profile.id,
        avatar_url: null,
      });
      await queryClient.invalidateQueries({ queryKey: sessionProfileKey });
      await queryClient.invalidateQueries({ queryKey: ["account-profile"] });
      setStatus({ tone: "ok", text: "Profile picture removed." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove photo";
      setStatus({ tone: "error", text: msg });
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      setStatus({ tone: "ok", text: "Password changed successfully." });
    } catch (reason) {
      setStatus({ tone: "error", text: reason instanceof Error ? reason.message : "We couldn't change your password." });
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    setEmail(profile?.email ?? "");
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAge(profile.age ? String(profile.age) : "");
    }
  }, [profile]);

  function startEmailEdit() {
    setEmailDraft(email);
    setEmailError("");
    setEditingEmail(true);
  }

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    setSavingEmail(true);
    setEmailError("");
    try {
      const result = await updateMyEmail(emailDraft);
      setEmail(result.email);
      setEditingEmail(false);
    } catch (reason) {
      setEmailError(reason instanceof Error ? reason.message : "We couldn't update your email.");
    } finally {
      setSavingEmail(false);
    }
  }

  const initial = (profile?.full_name ?? "H").charAt(0).toUpperCase();

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage your account, team details, and notification preferences</p>
      </div>

      {status && (
        <div 
          className={status.tone === "error" ? styles.statusAlertError : styles.statusAlertOk} 
          role={status.tone === "error" ? "alert" : "status"}
        >
          {status.tone === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{status.text}</span>
        </div>
      )}

      <div className={styles.settingsLayout}>
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Profile Settings</h2>

          {/* Profile Picture Upload Section */}
          <div className={styles.avatarUploadContainer}>
            <div className={styles.avatarPreviewBox}>
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Profile" className={styles.avatarImgLg} />
              ) : (
                <div className={styles.avatarLg}>{initial}</div>
              )}
            </div>

            <div className={styles.avatarActionsCol}>
              <div className={styles.avatarActionBtns}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className={styles.uploadAvatarBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <Camera size={14} />
                  <span>{uploadingAvatar ? "Processing..." : profile?.avatar_url ? "Change Photo" : "Upload Photo"}</span>
                </button>

                {profile?.avatar_url && (
                  <button
                    type="button"
                    className={styles.removeAvatarBtn}
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <span className={styles.avatarHelpText}>Visible on your Student Driver License and leaderboard.</span>
            </div>
          </div>

          <div className={styles.profileDivider} />

          {/* Account Email Display/Edit */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Account Email</label>
            {editingEmail ? (
              <form onSubmit={saveEmail} className={styles.emailEditForm} noValidate>
                <input
                  type="email"
                  className={styles.input}
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  autoComplete="email"
                  aria-label="Email address"
                />
                {emailError && <p role="alert" style={{ color: "#ef4444", fontSize: 12 }}>{emailError}</p>}
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button type="submit" className={styles.saveBtn} disabled={savingEmail}>
                    {savingEmail ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    disabled={savingEmail}
                    onClick={() => setEditingEmail(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-main)" }}>{email || "No email set"}</p>
                <button type="button" className={styles.saveBtn} onClick={startEmailEdit} style={{ padding: "6px 12px", fontSize: "12px" }}>
                  {email ? "Edit" : "Add email"}
                </button>
              </div>
            )}
          </div>

          {/* Form for Name, Age, Phone */}
          <form onSubmit={saveProfile}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="full-name">Full Name</label>
              <input
                id="full-name"
                type="text"
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
                placeholder="Your full name"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="student-age">Age</label>
                <input
                  id="student-age"
                  type="number"
                  min="5"
                  max="99"
                  className={styles.input}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 16"
                />
              </div>

              <div className={styles.formGroup} style={{ flex: 1.5 }}>
                <label className={styles.label} htmlFor="student-phone">Phone Number</label>
                <input
                  id="student-phone"
                  type="tel"
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>

            <button type="submit" className={styles.saveBtn} disabled={busy !== ""}>
              <Check size={16} />
              <span>{busy === "profile" ? "Saving..." : "Save Changes"}</span>
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
              <Lock size={16} />
              <span>{busy === "password" ? "Changing..." : "Change Password"}</span>
            </button>
          </form>
        </section>

        {profile?.role === "student" && (
          <section className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Student Details</h2>
            {!isIndependentStudent && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="student-id">Student ID</label>
                <input id="student-id" type="text" className={styles.input} value={studentId ?? "Not set yet. Your school adds it."} readOnly />
              </div>
            )}
            <form onSubmit={savePreferredTeam}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="preferred-team">Preferred Team Name</label>
                <input id="preferred-team" type="text" className={styles.input} value={preferredTeam} onChange={(e) => setPreferredTeam(e.target.value)} maxLength={60} />
              </div>
              <button type="submit" className={styles.saveBtn} disabled={busy !== ""}>
                <Save size={16} />
                <span>{busy === "profile" ? "Saving..." : "Save Team Name"}</span>
              </button>
            </form>
          </section>
        )}

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeaderWrap}>
            <h2 className={styles.sectionTitle}>Notifications</h2>
            <span className={styles.sectionBadge}>Alert Preferences</span>
          </div>
          <p className={styles.sectionSubtitle}>
            Configure which alerts you want to receive for team invites, tournament approvals, and course updates.
          </p>

          <div className={styles.notificationList}>
            {NOTIFICATION_KINDS.map(({ kind, label, desc }) => {
              const isEnabled = enabledFor(kind);
              return (
                <div 
                  key={kind} 
                  className={styles.notificationItem}
                  onClick={() => void toggleNotification(kind, !isEnabled)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void toggleNotification(kind, !isEnabled);
                    }
                  }}
                >
                  <div className={styles.notificationInfo}>
                    <span className={styles.notificationLabel}>{label}</span>
                    <span className={styles.notificationDesc}>{desc}</span>
                  </div>

                  <div 
                    className={`${styles.switchToggle} ${isEnabled ? styles.switchToggleActive : ""}`}
                    aria-checked={isEnabled}
                    role="switch"
                  >
                    <div className={`${styles.switchKnob} ${isEnabled ? styles.switchKnobActive : ""}`} />
                  </div>
                </div>
              );
            })}
          </div>
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
