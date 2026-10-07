"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../login/login.module.css";
import { updatePassword } from "../../lib/supabaseAuth";

function ResetPasswordContent() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("access_token");
    const type = params.get("type");
    if (!token || type !== "recovery") {
      setTokenError("This reset link is invalid or has expired. Request a new one from the login page.");
      return;
    }
    setAccessToken(token);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accessToken) return;
    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(accessToken, newPassword);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't reset your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.glassCard}>
        <h1 className={styles.welcomeTitle}>Set a new password.</h1>
        <p className={styles.welcomeSub}>Choose a new password for your account.</p>

        {tokenError && (
          <>
            <p role="alert" style={{ color: "var(--color-danger)", marginBottom: 16 }}>{tokenError}</p>
            <p style={{ textAlign: "center" }}>
              <Link href="/login" style={{ color: "rgba(255,255,255,0.8)" }}>Back to sign in</Link>
            </p>
          </>
        )}

        {!tokenError && done && (
          <p style={{ textAlign: "center", marginTop: 16 }}>Your password has been changed. Redirecting to sign in…</p>
        )}

        {!tokenError && !done && accessToken && (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <input
                type="password"
                autoComplete="new-password"
                className={styles.input}
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                autoFocus
                required
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="password"
                autoComplete="new-password"
                className={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            {error && <p role="alert" style={{ color: "var(--color-danger)", marginBottom: 10 }}>{error}</p>}
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Saving…" : "Save new password →"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
