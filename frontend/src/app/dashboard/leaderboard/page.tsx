"use client";

import { useQuery } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { getLeaderboard, listTournaments } from "../../../lib/tournamentAdminApi";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import { useUserXp } from "../../../lib/hooks/useUserXp";

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

  const { xp } = useUserXp();
  const loading = loadingTournaments || isLoading;
  const failure = tournamentError ?? error;

  // Active Tournament Grid Demo Teams & Metrics
  const demoTeams = [
    { rank: 1, team_name: "Team Redline Apex", school_name: "St. Xavier Tech", car: "Redline RC Buggy (4WD)", lap: "11.42s", speed: "26.8 km/h", points: 1850 },
    { rank: 2, team_name: "CyberDrift FC", school_name: "Modern Academy", car: "Blue Thunder RC 16X", lap: "11.89s", speed: "25.4 km/h", points: 1620 },
    { rank: 3, team_name: "TorqueCraft Racing", school_name: "DPS Engineering", car: "Turbo Racer Buggy", lap: "12.15s", speed: "24.6 km/h", points: 1490 },
    { rank: 4, team_name: "Vortex Racing", school_name: "Delhi Tech Academy", car: "Thunder RC 4WD Buggy", lap: "12.84s", speed: "23.9 km/h", points: xp, isUserTeam: true },
    { rank: 5, team_name: "Neon Drift Squad", school_name: "Greenwood High", car: "Neon Cruiser 4WD", lap: "13.05s", speed: "23.2 km/h", points: 1340 },
    { rank: 6, team_name: "Falcon Aero RC", school_name: "National Public School", car: "Aero Storm Buggy", lap: "13.22s", speed: "22.8 km/h", points: 1280 },
    { rank: 7, team_name: "HyperSpark Racing", school_name: "Oakridge Tech", car: "Spark Runner 1:16", lap: "13.58s", speed: "22.1 km/h", points: 1190 },
    { rank: 8, team_name: "Apex Predators", school_name: "Bishop Cotton", car: "Predator RC 4x4", lap: "13.91s", speed: "21.5 km/h", points: 1050 },
  ].sort((a, b) => b.points - a.points).map((t, idx) => ({ ...t, rank: idx + 1 }));

  const displayRows = (rows ?? []).length > 0 ? rows! : demoTeams;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>{tournament ? tournament.title : "RC Cup Championship Standings & Telemetry"}</p>
      </div>

      <MyRank />

      {failure && <p role="alert">{failure instanceof Error ? failure.message : "We couldn't load the leaderboard."}</p>}
      {loading && <Shimmer rows={5} />}

      {!loading && !failure && displayRows.length > 0 && (
        <div className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Active Tournament Grid</h2>
            <span style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "monospace", fontWeight: 700 }}>
              Live Telemetry & Standings
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {displayRows.map((team, index) => {
              const isUser = "isUserTeam" in team && team.isUserTeam;
              return (
                <div
                  key={"team_id" in team ? team.team_id : team.team_name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px 24px",
                    background: isUser ? "var(--bg-card-hover)" : index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)",
                    border: isUser ? "2px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                    boxShadow: index < 3 ? "var(--clay-shadow-elevated)" : "var(--clay-shadow-outer)",
                    borderRadius: "16px",
                    gap: "20px",
                  }}
                >
                  <div style={{ fontSize: "22px", fontWeight: "700", fontFamily: "monospace", color: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#b45309" : "var(--text-muted)", width: "40px", textAlign: "center" }}>
                    #{team.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>{team.team_name}</h3>
                      {isUser && (
                        <span style={{ background: "var(--color-primary)", color: "var(--color-primary-text)", fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                          YOUR SQUAD
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "3px 0 0" }}>
                      {team.school_name ?? "Solo entry"}
                      {"car" in team && ` • ${(team as typeof demoTeams[0]).car}`}
                    </p>
                  </div>
                  {"lap" in team && (
                    <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "12px", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>
                      {(team as typeof demoTeams[0]).lap}
                    </div>
                  )}
                  {"speed" in team && (
                    <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                      {(team as typeof demoTeams[0]).speed}
                    </div>
                  )}
                  <div style={{ textAlign: "right", fontSize: "16px", fontWeight: "700", fontFamily: "monospace", color: "var(--accent)" }}>
                    {team.points.toLocaleString()} pts
                  </div>
                </div>
              );
            })}
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
