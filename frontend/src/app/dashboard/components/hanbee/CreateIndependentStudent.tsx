"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input } from "../ui/FormField";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { createIndependentInvite, listIndependentStudentInvites, revokeIndependentInvite, type IndependentInvite, type IndependentInviteRow } from "../../../../lib/poolApi";

function buildSignupLink(invite: IndependentInvite): string {
  const params = new URLSearchParams({ invite_token: invite.token, email: invite.email, full_name: invite.full_name });
  return `${window.location.origin}/signup?${params.toString()}`;
}

export default function CreateIndependentStudent() {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invite, setInvite] = useState<IndependentInvite | null>(null);
  const [invites, setInvites] = useState<IndependentInviteRow[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [copyState, setCopyState] = useState("");

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      setInvites(await listIndependentStudentInvites());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load independent student invites.");
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  const checkAccess = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const profile = await getAccountProfile();
      if (profile.role !== "staff" && profile.role !== "manager") {
        throw new Error("Only Hanbee staff and managers can create independent student accounts.");
      }
      setAllowed(true);
      await loadInvites();
    } catch (reason) {
      setAllowed(false);
      setError(reason instanceof Error ? reason.message : "We couldn't verify your access.");
    } finally {
      setChecking(false);
    }
  }, [loadInvites]);

  useEffect(() => { void checkAccess(); }, [checkAccess]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const created = await createIndependentInvite(fullName, email);
      setInvite(created);
      setNotice(`Invite created for ${fullName.trim()}.`);
      setFullName("");
      setEmail("");
      await loadInvites();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't create this account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(invitationId: string) {
    setError("");
    try {
      await revokeIndependentInvite(invitationId);
      await loadInvites();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't revoke this invite.");
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
      {invite && typeof window !== "undefined" && (
        <div className={styles.sectionCard} style={{ marginBottom: 20 }}>
          <strong>Signup link ready</strong>
          <p style={{ color: "var(--text-muted)", margin: "8px 0 12px" }}>Share this link with {invite.full_name}. It expires {new Date(invite.expires_at).toLocaleDateString()}.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input readOnly value={buildSignupLink(invite)} aria-label="Independent student signup link" style={{ flex: "1 1 360px" }} />
            <button type="button" className={styles.filterBtn} onClick={() => { void navigator.clipboard?.writeText(buildSignupLink(invite)); setCopyState("Copied"); window.setTimeout(() => setCopyState(""), 1800); }}><Copy size={14} /> {copyState || "Copy link"}</button>
          </div>
        </div>
      )}
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
      <section className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><h2 className={styles.sectionTitle}>Independent student invites</h2><p style={{ color: "var(--text-muted)", marginTop: 5 }}>Track pending, accepted, expired, and revoked invitations.</p></div>
          <button type="button" className={styles.filterBtn} onClick={() => void loadInvites()} disabled={loadingInvites}><RefreshCw size={14} /> Refresh</button>
        </div>
        {loadingInvites && <p role="status" style={{ marginTop: 14 }}>Loading invites…</p>}
        {!loadingInvites && invites.length === 0 && <p style={{ color: "var(--text-muted)", marginTop: 14 }}>No independent invites yet.</p>}
        {!loadingInvites && invites.length > 0 && <div style={{ overflowX: "auto", marginTop: 14 }}><table className={styles.dataTable}><thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Expires</th><th /></tr></thead><tbody>{invites.map((row) => <tr key={row.invitation_id}><td>{row.full_name}</td><td>{row.email}</td><td>{row.status}</td><td>{new Date(row.expires_at).toLocaleDateString()}</td><td>{row.status === "pending" && <button type="button" className={styles.filterBtn} onClick={() => void revoke(row.invitation_id)}>Revoke</button>}</td></tr>)}</tbody></table></div>}
      </section>
    </section>
  );
}
