"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { Input } from "../ui/FormField";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { createIndependentInvite } from "../../../../lib/poolApi";

export default function CreateIndependentStudent() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const checkAccess = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const profile = await getAccountProfile();
      if (profile.role !== "staff" && profile.role !== "manager") {
        throw new Error("Only Hanbee staff and managers can create independent student accounts.");
      }
      setAllowed(true);
    } catch (reason) {
      setAllowed(false);
      setError(reason instanceof Error ? reason.message : "We couldn't verify your access.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void checkAccess(); }, [checkAccess]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await createIndependentInvite(fullName, email);
      setNotice(`Invite created for ${fullName.trim()}.`);
      setFullName("");
      setEmail("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't create this account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <p role="status" className={styles.sectionCard}>Checking access…</p>;
  }

  if (!allowed) {
    return (
      <section style={{ marginTop: 28 }}>
        <p role="alert">{error || "You don't have access to this screen."}</p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 28 }}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Create independent student</h2>
        <p className={styles.pageSubtitle}>Invite a student who has no school affiliation to join the independent pool.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label>
            Full name
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              maxLength={180}
            />
          </label>
          <label>
            Email
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={320}
            />
          </label>
        </div>
        <button type="submit" className={styles.filterBtn} style={{ marginTop: 16 }} disabled={submitting}>
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </section>
  );
}
