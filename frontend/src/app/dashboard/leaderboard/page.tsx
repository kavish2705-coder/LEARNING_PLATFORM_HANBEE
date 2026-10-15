"use client";

import { useQuery } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { getLeaderboard, listTournaments } from "../../../lib/tournamentAdminApi";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

export default function LeaderboardPage() {
  const { data: tournaments, isLoading: loadingTournaments, error: tournamentError } = useQuery({
    queryKey: ["tournaments"],
    queryFn: listTournaments,
  });
  const tournament = (tournaments ?? []).find((t) => t.status === "completed") ?? (tournaments ?? [])[0];

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["leaderboard", tournament?.id],
    queryFn: () => getLeaderboard(tournament!.id),
    enabled: Boolean(tournament?.id),
  });

  const loading = loadingTournaments || isLoading;
  const failure = tournamentError ?? error;
  const displayRows = rows ?? [];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>{tournament ? tournament.title : "RC Cup Championship Standings & Telemetry"}</p>
      </div>

      <MyRank />

      {failure && <p role="alert">{failure instanceof Error ? failure.message : "We couldn't load the leaderboard."}</p>}
      {loading && <Shimmer rows={5} />}

      {!loading && !failure && tournament && displayRows.length === 0 && (
        <div className={styles.sectionCard}>
          <p style={{ color: "var(--text-muted)" }}>No results have been posted for this tournament yet.</p>
        </div>
      )}

      {!loading && !failure && !tournament && (
        <div className={styles.sectionCard}>
          <p style={{ color: "var(--text-muted)" }}>No tournament has been published yet.</p>
        </div>
      )}

      {!loading && !failure && displayRows.length > 0 && (
        <div className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Top Teams</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {displayRows.map((team, index) => (
              <div
                key={team.team_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 24px",
                  background: index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: index < 3 ? "var(--clay-shadow-elevated)" : "var(--clay-shadow-outer)",
                  borderRadius: "16px",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "22px", fontWeight: "700", fontFamily: "monospace", color: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#b45309" : "var(--text-muted)", width: "40px", textAlign: "center" }}>
                  #{team.rank}
                </div>
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>{team.team_name}</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "3px 0 0" }}>
                    {team.school_name ?? "Solo entry"}
                  </p>
                </div>
                <div style={{ textAlign: "right", fontSize: "16px", fontWeight: "700", fontFamily: "monospace", color: "var(--accent)" }}>
                  {team.points.toLocaleString()} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MyRank() {
  const { data } = useQuery({
    queryKey: ["my-leaderboard-rank"],
    queryFn: () => authenticatedSupabaseFetch<{ tournament_title: string; team_name: string; rank: number; points: number; field_size: number }[]>("/rest/v1/rpc/my_leaderboard_rank", { method: "POST", body: "{}" }),
  });
  const row = data?.[0];
  if (!row) return null;
  return (
    <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
      <span className={styles.metricLabel}>Your team in {row.tournament_title}</span>
      <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>{row.team_name}: #{row.rank} of {row.field_size}</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{row.points} points</p>
    </div>
  );
}
