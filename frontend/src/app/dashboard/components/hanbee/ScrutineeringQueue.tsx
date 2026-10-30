"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../dashboard.module.css";
import local from "./TournamentReviewQueue.module.css";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { listTournaments, type TournamentRecord } from "../../../../lib/tournamentAdminApi";
import {
  fetchScrutineeringQueue,
  getScrutineeringInspection,
  submitScrutineeringInspection,
  type ScrutineeringChecklistItem,
  type ScrutineeringQueueRow,
} from "../../../../lib/teamFormationApi";
import Modal from "../../../../components/ui/Modal";
import modalStyles from "../../../../components/ui/Modal.module.css";

type FilterTab = "all" | "pending" | "failed" | "passed";

const DEFAULT_CHECKLIST: Array<{ key: string; label: string }> = [
  { key: "chassis_bodywork", label: "Chassis & bodywork" },
  { key: "wheels_tyres", label: "Wheels & tyres" },
  { key: "steering", label: "Steering" },
  { key: "brakes", label: "Brakes" },
  { key: "battery", label: "Power / battery safety" },
  { key: "wiring", label: "Electronics / wiring" },
  { key: "roster_compliance", label: "Driver / roster compliance" },
  { key: "safety_equipment", label: "Safety equipment" },
];

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ScrutineeringQueue() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [rows, setRows] = useState<ScrutineeringQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const [inspecting, setInspecting] = useState<ScrutineeringQueueRow | null>(null);
  const [items, setItems] = useState<ScrutineeringChecklistItem[]>([]);
  const [notes, setNotes] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTournaments = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" && profile.role !== "manager") {
      throw new Error("Only Hanbee staff and managers can run scrutineering.");
    }
    const events = await listTournaments();
    setTournaments(events);
    if (!tournamentId && events.length > 0) {
      const upcoming = events.find((event) => event.status === "upcoming") ?? events[0];
      setTournamentId(upcoming.id);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadTournaments().catch((reason) => setError(reason instanceof Error ? reason.message : "We couldn't load tournaments."));
  }, [loadTournaments]);

  const loadQueue = useCallback(async (id: string) => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchScrutineeringQueue(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't load the scrutineering queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tournamentId) void loadQueue(tournamentId);
  }, [tournamentId, loadQueue]);

  const counts = useMemo(() => {
    const pending = rows.filter((row) => row.scrutineering_status === "pending").length;
    const failed = rows.filter((row) => row.scrutineering_status === "failed").length;
    const passed = rows.filter((row) => row.scrutineering_status === "passed").length;
    return { total: rows.length, pending, failed, passed };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.scrutineering_status !== filter) return false;
      if (!term) return true;
      return row.team_name.toLowerCase().includes(term);
    });
  }, [rows, filter, search]);

  function openInspection(row: ScrutineeringQueueRow) {
    setInspecting(row);
    setDetailError("");
    setDetailLoading(true);
    getScrutineeringInspection(row.team_id)
      .then((insp) => {
        const existingByKey = new Map(insp.items.map((item) => [item.key, item]));
        setItems(
          DEFAULT_CHECKLIST.map((def) => ({
            key: def.key,
            label: def.label,
            result: existingByKey.get(def.key)?.result ?? "not_checked",
            note: existingByKey.get(def.key)?.note ?? "",
          })),
        );
        setNotes(insp.notes ?? "");
      })
      .catch((reason) => setDetailError(reason instanceof Error ? reason.message : "We couldn't load this inspection."))
      .finally(() => setDetailLoading(false));
  }

  function setItemResult(key: string, result: ScrutineeringChecklistItem["result"]) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, result } : item)));
  }

  async function save(status: "passed" | "failed") {
    if (!inspecting) return;
    const unchecked = items.filter((item) => item.result === "not_checked");
    if (status === "passed" && unchecked.length > 0) {
      setDetailError(`${unchecked.length} item${unchecked.length === 1 ? "" : "s"} still need${unchecked.length === 1 ? "s" : ""} a check before you can pass this car.`);
      return;
    }
    setSaving(true);
    setDetailError("");
    try {
      await submitScrutineeringInspection(inspecting.team_id, status, items, notes.trim() || null);
      setNotice(`${inspecting.team_name} marked as ${status}.`);
      setInspecting(null);
      await loadQueue(tournamentId);
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "We couldn't save this inspection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.tableTitle}>Scrutineering</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
              Pre-race car safety inspection — kept separate from payment verification. A team is only race-eligible once both have passed.
            </p>
          </div>
          {tournaments.length > 0 && (
            <select
              value={tournamentId}
              onChange={(event) => setTournamentId(event.target.value)}
              className={local.searchInput}
              style={{ maxWidth: 280 }}
              aria-label="Tournament"
            >
              {tournaments.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className={local.chipRow}>
          <span className={local.chip}>Total entries <strong>{counts.total}</strong></span>
          <span className={`${local.chip} ${local.chipMissing}`}>Needs inspection <strong>{counts.pending}</strong></span>
          <span className={local.chip} style={{ color: "var(--color-danger)" }}>Failed <strong style={{ color: "var(--color-danger)" }}>{counts.failed}</strong></span>
          <span className={`${local.chip} ${local.chipReady}`}>Passed <strong>{counts.passed}</strong></span>
        </div>

        <div className={local.toolbar}>
          <div className={local.toolbarTabs} role="tablist" aria-label="Filter inspections">
            <button type="button" role="tab" aria-selected={filter === "all"} className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("all")}>All</button>
            <button type="button" role="tab" aria-selected={filter === "pending"} className={`${styles.filterBtn} ${filter === "pending" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("pending")}>Needs inspection</button>
            <button type="button" role="tab" aria-selected={filter === "failed"} className={`${styles.filterBtn} ${filter === "failed" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("failed")}>Failed</button>
            <button type="button" role="tab" aria-selected={filter === "passed"} className={`${styles.filterBtn} ${filter === "passed" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("passed")}>Passed</button>
          </div>
          <input
            type="search"
            className={local.searchInput}
            placeholder="Search team…"
            aria-label="Search teams"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p role="status" style={{ marginTop: 16, color: "var(--text-muted)" }}>Loading scrutineering queue…</p>
        ) : rows.length === 0 ? (
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No teams are entered in this tournament yet.</p>
        ) : filteredRows.length === 0 ? (
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No entries match this filter.</p>
        ) : (
          <>
            <div className={`${styles.tableContainer} ${local.desktopOnly}`} style={{ marginTop: 16 }}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Payment</th>
                    <th>Scrutineering</th>
                    <th>Checked by</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.team_id}>
                      <td><strong style={{ color: "var(--text-main)" }}>{row.team_name}</strong></td>
                      <td style={{ color: "var(--text-main)" }}>{row.payment_status === "verified" ? "Verified" : "Not verified"}</td>
                      <td>
                        <span
                          className={`${local.paymentLabel} ${row.scrutineering_status === "passed" ? local.paymentDeclared : row.scrutineering_status === "failed" ? "" : local.paymentMissing}`}
                          style={row.scrutineering_status === "failed" ? { color: "var(--color-danger)" } : undefined}
                        >
                          {row.scrutineering_status === "passed" ? "Passed" : row.scrutineering_status === "failed" ? "Failed" : "Needs inspection"}
                        </span>
                      </td>
                      <td className={local.ageText}>{row.checked_by_name ? `${row.checked_by_name} · ${relativeTime(row.checked_at)}` : "—"}</td>
                      <td>
                        <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => openInspection(row)}>Inspect →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={local.mobileOnly} style={{ marginTop: 16 }}>
              {filteredRows.map((row) => (
                <div key={row.team_id} className={local.entryCard}>
                  <div className={local.entryCardHead}>
                    <div className={local.entryCardTeam}>{row.team_name}</div>
                    <span
                      className={`${local.paymentLabel} ${row.scrutineering_status === "passed" ? local.paymentDeclared : local.paymentMissing}`}
                      style={row.scrutineering_status === "failed" ? { color: "var(--color-danger)" } : undefined}
                    >
                      {row.scrutineering_status === "passed" ? "Passed" : row.scrutineering_status === "failed" ? "Failed" : "Needs inspection"}
                    </span>
                  </div>
                  <div className={local.entryCardRow}>
                    <span className={local.ageText}>{row.checked_by_name ? `${row.checked_by_name} · ${relativeTime(row.checked_at)}` : "Not inspected yet"}</span>
                    <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => openInspection(row)}>Inspect →</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && error && <button type="button" onClick={() => void loadQueue(tournamentId)} style={{ marginTop: 14 }}>Try again</button>}

      <Modal
        open={inspecting !== null}
        title={inspecting?.team_name ?? ""}
        onClose={() => setInspecting(null)}
        actions={
          inspecting && (
            <>
              <button type="button" className={modalStyles.secondaryBtn} disabled={saving} onClick={() => setInspecting(null)}>Close</button>
              <button type="button" className={modalStyles.dangerBtn} disabled={saving} onClick={() => void save("failed")}>
                {saving ? "Saving…" : "Fail inspection"}
              </button>
              <button type="button" className={modalStyles.primaryBtn} disabled={saving} onClick={() => void save("passed")}>
                {saving ? "Saving…" : "Pass inspection"}
              </button>
            </>
          )
        }
      >
        {inspecting && (
          <div>
            {detailLoading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading checklist…</p>
            ) : (
              <>
                {detailError && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 13, marginBottom: 10 }}>{detailError}</p>}
                <ul className={local.rosterList}>
                  {items.map((item) => (
                    <li key={item.key} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span>{item.label}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={styles.filterBtn}
                            style={{ padding: "4px 10px", fontSize: 11, background: item.result === "pass" ? "var(--color-success)" : undefined, color: item.result === "pass" ? "#fff" : undefined }}
                            onClick={() => setItemResult(item.key, "pass")}
                          >
                            Pass
                          </button>
                          <button
                            type="button"
                            className={styles.filterBtn}
                            style={{ padding: "4px 10px", fontSize: 11, background: item.result === "fail" ? "var(--color-danger)" : undefined, color: item.result === "fail" ? "#fff" : undefined }}
                            onClick={() => setItemResult(item.key, "fail")}
                          >
                            Fail
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p style={{ marginTop: 16, marginBottom: 6, color: "var(--text-main)", fontWeight: 600, fontSize: 13.5 }}>Notes</p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Visible to the team if this inspection fails."
                  className={local.searchInput}
                  style={{ width: "100%", maxWidth: "none", resize: "vertical" }}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
