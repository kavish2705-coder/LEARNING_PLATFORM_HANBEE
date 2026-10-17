"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TurnstileWidget from "@/components/Turnstile";
import { fetchPublishedCourseTitles, submitApplication } from "@/lib/applicationApi";
import styles from "./apply.module.css";

export default function ApplyPage() {
  const [courseTitles, setCourseTitles] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchPublishedCourseTitles().then(setCourseTitles);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !courseTitle.trim()) {
      setError("Full name, email, and a course are required.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the CAPTCHA before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await submitApplication({ fullName, email, phone, courseTitle, message, turnstileToken });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>HANBEE</Link>
        <Link href="/login" className={styles.signInLink}>Already have an account? Sign in</Link>
      </header>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {submitted ? (
          <div className={styles.successState}>
            <h1 className={styles.title}>Thanks — we&apos;ve got it.</h1>
            <p className={styles.subtitle}>
              A Hanbee team member will reach out to {email} about {courseTitle} soon. No account needed yet.
            </p>
            <Link href="/" className={styles.submitBtn} style={{ display: "inline-flex", textDecoration: "none" }}>
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <span className={styles.eyebrow}>No account needed</span>
            <h1 className={styles.title}>Ask us about a course</h1>
            <p className={styles.subtitle}>
              Leave your details and which course you&apos;re interested in — a Hanbee team member will follow up by email or phone.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.field}>
                <span>Full name</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Student" required maxLength={500} />
              </label>

              <label className={styles.field}>
                <span>Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required maxLength={500} />
              </label>

              <label className={styles.field}>
                <span>Phone (optional)</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" maxLength={500} />
              </label>

              <label className={styles.field}>
                <span>Course you&apos;re interested in</span>
                {courseTitles.length > 0 ? (
                  <select value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required>
                    <option value="" disabled>Select a course</option>
                    {courseTitles.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                    <option value="General Inquiry">General inquiry</option>
                  </select>
                ) : (
                  <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Flight controller fundamentals" required maxLength={500} />
                )}
              </label>

              <label className={styles.field}>
                <span>Message (optional)</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything else we should know?" maxLength={500} rows={4} />
              </label>

              <div className={styles.turnstileWrap}>
                <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </main>
  );
}
