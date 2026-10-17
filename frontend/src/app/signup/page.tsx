"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import styles from "./signup.module.css";
import {
  signUpWithPassword,
  signInWithProvider,
  writeStoredSession,
  toSupabaseSession,
} from "../../lib/supabaseAuth";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteToken = searchParams.get("invite_token") || undefined;
  const joinToken = searchParams.get("join_token") || undefined;
  // An invite/join token binds a specific email; the server's role for this
  // signup comes from that invitation row, not from anything chosen here
  // (see handle_new_user: inv.role always wins over requested_role once a
  // token is present). With neither token, this is a brand-new school
  // self-registering, which is a school_staff signup needing the extra
  // fields below.
  const invited = Boolean(inviteToken || joinToken);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const emailLocked = invited && Boolean(searchParams.get("email"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signUpWithPassword({
        fullName,
        email: email.trim(),
        password,
        role: invited ? "student" : "school_staff",
        inviteToken,
        joinToken,
        ...(invited ? {} : { schoolName, guardianConsent }),
      });
      // Migration 0045 auto-confirms new signups, so this is a real,
      // usable session immediately -- store it and let AuthGate route to
      // the right home. A school self-registration lands unapproved;
      // AuthGate already clears the session and shows the "waiting for
      // approval" message for that case, so nothing extra is needed here.
      writeStoredSession(toSupabaseSession(result));
      router.push("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] }}
    >
      <h1 className={styles.logo}>HANBEE</h1>
      <p className={styles.subtitle}>Create your learning space</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Alex Mitchell"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Email Address</label>
          <input
            type="email"
            className={styles.input}
            style={emailLocked ? { opacity: 0.48, cursor: "not-allowed" } : undefined}
            placeholder="hello@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={emailLocked}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Confirm Password</label>
          <input
            type="password"
            autoComplete="new-password"
            className={styles.input}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>

        {!invited && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>School Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Brookfield Academy"
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>
                <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} required />
                I confirm the school has guardian consent to enrol students
              </label>
            </div>
          </>
        )}

        {error && <p role="alert" style={{ color: "var(--color-danger)", marginBottom: 10 }}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <button type="button" className={styles.googleBtn} onClick={() => signInWithProvider("google")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </button>

      <p style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#fff", textDecoration: "none", fontWeight: 500 }}>
          Sign In
        </Link>
      </p>
    </motion.div>
  );
}

export default function SignupPage() {
  return (
    <main className={styles.container}>
      <div className={styles.bgImage} />
      <Suspense fallback={<div className={styles.card} />}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
