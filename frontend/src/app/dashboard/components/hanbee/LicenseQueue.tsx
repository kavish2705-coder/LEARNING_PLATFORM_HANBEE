"use client";

import { useCallback, useEffect, useState } from "react";
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
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Driver License payments</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Review payment declarations before activating a student&apos;s Driver License.
        </p>
      </div>

      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 13 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "var(--color-success)", fontSize: 13 }}>{notice}</p>}

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No license payments are waiting for review.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row) => (
            <div
              key={row.student_id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 16px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border-elevated)",
              }}
            >
              <div>
                <strong style={{ color: "var(--text-main)" }}>{row.student_name}</strong>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                  ₹{row.amount} · UTR {row.payment_reference || "—"} · {relativeTime(row.created_at)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={busyId === row.student_id}
                  onClick={() => void decide(row, "rejected")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "var(--btn-secondary-bg)", color: "var(--text-main)", border: "none", fontSize: 13, cursor: "pointer" }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busyId === row.student_id}
                  onClick={() => void decide(row, "active")}
                  style={{ padding: "7px 14px", borderRadius: 8, background: "var(--color-primary)", color: "var(--color-primary-text)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {busyId === row.student_id ? "Saving…" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
