"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./login.module.css";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRole, Role } from "../RoleContext";
import { AUTH_SESSION_KEY, signInWithPassword, signUpWithPassword, signInWithProvider, requestPasswordReset, type SupabaseSession, type HanbeeRole } from "../../lib/supabaseAuth";

function LoginContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const [activeRole, setActiveRole] = useState(() => {
    const role = searchParams.get("role");
    return role === "School" || role === "Staff" || role === "Manager" || role === "Student" ? role : "Student";
  });

  useEffect(() => {
    if (searchParams.get("mode") === "signup" && (activeRole === "School" || activeRole === "Staff")) {
      setIsLogin(false);
    }
    // Only run this once, on mount - switching roles afterward is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeRole !== "School" && activeRole !== "Staff" && activeRole !== "Manager") setIsLogin(true);
  }, [activeRole]);
  
  const { setRole } = useRole();
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") || queryParams.get("error_description") || params.get("error") || queryParams.get("error");
    if (oauthError) {
      setAuthError(
        /invitation only|not active|has not been invited/i.test(oauthError)
          ? "Sign-in with Google/GitHub only works for an existing Hanbee account. New accounts need an invite from your school or Hanbee staff."
          : decodeURIComponent(oauthError),
      );
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;
    fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.json())
      .then((user) => {
        window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "bearer",
          user,
          expires_at: Math.floor(Date.now() / 1000) + Number(params.get("expires_in") ?? 3600),
        }));
        window.history.replaceState(null, "", window.location.pathname);
        router.replace("/dashboard");
      })
      .catch(() => setAuthError("We couldn't finish signing you in. Please try again."));
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const finishLogin = (role: HanbeeRole) => {
    const target: Record<string, string> = {
      student: "/dashboard",
      school_staff: "/dashboard/school/overview",
      staff: "/dashboard/hanbee/my-space",
      manager: "/dashboard/manager/monitor",
    };
    const internalRole: Role = role === "school_staff" ? "school_staff" : role === "manager" ? "manager" : role === "staff" ? "teacher" : "student";
    setRole(internalRole);
    router.push(target[role] ?? "/dashboard");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    // DEVELOPER BYPASS: Allows frontend testing without a backend database.
    // Dev-only — process.env.NODE_ENV is inlined and dead-code-eliminated by
    // Next.js at build time, so this entire block (and the fake session it
    // creates) is stripped from the production bundle, not just hidden.
    if (process.env.NODE_ENV === "development" && password === "password" && isLogin) {
      const e = email.trim().toLowerCase();
      let dummyRole: HanbeeRole | null = null;
      if (e === "student@hanbee.in" || e === "student" || e === "ava@student.edu" || activeRole === "Student") dummyRole = "student";
      else if (e === "staff@hanbee.in" || e === "staff") dummyRole = "staff";
      else if (e === "manager@hanbee.in" || e === "manager") dummyRole = "manager";
      else if (e === "school@hanbee.in" || e === "school") dummyRole = "school_staff";

      if (dummyRole) {
        const fakeSession = {
          access_token: "dummy-token",
          refresh_token: "dummy-refresh",
          token_type: "bearer",
          user: { id: `dummy-${dummyRole}`, email: e, role: "authenticated", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(fakeSession));
        
        // Mock the profile API response for useSessionProfile hook
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          if (args[0] && typeof args[0] === 'string' && args[0].includes('/rest/v1/profiles')) {
            return new Response(JSON.stringify([{ role: dummyRole, approved: true, account_status: "active" }]), { status: 200 });
          }
          return originalFetch(...args);
        };

        finishLogin(dummyRole);
        setSubmitting(false);
        return;
      }
    }

    try {
      if (!isLogin) {
        const role = activeRole === "School" ? "school_staff" : activeRole === "Manager" ? "manager" : "staff";
        await signUpWithPassword({
          fullName,
          email: email.trim(),
          password,
          role,
          ...(role === "school_staff"
            ? { schoolName, guardianConsent }
            : {}),
        });
        setSignupDone(true);
        return;
      }

      const loginIdentifier = email.trim();
      let result;
      try {
        result = await signInWithPassword(loginIdentifier, password);
      } catch (initialErr) {
        if (!loginIdentifier.includes("@") && activeRole === "Student") {
          result = await signInWithPassword(`${loginIdentifier.toLowerCase()}@student.hanbee.in`, password);
        } else {
          throw initialErr;
        }
      }
      window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(result.session));
      finishLogin(result.role);
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : isLogin ? "We couldn't sign you in. Please try again." : "We couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      await requestPasswordReset(forgotEmail.trim());
      setForgotSent(true);
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : "We couldn't send the reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPrimaryPlaceholder = () => {
    if (activeRole === "Staff") return "Email / Staff ID";
    if (activeRole === "Manager") return "Email / Manager ID";
    if (activeRole === "School") return "Email / School Admin ID";
    return "Username / Email / Student ID";
  };

  return (
    <>
      <motion.div 
        className={styles.glassCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 0.9] }}
      >
        <h1 className={styles.welcomeTitle}>
          {forgotMode ? "Reset your password." : isLogin ? "Welcome back." : "Create an account."}
        </h1>
        <p className={styles.welcomeSub}>
          {forgotMode
            ? forgotSent
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a reset link."
            : isLogin
              ? "Access your race and learning workspace."
              : "Join the next generation of autonomous racing."}
        </p>

        {forgotMode && (
          <>
            {forgotSent ? (
              <p style={{ textAlign: "center", marginTop: "16px" }}>
                If an account exists for <strong>{forgotEmail}</strong>, a reset link is on its way.
              </p>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className={styles.formGroup}>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    autoFocus
                    required
                  />
                </div>
                {authError && <p role="alert" style={{ color: "var(--color-danger)", marginBottom: 10 }}>{authError}</p>}
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? "Sending…" : "Send reset link →"}
                </button>
              </form>
            )}
            <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px" }}>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); setAuthError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", textDecoration: "underline" }}
              >
                Back to sign in
              </button>
            </p>
          </>
        )}


        {!forgotMode && <>
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabBtn} ${isLogin ? styles.tabBtnActive : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          {(activeRole === "School" || activeRole === "Staff" || activeRole === "Manager") && (
            <button
              className={`${styles.tabBtn} ${!isLogin ? styles.tabBtnActive : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Create Account
            </button>
          )}

        </div>

        <span className={styles.sectionLabel}>SELECT ROLE</span>
        <div className={styles.roleSegment}>
          {["Student", "School", "Staff", "Manager"].map(role => (
            <button 
              key={role}
              className={`${styles.roleBtn} ${activeRole === role ? styles.roleBtnActive : ''}`}
              onClick={() => setActiveRole(role)}
            >
              {role}
            </button>
          ))}
        </div>

        {!isLogin && signupDone ? (
          <p style={{ textAlign: "center", marginTop: "16px" }}>
            Your account was created.{" "}
            {activeRole === "School"
              ? "A manager or Hanbee staff member will verify your school before you can sign in."
              : activeRole === "Manager"
              ? "You can sign in now."
              : "A manager or Hanbee staff member will approve your account before you can sign in."}
          </p>
        ) : (
        <form onSubmit={handleAuthSubmit}>

          {!isLogin && (
            <div className={styles.formGroup}>
              <input
                type="text"
                className={styles.input}
                placeholder="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <input
              type={isLogin ? "text" : "email"}
              className={styles.input}
              placeholder={getPrimaryPlaceholder()}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={styles.input}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className={styles.inputIcon}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              )}
            </button>
          </div>

          {!isLogin && activeRole === "School" && (
            <>
              <div className={styles.formGroup}>
                <input type="text" className={styles.input} placeholder="School Name" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required />
              </div>
              <div className={styles.formOptions}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} required />
                  I confirm the school has guardian consent to enrol students
                </label>
              </div>
            </>
          )}

          {isLogin && (
            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" defaultChecked />
                Remember this device
              </label>
              <button type="button" className={styles.forgotLink} onClick={() => { setForgotMode(true); setForgotEmail(email); setAuthError(""); }} style={{ background: "none", border: "none", cursor: "pointer" }}>Forgot Password?</button>
            </div>
          )}

          {authError && <p role="alert" style={{ color: "var(--color-danger)", marginBottom: 10 }}>{authError}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Launch Workspace →" : "Create Account →"}
          </button>
        </form>
        )}

        {isLogin && (
          <>
            <div className={styles.divider}>or continue with</div>

            <div className={styles.socialGroup}>
              <button type="button" className={styles.socialBtn} onClick={() => signInWithProvider("google")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                </svg>
                Google
              </button>
              <button type="button" className={styles.socialBtn} onClick={() => signInWithProvider("github")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.3 6-1.5 6-6.76a5.2 5.2 0 0 0-1.5-3.8 5.2 5.2 0 0 0-.15-3.8s-1.2-.38-3.9 1.45a13.3 13.3 0 0 0-7 0c-2.7-1.83-3.9-1.45-3.9-1.45a5.2 5.2 0 0 0-.15 3.8 5.2 5.2 0 0 0-1.5 3.8c0 5.26 3 6.46 6 6.76a4.8 4.8 0 0 0-1 3.24v4"/><path d="M9 18c-3.8 1-5-2-5-2"/></svg>
                GitHub
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>
            ← Back to Home
          </Link>
        </p>
        </>}

      </motion.div>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
