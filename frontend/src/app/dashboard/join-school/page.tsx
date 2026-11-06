"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link2, CheckCircle2 } from "lucide-react";
import styles from "../dashboard.module.css";
import { Input } from "../components/ui/FormField";
import { joinSchool } from "../../../lib/teamFormationApi";

export default function JoinSchoolPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => setToken(new URLSearchParams(window.location.search).get("join_token") ?? ""), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await joinSchool(token);
      setMessage(`You're now connected to ${result.school}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't join this school.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Join your school</h1>
        <p className={styles.pageSubtitle}>Connect your existing student account to your school's invitation.</p>
      </div>

      <form className={styles.sectionCard} onSubmit={submit} style={{ maxWidth: 520 }}>
        <div className={styles.sectionHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link2 size={18} color="var(--accent-subtle-text)" />
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>School join link</h2>
          </div>
        </div>

        <label htmlFor="school-join-token" style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
          Paste the link your school sent, or enter the code directly
        </label>
        <Input
          id="school-join-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          maxLength={256}
          autoComplete="off"
          placeholder="Join code"
        />
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 10 }}>
          Use the email address your school invited — the link only works for that exact address.
        </p>

        {error && <p role="alert" style={{ color: "var(--color-danger)", marginTop: 12 }}>{error}</p>}
        {message && (
          <p role="status" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-success)", marginTop: 12 }}>
            <CheckCircle2 size={16} /> {message}
          </p>
        )}

        <button className={styles.primaryBtn} type="submit" disabled={busy || !token.trim()} style={{ marginTop: 18 }}>
          {busy ? "Joining…" : "Join school"}
        </button>
      </form>
    </div>
  );
}
