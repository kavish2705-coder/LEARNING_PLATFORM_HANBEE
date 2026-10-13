"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { decideTournamentApplication, fetchTournamentApplicationQueue, type TournamentApplication } from "../../../../lib/teamFormationApi";

export default function TournamentReviewQueue() {
  const [rows, setRows] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await getAccountProfile();
      if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Only Hanbee staff and managers can review tournament entries.");
      setRows(await fetchTournamentApplicationQueue());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load tournament entries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(row: TournamentApplication, decision: "verified" | "rejected") {
    setBusyId(row.team_id);
    setError("");
    setNotice("");
    try {
      await decideTournamentApplication(row.team_id, decision);
      setNotice(`${row.team_name} ${decision === "verified" ? "verified" : "rejected"}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this entry.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section style={{ marginTop: 28 }}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Tournament entry review</h2>
        <p className={styles.pageSubtitle}>Verify payment declarations and approve school teams or solo entries.</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? <p role="status" className={styles.sectionCard}>Loading tournament applications…</p> : rows.length === 0 ? <p className={styles.sectionCard}>No tournament entries are waiting for review.</p> : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.tableTitle}>Tournament Entries ({rows.length})</h2>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Tournament</th>
                  <th>Status & Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.team_id}>
                    <td>
                      <strong style={{ color: "var(--text-main)", display: "block" }}>{row.team_name}</strong>
                      <span style={{ fontSize: "12px" }}>{row.school_name ?? "Solo entry"} · {row.member_count} player{row.member_count === 1 ? "" : "s"}{row.captain_name ? ` · ${row.captain_name}` : ""}</span>
                    </td>
                    <td style={{ color: "var(--text-main)", fontWeight: "500" }}>{row.tournament_title}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ textTransform: "capitalize" }}>{row.status.replaceAll("_", " ")}</span>
                        {row.payment_declared ? (
                          <span style={{ color: "var(--color-success)", fontSize: "12px", fontWeight: "600" }}>Payment Declared</span>
                        ) : (
                          <span style={{ color: "var(--color-warning)", fontSize: "12px" }}>Payment Not Declared</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} disabled={Boolean(busyId) || !row.payment_declared} onClick={() => void decide(row, "verified")}>{busyId === row.team_id ? "Saving…" : "Verify entry"}</button>
                        <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} disabled={Boolean(busyId)} onClick={() => void decide(row, "rejected")}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!loading && error && <button type="button" onClick={() => void load()} style={{ marginTop: 14 }}>Try again</button>}
    </section>
  );
}
