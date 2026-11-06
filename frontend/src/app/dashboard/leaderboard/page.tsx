"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import styles from "../dashboard.module.css";
import leaderboardStyles from "./leaderboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import EmptyState from "../components/ui/EmptyState";
import { getStudentLeaderboard, listTournaments, pickActiveTournament } from "../../../lib/tournamentAdminApi";
import type { StudentLeaderboardRow } from "../../../lib/tournamentAdminApi";

type EntryType = "school" | "solo";

function formatLapTime(milliseconds: number | null) {
  return milliseconds === null ? "—" : `${(milliseconds / 1000).toFixed(2)}s`;
}

export default function LeaderboardPage() {
  const [entryType, setEntryType] = useState<EntryType | null>(null);
  const { data: tournaments, isLoading: loadingTournaments, error: tournamentError } = useQuery({
    queryKey: ["tournaments"],
    queryFn: listTournaments,
  });
  const tournament = pickActiveTournament(tournaments);

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["student-leaderboard", tournament?.id],
    queryFn: () => getStudentLeaderboard(tournament!.id),
    enabled: Boolean(tournament?.id),
  });

  const loading = loadingTournaments || isLoading;
  const failure = tournamentError ?? error;
  const isRealData = Boolean(rows);
  const schoolRows = (rows ?? []).filter((row) => row.org_id !== null);
  const soloRows = (rows ?? []).filter((row) => row.org_id === null);

  // Default to whichever tab actually has data once it loads, instead of a
  // fixed "school" default that can land on an empty tab while solo entries
  // sit unseen on the other one.
  useEffect(() => {
    if (entryType !== null || !rows) return;
    setEntryType(schoolRows.length > 0 || soloRows.length === 0 ? "school" : "solo");
  }, [entryType, rows, schoolRows.length, soloRows.length]);

  const activeEntryType = entryType ?? "school";
  const filteredRows = activeEntryType === "school" ? schoolRows : soloRows;
  const currentUserRow = rows?.find((row) => row.is_current_user);
  const fieldSize = currentUserRow?.field_size ?? rows?.[0]?.field_size ?? 0;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>
          {tournament ? tournament.title : "RC Cup Championship Standings & Telemetry"}
        </p>
      </div>

      {currentUserRow && (
        <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
          <span className={styles.metricLabel}>Your entry in {tournament?.title}</span>
          <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>
            {currentUserRow.team_name}: {currentUserRow.rank === null ? "Not ranked" : `#${currentUserRow.rank} of ${fieldSize}`}
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
            {currentUserRow.points.toLocaleString()} points
          </p>
        </div>
      )}

      {failure && <p role="alert">{failure instanceof Error ? failure.message : "We couldn't load the leaderboard."}</p>}
      {loading && <Shimmer rows={5} />}
      {!loading && !failure && !tournament && (
        <EmptyState
          icon={<Trophy size={22} />}
          title="No tournaments yet"
          description="Standings will appear here as soon as a tournament is scheduled."
        />
      )}

      {!loading && !failure && tournament && (
        <section className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Official Standings</h2>
            <span style={{ fontSize: 12, color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              {fieldSize} verified entries
            </span>
          </div>

          <div role="group" aria-label="Leaderboard entry type" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {([
              ["school", `School Teams (${schoolRows.length})`],
              ["solo", `Solo Entries (${soloRows.length})`],
            ] as const).map(([type, label]) => (
              <button
                key={type}
                type="button"
                aria-pressed={activeEntryType === type}
                onClick={() => setEntryType(type)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: `1px solid ${activeEntryType === type ? "var(--color-primary)" : "var(--border-subtle)"}`,
                  background: activeEntryType === type ? "color-mix(in srgb, var(--color-primary) 14%, var(--bg-card))" : "var(--bg-card)",
                  color: activeEntryType === type ? "var(--accent-subtle-text)" : "var(--text-muted)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {isRealData ? (
            filteredRows.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filteredRows.map((entry) => (
                  <LeaderboardEntry key={entry.team_id} entry={entry} />
                ))}
              </div>
            ) : (
              <div style={{ padding: 20, border: "1px dashed var(--border-subtle)", borderRadius: 14, color: "var(--text-muted)" }}>
                No {activeEntryType === "school" ? "school team" : "solo"} entries have been verified for this tournament.
              </div>
            )
          ) : (
            <p style={{ color: "var(--text-muted)" }}>No verified entries or results are available for this tournament yet.</p>
          )}
        </section>
      )}
    </div>
  );
}

function LeaderboardEntry({ entry }: { entry: StudentLeaderboardRow }) {
  return (
    <article
      className={leaderboardStyles.entry}
      style={{
        background: entry.is_current_user ? "var(--bg-card-hover)" : "var(--bg-card)",
        border: entry.is_current_user ? "2px solid var(--color-primary)" : "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: entry.rank === 1 ? "var(--color-warning)" : "var(--text-muted)", textAlign: "center" }}>
        {entry.rank === null ? "—" : `#${entry.rank}`}
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, overflowWrap: "anywhere" }}>{entry.team_name}</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "3px 0 0" }}>{entry.school_name ?? "Solo entry"}</p>
        {entry.is_current_user && <span style={{ color: "var(--accent-subtle-text)", fontSize: 12, fontWeight: 600 }}>Your entry</span>}
      </div>
      <EntryStat label="Avg lap" value={formatLapTime(entry.average_lap_time_ms)} />
      <EntryStat label="Races" value={String(entry.matches_participated)} />
      <EntryStat label="Wins" value={String(entry.wins)} />
      <EntryStat label="Top 3" value={String(entry.top_three_finishes)} />
      <EntryStat
        label="Win rate"
        value={entry.matches_participated === 0 ? "—" : `${Math.round((entry.wins / entry.matches_participated) * 100)}%`}
      />
      <EntryStat label="Points" value={entry.points.toLocaleString()} />
    </article>
  );
}

function EntryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={leaderboardStyles.stat} style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
      <div style={{ color: "var(--text-main)", fontWeight: 700 }}>{value}</div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-heading)" }}>{label}</div>
    </div>
  );
}
