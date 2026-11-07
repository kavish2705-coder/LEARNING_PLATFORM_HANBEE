"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Phone, RefreshCw, Trophy, UserRound } from "lucide-react";
import styles from "./accessRequestsQueue.module.css";
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
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headingCopy}>
          <span className={styles.eyebrow}>Student services</span>
          <h1>Access requests</h1>
          <p>Call the student — and their parent for Course access — before confirming the next step.</p>
        </div>
        <button type="button" className={styles.refreshButton} onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spinning : ""} />
          <span>{loading ? "Refreshing…" : "Refresh queue"}</span>
        </button>
      </header>

      {error && <div className={styles.alertError} role="alert">{error}</div>}
      {notice && <div className={styles.alertSuccess} role="status"><CheckCircle2 size={17} />{notice}</div>}

      {loading ? (
        <div className={styles.loadingPanel}><Shimmer rows={3} /></div>
      ) : rows.length === 0 ? (
        <section className={styles.emptyState}>
          <span className={styles.emptyIcon}><CheckCircle2 size={24} /></span>
          <p className={styles.eyebrow}>All caught up</p>
          <h2>No requests waiting</h2>
          <p>New student access requests will appear here when they come in.</p>
        </section>
      ) : (
        <section aria-labelledby="queue-title">
          <div className={styles.queueHeading}>
            <div>
              <span className={styles.eyebrow}>Needs your attention</span>
              <h2 id="queue-title">Waiting on you <span>{rows.length}</span></h2>
            </div>
            <p>Confirm the conversation before approving or setting a fee.</p>
          </div>

          <div className={styles.requestGrid}>
            {rows.map((row) => {
              const isCourse = row.direction === "add_course";
              const confirmed = row.parent_confirmed && row.student_confirmed;
              const busy = busyId === row.id;
              return (
                <article className={styles.requestCard} key={row.id}>
                  <div className={styles.requestTop}>
                    <div className={styles.studentIdentity}>
                      <span className={styles.avatar}><UserRound size={19} /></span>
                      <div className={styles.studentCopy}>
                        <h3>{row.student_name}</h3>
                        <a className={styles.phoneLink} href={row.phone ? `tel:${row.phone}` : undefined}>
                          <Phone size={13} /> {row.phone || "Phone not provided"}
                        </a>
                      </div>
                    </div>
                    <span className={`${styles.requestType} ${isCourse ? styles.courseType : styles.tournamentType}`}>
                      {isCourse ? <BookOpen size={14} /> : <Trophy size={14} />}
                      {isCourse ? "Course" : "RC Tournament"}
                    </span>
                  </div>

                  <div className={styles.requestMeta}>
                    <div>
                      <span>Submitted</span>
                      <strong>{relativeTime(row.created_at)}</strong>
                    </div>
                    {isCourse && (
                      <div>
                        <span>Qualifying quiz</span>
                        <strong>{row.quiz_score == null ? "Not taken" : `${row.quiz_score} / ${row.quiz_total}`}</strong>
                      </div>
                    )}
                  </div>

                  {isCourse ? (
                    <div className={styles.courseReview}>
                      <p className={styles.actionLabel}>Confirm both calls before setting a fee</p>
                      <label className={styles.confirmOption}>
                        <input
                          type="checkbox"
                          checked={row.parent_confirmed}
                          disabled={busy}
                          onChange={(event) => void toggleConfirm(row, "parent", event.target.checked)}
                        />
                        <span>Spoke with parent</span>
                        {row.parent_confirmed && <CheckCircle2 size={16} />}
                      </label>
                      <label className={styles.confirmOption}>
                        <input
                          type="checkbox"
                          checked={row.student_confirmed}
                          disabled={busy}
                          onChange={(event) => void toggleConfirm(row, "student", event.target.checked)}
                        />
                        <span>Spoke with student</span>
                        {row.student_confirmed && <CheckCircle2 size={16} />}
                      </label>
                      <div className={styles.amountRow}>
                        <label className={styles.amountField}>
                          <span className={styles.srOnly}>Course access fee in rupees</span>
                          <span aria-hidden="true">₹</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Set amount"
                            disabled={busy || !confirmed}
                            value={amountDrafts[row.id] ?? ""}
                            onChange={(event) => setAmountDrafts((drafts) => ({ ...drafts, [row.id]: event.target.value }))}
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={busy || !confirmed}
                          onClick={() => void submitAmount(row)}
                          title={!confirmed ? "Confirm with the parent and student first" : undefined}
                        >
                          {busy ? "Saving…" : "Set fee"}
                        </button>
                      </div>
                      {!confirmed && <p className={styles.helperText}>Both calls must be confirmed to enable fee setup.</p>}
                    </div>
                  ) : (
                    <div className={styles.tournamentReview}>
                      <p>Approve this student&apos;s request to add RC Tournament access.</p>
                      <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void approve(row)}>
                        {busy ? "Approving…" : "Approve access"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
