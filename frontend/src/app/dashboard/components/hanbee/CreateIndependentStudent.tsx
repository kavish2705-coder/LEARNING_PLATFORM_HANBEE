"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, RefreshCw, MessageCircle } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input } from "../ui/FormField";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import {
  createIndependentInvite,
  listIndependentStudentInvites,
  revokeIndependentInvite,
  fetchIndependentStudentLeads,
  dismissIndependentStudentLead,
  markIndependentStudentLeadConverted,
  type IndependentInvite,
  type IndependentInviteRow,
  type IndependentStudentLead,
} from "../../../../lib/poolApi";

function buildSignupLink(invite: IndependentInvite): string {
  const params = new URLSearchParams({ invite_token: invite.token, email: invite.email, full_name: invite.full_name });
  return `${window.location.origin}/signup?${params.toString()}`;
}

// Free tier, no paid email provider yet, small student count -- a manual
// WhatsApp tap is the right scope for now (see docs/PENDING_TASKS.md for
// what changes once a domain + paid email exist).
function buildWhatsAppShareLink(phone: string, studentName: string, signupLink: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  const message = `Hi ${studentName}! You've been approved to join Hanbee RC Cup as an independent student.\n\nTap this link to create your account:\n${signupLink}`;
  return `https://wa.me/${digits.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;
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
  const [leads, setLeads] = useState<IndependentStudentLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  // Carried from a lead into the invite form so the WhatsApp share button
  // on the result (and the lead's converted-status update) has somewhere
  // to go once the invite is created.
  const [activeLead, setActiveLead] = useState<IndependentStudentLead | null>(null);

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

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      setLeads(await fetchIndependentStudentLeads());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load independent student applications.");
    } finally {
      setLoadingLeads(false);
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
      await Promise.all([loadInvites(), loadLeads()]);
    } catch (reason) {
      setAllowed(false);
      setError(reason instanceof Error ? reason.message : "We couldn't verify your access.");
    } finally {
      setChecking(false);
    }
  }, [loadInvites, loadLeads]);

  useEffect(() => { void checkAccess(); }, [checkAccess]);

  function startFromLead(lead: IndependentStudentLead) {
    setActiveLead(lead);
    setFullName(lead.full_name);
    setEmail(lead.email);
    setNotice("");
    setError("");
  }

  async function dismissLead(leadId: string) {
    setError("");
    try {
      await dismissIndependentStudentLead(leadId);
      if (activeLead?.id === leadId) setActiveLead(null);
      await loadLeads();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't dismiss this application.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const created = await createIndependentInvite(fullName, email, activeLead?.phone, activeLead?.location);
      setInvite(created);
      setNotice(`Invite created for ${fullName.trim()}.`);
      setFullName("");
      setEmail("");
      if (activeLead) {
        // Best-effort: the invite already exists even if this fails, so a
        // failure here shouldn't be reported as the invite itself failing.
        await markIndependentStudentLeadConverted(activeLead.id).catch(() => {});
      }
      await Promise.all([loadInvites(), loadLeads()]);
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
            {activeLead?.phone && buildWhatsAppShareLink(activeLead.phone, invite.full_name, buildSignupLink(invite)) && (
              <a
                className={styles.filterBtn}
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                href={buildWhatsAppShareLink(activeLead.phone, invite.full_name, buildSignupLink(invite))!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={14} /> Send via WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      {leads.length > 0 && (
        <section className={styles.sectionCard} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div><h2 className={styles.sectionTitle}>Pending applications</h2><p style={{ color: "var(--text-muted)", marginTop: 5 }}>Submitted from the landing page. Review and create a real invite, or dismiss.</p></div>
            <button type="button" className={styles.filterBtn} onClick={() => void loadLeads()} disabled={loadingLeads}><RefreshCw size={14} /> Refresh</button>
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {leads.map((lead) => (
              <div key={lead.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
                <div>
                  <strong>{lead.full_name}</strong>
                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {lead.email} · {lead.phone || "no phone"} · {lead.location || "no location"} · Applied {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                  {lead.message && <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>&ldquo;{lead.message}&rdquo;</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className={styles.filterBtn} onClick={() => startFromLead(lead)}>Create invite</button>
                  <button type="button" className={styles.filterBtn} onClick={() => void dismissLead(lead.id)}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label>
            Full name
            <Input
              value={fullName}
              onChange={(event) => { setFullName(event.target.value); setActiveLead(null); }}
              required
              maxLength={180}
            />
          </label>
          <label>
            Email
            <Input
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setActiveLead(null); }}
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
