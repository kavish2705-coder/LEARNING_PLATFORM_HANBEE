"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import Shimmer from "../../components/ui/Shimmer";
import { fetchLicenseQueue, staffDecideLicense, type LicenseQueueRow } from "../../../../lib/teamFormationApi";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function LicenseQueue() {
  const [rows, setRows] = useState<LicenseQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchLicenseQueue());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load the license queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(row: LicenseQueueRow, decision: "active" | "rejected") {
    setBusyId(row.student_id);
    setError("");
    setNotice("");
    try {
      await staffDecideLicense(row.student_id, decision);
      setNotice(`${row.student_name}'s license ${decision === "active" ? "activated" : "rejected"}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this license.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Driver License payments</h1>
        <p className={styles.pageSubtitle}>Review payment declarations before activating a student&apos;s Driver License.</p>
      </div>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status" style={{ color: "var(--color-success)" }}>{notice}</p>}

      {loading ? <Shimmer rows={3} /> : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.tableTitle}>Waiting for review ({rows.length})</h2>
          </div>
          {rows.length === 0 ? (
            <p>No license payments are waiting for review.</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>UTR</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.student_id}>
                      <td><strong style={{ color: "var(--text-main)" }}>{row.student_name}</strong></td>
                      <td style={{ color: "var(--text-main)", fontWeight: 500 }}>₹{row.amount}</td>
                      <td>{row.payment_reference || "—"}</td>
                      <td>{relativeTime(row.created_at)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            disabled={busyId === row.student_id}
                            onClick={() => void decide(row, "rejected")}
                            style={{ padding: "7px 14px", borderRadius: 8, background: "var(--btn-secondary-bg)", color: "var(--text-main)", border: "none", fontSize: 13, cursor: busyId === row.student_id ? "not-allowed" : "pointer" }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.student_id}
                            onClick={() => void decide(row, "active")}
                            style={{ padding: "7px 14px", borderRadius: 8, background: "var(--color-primary)", color: "var(--color-primary-text)", border: "none", fontSize: 13, fontWeight: 600, cursor: busyId === row.student_id ? "not-allowed" : "pointer" }}
                          >
                            {busyId === row.student_id ? "Saving…" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
