"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";

type StaffApplication = { id: string; full_name: string; email: string; role: "staff"; created_at: string; approved?: boolean; account_status?: string };
type SchoolApplication = { id: string; name: string; registration_no: string; official_email: string; created_by: string; created_at: string; status?: string };

async function rpc(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<unknown>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export default function ManagerVerificationsPage() {
  const [staff, setStaff] = useState<StaffApplication[]>([]);
  const [schools, setSchools] = useState<SchoolApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "verified" | "all">("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isManager, setIsManager] = useState(false);

  const loadQueue = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "manager") throw new Error("Only a Hanbee manager can review applications.");
    setIsManager(true);
    const [staffRows, schoolRows] = await Promise.all([
      authenticatedSupabaseFetch<StaffApplication[]>("/rest/v1/profiles?select=id,full_name,email,role,created_at,approved,account_status&role=eq.staff&order=created_at.desc"),
      authenticatedSupabaseFetch<SchoolApplication[]>("/rest/v1/organizations?select=id,name,registration_no,official_email,created_by,created_at,status&order=created_at.desc"),
    ]);
    setStaff(staffRows || []);
    setSchools(schoolRows || []);
  }, []);

  useEffect(() => {
    let active = true;
    loadQueue().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the review queue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadQueue]);

  async function reviewStaff(application: StaffApplication, approve: boolean) {
    setBusyId(application.id);
    setError("");
    setMessage("");
    try {
      if (approve) {
        await authenticatedSupabaseFetch<unknown>(`/rest/v1/profiles?id=eq.${encodeURIComponent(application.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ approved: true }),
        });
      } else {
        await rpc("set_account_status", { p_user: application.id, p_status: "suspended", p_reason: "Staff application declined" });
      }
      setMessage(approve ? `${application.full_name} was approved.` : `${application.full_name}'s application was declined.`);
      await loadQueue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this application.");
    } finally {
      setBusyId("");
    }
  }

  async function reviewSchool(application: SchoolApplication, approve: boolean) {
    setBusyId(application.id);
    setError("");
    setMessage("");
    try {
      await rpc(approve ? "verify_school" : "reject_school", { p_org: application.id });
      setMessage(approve ? `${application.name} was approved.` : `${application.name}'s registration was declined.`);
      await loadQueue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this school registration.");
    } finally {
      setBusyId("");
    }
  }

  const query = search.toLowerCase().trim();

  const filteredStaff = staff.filter((s) => {
    const matchesSearch = !query || s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    if (statusFilter === "pending") return !s.approved && s.account_status !== "suspended";
    if (statusFilter === "verified") return Boolean(s.approved) && s.account_status === "active";
    return true;
  });

  const filteredSchools = schools.filter((sc) => {
    const matchesSearch = !query || sc.name.toLowerCase().includes(query) || sc.official_email.toLowerCase().includes(query) || sc.registration_no.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    if (statusFilter === "pending") return sc.status === "pending";
    if (statusFilter === "verified") return sc.status === "verified" || sc.status === "active";
    return true;
  });

  const pendingCount = staff.filter(s => !s.approved && s.account_status !== "suspended").length + schools.filter(sc => sc.status === "pending").length;
  const verifiedCount = staff.filter(s => Boolean(s.approved)).length + schools.filter(sc => sc.status === "verified" || sc.status === "active").length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Application Reviews</h1>
        <p className={styles.pageSubtitle}>Approve Hanbee staff and verify new school registrations</p>
      </div>
      {error && <p role="alert" className={styles.sectionCard} style={{ marginBottom: 16 }}>{error}</p>}
      {message && <p role="status" className={styles.sectionCard} style={{ marginBottom: 16 }}>{message}</p>}
      {!isManager && !loading ? <div className={styles.sectionCard}>This review queue is available to Hanbee managers.</div> : null}
      
      {isManager && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff or schools…"
            aria-label="Search reviews"
            style={{
              maxWidth: 300,
              flex: "1 1 200px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "14px",
            }}
          />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                border: statusFilter === "pending" ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                background: statusFilter === "pending" ? "var(--accent-subtle-bg)" : "var(--bg-card)",
                color: statusFilter === "pending" ? "var(--color-primary)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Pending Review ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("verified")}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                border: statusFilter === "verified" ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                background: statusFilter === "verified" ? "var(--accent-subtle-bg)" : "var(--bg-card)",
                color: statusFilter === "verified" ? "var(--color-primary)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Verified & Active ({verifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                border: statusFilter === "all" ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                background: statusFilter === "all" ? "var(--accent-subtle-bg)" : "var(--bg-card)",
                color: statusFilter === "all" ? "var(--color-primary)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              All Records ({staff.length + schools.length})
            </button>
          </div>
        </div>
      )}

      {loading ? <p role="status" className={styles.sectionCard}>Loading applications…</p> : isManager && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.tableTitle}>
                Hanbee staff applications ({filteredStaff.length})
              </h2>
            </div>
            {filteredStaff.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>
                {search ? "No staff match your search." : `No ${statusFilter === "pending" ? "pending" : statusFilter === "verified" ? "verified" : ""} staff records found.`}
              </p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr><th>Applicant</th><th>Email</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((application) => {
                      const isApproved = Boolean(application.approved);
                      return (
                        <tr key={application.id}>
                          <td style={{ color: "var(--text-main)", fontWeight: "500" }}>{application.full_name}</td>
                          <td>{application.email}</td>
                          <td>
                            {isApproved ? (
                              <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                ✓ Approved
                              </span>
                            ) : (
                              <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td>{new Date(application.created_at).toLocaleDateString()}</td>
                          <td>
                            {!isApproved ? (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }} disabled={Boolean(busyId)} onClick={() => void reviewStaff(application, true)}><Check size={14} /> Approve</button>
                                <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }} disabled={Boolean(busyId)} onClick={() => void reviewStaff(application, false)}><X size={14} /> Decline</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Active Staff Member</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.tableTitle}>
                School registrations ({filteredSchools.length})
              </h2>
            </div>
            {filteredSchools.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>
                {search ? "No schools match your search." : `No ${statusFilter === "pending" ? "pending" : statusFilter === "verified" ? "verified" : ""} school registrations found.`}
              </p>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr><th>School</th><th>Registration #</th><th>Official Email</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredSchools.map((school) => {
                      const isVerified = school.status === "verified" || school.status === "active";
                      return (
                        <tr key={school.id}>
                          <td style={{ color: "var(--text-main)", fontWeight: "500" }}>{school.name}</td>
                          <td>{school.registration_no}</td>
                          <td>{school.official_email}</td>
                          <td>
                            {isVerified ? (
                              <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                ✓ Verified
                              </span>
                            ) : (
                              <span style={{ padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td>{new Date(school.created_at).toLocaleDateString()}</td>
                          <td>
                            {!isVerified ? (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }} disabled={Boolean(busyId)} onClick={() => void reviewSchool(school, true)}><Check size={14} /> Verify</button>
                                <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", display: "flex", gap: 6, alignItems: "center" }} disabled={Boolean(busyId)} onClick={() => void reviewSchool(school, false)}><X size={14} /> Decline</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Verified Institution</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
