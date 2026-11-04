"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import Shimmer from "../ui/Shimmer";
import {
  fetchAccessRequestsQueue, approveTournamentAccess, setCourseAccessConfirmation, setCourseAccessAmount,
  type AccessQueueRow,
} from "../../../../lib/accessApi";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AccessRequestsQueue() {
  const [rows, setRows] = useState<AccessQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchAccessRequestsQueue());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load the access requests queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(row: AccessQueueRow) {
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      await approveTournamentAccess(row.id);
      setNotice(`${row.student_name}'s RC Tournament access is active.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't approve this request.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleConfirm(row: AccessQueueRow, field: "parent" | "student", value: boolean) {
    setBusyId(row.id);
    setError("");
    try {
      await setCourseAccessConfirmation(
        row.id,
        field === "parent" ? value : row.parent_confirmed,
        field === "student" ? value : row.student_confirmed,
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update that confirmation.");
    } finally {
      setBusyId("");
    }
  }

  async function submitAmount(row: AccessQueueRow) {
    const raw = amountDrafts[row.id];
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount before generating the payment.");
      return;
    }
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      await setCourseAccessAmount(row.id, amount);
      setNotice(`Payment of ₹${amount} set for ${row.student_name}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't set that amount.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Course / RC Tournament access requests</h1>
        <p className={styles.pageSubtitle}>
          Students asking to add the dashboard they didn&apos;t pick at signup. Call the student (and their parent,
          for a Course request) before confirming anything here.
        </p>
      </div>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status" style={{ color: "var(--color-success)" }}>{notice}</p>}

      {loading ? <Shimmer rows={3} /> : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.tableTitle}>Waiting on you ({rows.length})</h2>
          </div>
          {rows.length === 0 ? (
            <p>No access requests are waiting right now.</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Phone</th>
                    <th>Wants</th>
                    <th>Quiz</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><strong style={{ color: "var(--text-main)" }}>{row.student_name}</strong></td>
                      <td>{row.phone || "—"}</td>
                      <td>{row.direction === "add_course" ? "Course" : "RC Tournament"}</td>
                      <td>{row.direction === "add_course" ? (row.quiz_score == null ? "Not taken yet" : `${row.quiz_score}/${row.quiz_total}`) : "—"}</td>
                      <td>{relativeTime(row.created_at)}</td>
                      <td>
                        {row.direction === "add_tournament" ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void approve(row)}
                            style={{ padding: "7px 14px", borderRadius: 8, background: "var(--color-primary)", color: "var(--color-primary-text)", border: "none", fontSize: 13, fontWeight: 600, cursor: busyId === row.id ? "not-allowed" : "pointer" }}
                          >
                            {busyId === row.id ? "Saving…" : "Approve"}
                          </button>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
                            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                              <input
                                type="checkbox"
                                checked={row.parent_confirmed}
                                disabled={busyId === row.id}
                                onChange={(e) => void toggleConfirm(row, "parent", e.target.checked)}
                              />
                              Called parent, confirmed
                            </label>
                            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                              <input
                                type="checkbox"
                                checked={row.student_confirmed}
                                disabled={busyId === row.id}
                                onChange={(e) => void toggleConfirm(row, "student", e.target.checked)}
                              />
                              Called student, confirmed
                            </label>
                            <div style={{ display: "flex", gap: 6 }}>
                              <input
                                type="number"
                                min={1}
                                placeholder="Amount ₹"
                                disabled={busyId === row.id || !(row.parent_confirmed && row.student_confirmed)}
                                value={amountDrafts[row.id] ?? ""}
                                onChange={(e) => setAmountDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                                style={{ width: 100, padding: "6px 8px", borderRadius: 6, border: "var(--border-subtle)", background: "transparent", color: "inherit", fontSize: 13 }}
                              />
                              <button
                                type="button"
                                disabled={busyId === row.id || !(row.parent_confirmed && row.student_confirmed)}
                                onClick={() => void submitAmount(row)}
                                style={{ padding: "6px 12px", borderRadius: 6, background: "var(--color-primary)", color: "var(--color-primary-text)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                                title={!(row.parent_confirmed && row.student_confirmed) ? "Confirm with the parent and student first" : undefined}
                              >
                                Set & pay
                              </button>
                            </div>
                          </div>
                        )}
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
