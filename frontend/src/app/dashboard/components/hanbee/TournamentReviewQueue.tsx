"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../dashboard.module.css";
import local from "./TournamentReviewQueue.module.css";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import {
  decideTournamentApplication,
  fetchTournamentApplicationQueue,
  getTeamRoster,
  type TeamRosterMember,
  type TournamentApplication,
} from "../../../../lib/teamFormationApi";
import Modal from "../../../../components/ui/Modal";
import modalStyles from "../../../../components/ui/Modal.module.css";
import { useConfirm } from "../../../../components/ui/useConfirm";

type FilterTab = "all" | "ready" | "waiting";

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

export default function TournamentReviewQueue() {
  const [rows, setRows] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const [reviewing, setReviewing] = useState<TournamentApplication | null>(null);
  const [roster, setRoster] = useState<TeamRosterMember[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  const { ask, dialog } = useConfirm();

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

  const counts = useMemo(() => {
    const ready = rows.filter((row) => row.payment_declared).length;
    return { total: rows.length, ready, missing: rows.length - ready };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "ready" && !row.payment_declared) return false;
      if (filter === "waiting" && row.payment_declared) return false;
      if (!term) return true;
      return row.team_name.toLowerCase().includes(term) || (row.school_name ?? "").toLowerCase().includes(term);
    });
  }, [rows, filter, search]);

  function openReview(row: TournamentApplication) {
    setReviewing(row);
    setRoster(null);
    setRosterError("");
    setRosterLoading(true);
    getTeamRoster(row.team_id)
      .then((members) => setRoster(members))
      .catch((reason) => setRosterError(reason instanceof Error ? reason.message : "We couldn't load the team roster."))
      .finally(() => setRosterLoading(false));
  }

  async function decide(decision: "verified" | "rejected") {
    if (!reviewing) return;
    if (decision === "rejected") {
      const confirmed = await ask({
        title: "Reject this entry?",
        message: `${reviewing.team_name} will be rejected and the captain notified. This can't be undone from here.`,
        confirmLabel: "Reject entry",
        tone: "danger",
      });
      if (!confirmed) return;
    }
    setBusyId(reviewing.team_id);
    setError("");
    setNotice("");
    try {
      await decideTournamentApplication(reviewing.team_id, decision);
      setNotice(`${reviewing.team_name} ${decision === "verified" ? "verified" : "rejected"}.`);
      setReviewing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this entry.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section>
      {dialog}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.tableTitle}>Tournament entry review</h2>
            <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Verify payment declarations and approve school teams or solo entries.</p>
          </div>
        </div>

        <div className={local.chipRow}>
          <span className={local.chip}>Needs review <strong>{counts.total}</strong></span>
          <span className={`${local.chip} ${local.chipReady}`}>Payment declared <strong>{counts.ready}</strong></span>
          <span className={`${local.chip} ${local.chipMissing}`}>Payment missing <strong>{counts.missing}</strong></span>
        </div>

        <div className={local.toolbar}>
          <div className={local.toolbarTabs} role="tablist" aria-label="Filter entries">
            <button type="button" role="tab" aria-selected={filter === "all"} className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("all")}>All</button>
            <button type="button" role="tab" aria-selected={filter === "ready"} className={`${styles.filterBtn} ${filter === "ready" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("ready")}>Ready to verify</button>
            <button type="button" role="tab" aria-selected={filter === "waiting"} className={`${styles.filterBtn} ${filter === "waiting" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("waiting")}>Waiting for payment</button>
          </div>
          <input
            type="search"
            className={local.searchInput}
            placeholder="Search team or school…"
            aria-label="Search entries"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p role="status" style={{ marginTop: 16, color: "var(--text-muted)" }}>Loading tournament applications…</p>
        ) : rows.length === 0 ? (
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No tournament entries are waiting for review.</p>
        ) : filteredRows.length === 0 ? (
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No entries match this filter.</p>
        ) : (
          <>
            <div className={`${styles.tableContainer} ${local.desktopOnly}`} style={{ marginTop: 16 }}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>School / Captain</th>
                    <th>Submitted</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.team_id}>
                      <td>
                        <strong style={{ color: "var(--text-main)", display: "block" }}>{row.team_name}</strong>
                        <span style={{ fontSize: "12px" }}>{row.member_count} player{row.member_count === 1 ? "" : "s"}</span>
                      </td>
                      <td style={{ color: "var(--text-main)" }}>{row.school_name ?? "Solo entry"}{row.captain_name ? ` · ${row.captain_name}` : ""}</td>
                      <td className={local.ageText}>{relativeTime(row.submitted_at)}</td>
                      <td>
                        <span className={`${local.paymentLabel} ${row.payment_declared ? local.paymentDeclared : local.paymentMissing}`}>
                          {row.payment_declared ? "Declared by team" : "Not yet declared"}
                        </span>
                      </td>
                      <td>
                        <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => openReview(row)}>Review →</button>
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
                    <div>
                      <div className={local.entryCardTeam}>{row.team_name}</div>
                      <div className={local.entryCardMeta}>{row.school_name ?? "Solo entry"}{row.captain_name ? ` · ${row.captain_name}` : ""} · {row.member_count} player{row.member_count === 1 ? "" : "s"}</div>
                    </div>
                    <span className={`${local.paymentLabel} ${row.payment_declared ? local.paymentDeclared : local.paymentMissing}`}>
                      {row.payment_declared ? "Declared" : "Missing"}
                    </span>
                  </div>
                  <div className={local.entryCardRow}>
                    <span className={local.ageText}>Submitted {relativeTime(row.submitted_at)}</span>
                    <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => openReview(row)}>Review →</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && error && <button type="button" onClick={() => void load()} style={{ marginTop: 14 }}>Try again</button>}

      <Modal
        open={reviewing !== null}
        title={reviewing?.team_name ?? ""}
        onClose={() => setReviewing(null)}
        actions={
          reviewing && (
            <>
              <button type="button" className={modalStyles.secondaryBtn} disabled={Boolean(busyId)} onClick={() => setReviewing(null)}>
                Close
              </button>
              <button type="button" className={modalStyles.dangerBtn} disabled={Boolean(busyId)} onClick={() => void decide("rejected")}>
                {busyId === reviewing.team_id ? "Saving…" : "Reject entry"}
              </button>
              <button
                type="button"
                className={modalStyles.primaryBtn}
                disabled={Boolean(busyId) || !reviewing.payment_declared}
                title={reviewing.payment_declared ? undefined : "This team hasn't declared payment yet"}
                onClick={() => void decide("verified")}
              >
                {busyId === reviewing.team_id ? "Saving…" : "Verify entry"}
              </button>
            </>
          )
        }
      >
        {reviewing && (
          <div>
            <div className={local.detailRow}><span>Tournament</span><span>{reviewing.tournament_title}</span></div>
            <div className={local.detailRow}><span>School</span><span>{reviewing.school_name ?? "Solo entry"}</span></div>
            <div className={local.detailRow}><span>Captain</span><span>{reviewing.captain_name ?? "—"}</span></div>
            <div className={local.detailRow}><span>Submitted</span><span>{relativeTime(reviewing.submitted_at)}</span></div>
            <div className={local.detailRow}>
              <span>Payment</span>
              <span className={reviewing.payment_declared ? local.paymentDeclared : local.paymentMissing}>
                {reviewing.payment_declared ? "Declared by team" : "Not yet declared"}
              </span>
            </div>

            <p style={{ marginTop: 16, marginBottom: 6, color: "var(--text-main)", fontWeight: 600, fontSize: 13.5 }}>Roster ({reviewing.member_count})</p>
            {rosterLoading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading roster…</p>
            ) : rosterError ? (
              <p role="alert" style={{ color: "var(--color-danger)", fontSize: 13 }}>{rosterError}</p>
            ) : (
              <ul className={local.rosterList}>
                {(roster ?? []).map((member) => (
                  <li key={member.student_id}>
                    {member.full_name ?? "Unnamed student"}
                    <span>joined {relativeTime(member.joined_at)}</span>
                  </li>
                ))}
                {roster && roster.length === 0 && <li style={{ color: "var(--text-muted)" }}>No members on this roster yet.</li>}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
