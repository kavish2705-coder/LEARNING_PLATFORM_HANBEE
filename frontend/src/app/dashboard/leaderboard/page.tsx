"use client";

import { useQuery } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { getLeaderboard, listTournaments } from "../../../lib/tournamentAdminApi";

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

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>{tournament ? tournament.title : "See the latest tournament results"}</p>
      </div>

      {failure && <p role="alert">{failure instanceof Error ? failure.message : "We couldn't load the leaderboard."}</p>}
      {loading && <Shimmer rows={5} />}
      {!loading && !failure && !tournament && <p>No tournament has been published yet.</p>}
      {!loading && !failure && tournament && (rows ?? []).length === 0 && <p>No results have been posted for this tournament yet.</p>}

      {(rows ?? []).length > 0 && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: "24px" }}>Top Teams</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {(rows ?? []).map((team, index) => (
              <div
                key={team.team_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 24px",
                  background: index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)",
                  boxShadow: index < 3 ? "var(--clay-shadow-elevated)" : "var(--clay-shadow-outer)",
                  borderRadius: "16px",
                  gap: "24px",
                }}
              >
                <div style={{ fontSize: "24px", fontWeight: "600", color: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#b45309" : "var(--text-muted)", width: "40px", textAlign: "center" }}>
                  #{team.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "500", marginBottom: "4px" }}>{team.team_name}</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{team.school_name ?? "Solo entry"}</p>
                </div>
                <div style={{ textAlign: "right", fontSize: "18px", fontWeight: "600", color: "var(--accent)" }}>
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
