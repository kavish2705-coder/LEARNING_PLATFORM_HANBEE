"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../dashboard.module.css";
import local from "./TournamentReviewQueue.module.css";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import {
  decideTournamentApplication,
  fetchTournamentApplicationQueue,
  getTeamRoster,
  markPaymentReceived,
  type TeamRosterMember,
  type TournamentApplication,
} from "../../../../lib/teamFormationApi";
import Modal from "../../../../components/ui/Modal";
import modalStyles from "../../../../components/ui/Modal.module.css";
import { useConfirm } from "../../../../components/ui/useConfirm";

type FilterTab = "pending" | "ready" | "waiting" | "reviewed";

function isPending(row: TournamentApplication) {
  return row.status === "applied" || row.status === "payment_declared";
}

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
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [search, setSearch] = useState("");

  const [reviewing, setReviewing] = useState<TournamentApplication | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [markPaymentRef, setMarkPaymentRef] = useState("");
  const [markingPayment, setMarkingPayment] = useState(false);
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
    const pending = rows.filter(isPending);
    const ready = pending.filter((row) => row.payment_declared).length;
    return {
      pending: pending.length,
      ready,
      missing: pending.length - ready,
      reviewed: rows.length - pending.length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const pending = isPending(row);
      if (filter === "reviewed" ? pending : !pending) return false;
      if (filter === "ready" && !row.payment_declared) return false;
      if (filter === "waiting" && row.payment_declared) return false;
      return !term || row.team_name.toLowerCase().includes(term) ||
        (row.school_name ?? "").toLowerCase().includes(term) ||
        (row.captain_name ?? "").toLowerCase().includes(term);
    });
  }, [rows, filter, search]);

  function openReview(row: TournamentApplication) {
    setReviewing(row);
    setDecisionNote("");
    setMarkPaymentRef("");
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
    if (decision === "rejected" && !decisionNote.trim()) {
      setError("Add a reason before rejecting this entry.");
      return;
    }
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
      await decideTournamentApplication(reviewing.team_id, decision, decisionNote);
      setNotice(`${reviewing.team_name} ${decision === "verified" ? "verified" : "rejected"}.`);
      setReviewing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't update this entry.");
    } finally {
      setBusyId("");
    }
  }

  async function handleMarkPaymentReceived() {
    if (!reviewing) return;
    setMarkingPayment(true);
    setError("");
    setNotice("");
    try {
      await markPaymentReceived(reviewing.team_id, markPaymentRef);
      setNotice(`Payment recorded for ${reviewing.team_name}.`);
      await load();
      setReviewing((current) => current && { ...current, status: "payment_declared", payment_declared: true, payment_reference: markPaymentRef.trim() || current.payment_reference });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't record this payment.");
    } finally {
      setMarkingPayment(false);
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
            <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Review payment declarations. Completed decisions remain available in Reviewed.</p>
          </div>
        </div>

        <div className={local.chipRow}>
          <span className={local.chip}>Needs review <strong>{counts.pending}</strong></span>
          <span className={`${local.chip} ${local.chipReady}`}>Payment declared <strong>{counts.ready}</strong></span>
          <span className={`${local.chip} ${local.chipMissing}`}>Payment missing <strong>{counts.missing}</strong></span>
          <span className={local.chip}>Reviewed <strong>{counts.reviewed}</strong></span>
        </div>

        <div className={local.toolbar}>
          <div className={local.toolbarTabs} role="tablist" aria-label="Filter entries">
            <button type="button" role="tab" aria-selected={filter === "pending"} className={`${styles.filterBtn} ${filter === "pending" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("pending")}>Needs review</button>
            <button type="button" role="tab" aria-selected={filter === "ready"} className={`${styles.filterBtn} ${filter === "ready" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("ready")}>Ready to verify</button>
            <button type="button" role="tab" aria-selected={filter === "waiting"} className={`${styles.filterBtn} ${filter === "waiting" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("waiting")}>Waiting for payment</button>
            <button type="button" role="tab" aria-selected={filter === "reviewed"} className={`${styles.filterBtn} ${filter === "reviewed" ? styles.filterBtnActive : ""}`} onClick={() => setFilter("reviewed")}>Reviewed</button>
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
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>No tournament entries are waiting for review or have a completed decision.</p>
        ) : filteredRows.length === 0 ? (
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>
            {filter === "reviewed" ? "No completed entry decisions yet." : filter === "pending" ? "No entries are waiting for review." : "No entries match this filter."}
          </p>
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
                        {isPending(row) ? (
                          <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => openReview(row)}>Review →</button>
                        ) : (
                          <span className={`${local.decisionLabel} ${row.status === "verified" ? local.decisionApproved : local.decisionRejected}`}>
                            {row.status === "verified" ? "Verified" : "Rejected"}
                          </span>
                        )}
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
                    {isPending(row) ? (
                      <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => openReview(row)}>Review →</button>
                    ) : (
                      <span className={`${local.decisionLabel} ${row.status === "verified" ? local.decisionApproved : local.decisionRejected}`}>
                        {row.status === "verified" ? "Verified" : "Rejected"}
                      </span>
                    )}
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
            {reviewing.payment_reference && (
              <div className={local.detailRow}>
                <span>Transaction ID / UTR</span>
                <span style={{ fontFamily: "monospace" }}>{reviewing.payment_reference}</span>
              </div>
            )}

            {!reviewing.payment_declared && (
              <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 8 }}>
                  This entry never went through self-service payment (e.g. a pool team, or an older entry). If you&apos;ve confirmed payment yourself, record it here before verifying.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={markPaymentRef}
                    onChange={(event) => setMarkPaymentRef(event.target.value)}
                    placeholder="Reference (optional)"
                    maxLength={100}
                    disabled={markingPayment}
                    className={local.searchInput}
                    style={{ flex: "1 1 180px", maxWidth: "none" }}
                  />
                  <button
                    type="button"
                    className={styles.filterBtn}
                    disabled={markingPayment}
                    onClick={() => void handleMarkPaymentReceived()}
                  >
                    {markingPayment ? "Saving…" : "Mark payment received"}
                  </button>
                </div>
              </div>
            )}

            <label style={{ display: "grid", gap: 6, marginTop: 16, color: "var(--text-main)", fontWeight: 600, fontSize: 13.5 }}>
              Review note {" "}<span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(required when rejecting)</span>
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Explain the payment or entry decision for the team."
                className={local.searchInput}
                style={{ width: "100%", maxWidth: "none", resize: "vertical", fontWeight: 400 }}
              />
            </label>

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
