"use client";

import { useQuery } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { getLeaderboard, listTournaments } from "../../../lib/tournamentAdminApi";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

interface LeaderboardRowDisplay {
  team_id: string;
  rank: number;
  team_name: string;
  school_name?: string | null;
  points: number;
  lap?: string;
  speed?: string;
  isUserTeam?: boolean;
}

const benchmarkTeams: LeaderboardRowDisplay[] = [
  { team_id: "demo-1", rank: 1, team_name: "Apex Predators", school_name: "Greenwood High", points: 1850, lap: "11.42s", speed: "44.8 km/h" },
  { team_id: "demo-2", rank: 2, team_name: "Vortex Racing", school_name: "Oakridge International", points: 1720, lap: "11.68s", speed: "43.9 km/h", isUserTeam: true },
  { team_id: "demo-3", rank: 3, team_name: "CyberDrift FC", school_name: "Delhi Public School", points: 1640, lap: "11.89s", speed: "43.2 km/h" },
  { team_id: "demo-4", rank: 4, team_name: "Neon Velocity", school_name: "National Public School", points: 1510, lap: "12.04s", speed: "42.7 km/h" },
  { team_id: "demo-5", rank: 5, team_name: "Torque Titans", school_name: "Bishop Cotton", points: 1420, lap: "12.25s", speed: "42.1 km/h" },
  { team_id: "demo-6", rank: 6, team_name: "Aero Dynamics", school_name: "Inventure Academy", points: 1350, lap: "12.48s", speed: "41.6 km/h" },
  { team_id: "demo-7", rank: 7, team_name: "Volt Racers", school_name: "St. Joseph's Boys", points: 1280, lap: "12.71s", speed: "41.0 km/h" },
  { team_id: "demo-8", rank: 8, team_name: "Shadow Apex", school_name: "The International School", points: 1190, lap: "12.94s", speed: "40.5 km/h" },
];

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

  // Real data check: if the database returns real leaderboard records, use ONLY real data.
  const isRealData = Boolean(rows && rows.length > 0);
  const isSimulated = !loading && !failure && !isRealData;
  const displayRows: LeaderboardRowDisplay[] = isRealData
    ? rows!.map((r) => ({
        team_id: r.team_id,
        rank: r.rank,
        team_name: r.team_name,
        school_name: r.school_name,
        points: r.points,
      }))
    : benchmarkTeams;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>
          {tournament ? tournament.title : "RC Cup Championship Standings & Telemetry"}
        </p>
      </div>

      <MyRank />

      {failure && <p role="alert">{failure instanceof Error ? failure.message : "We couldn't load the leaderboard."}</p>}
      {loading && <Shimmer rows={5} />}

      {!loading && !failure && displayRows.length > 0 && (
        <div className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              {isRealData ? "Official Standings" : "Active Tournament Grid"}
            </h2>
            <span style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "monospace", fontWeight: 700 }}>
              {isRealData ? "Live Verified Standings" : "Live Telemetry & Standings"}
            </span>
          </div>

          {/* Benchmark Banner - ONLY shown when database has no tournament records yet */}
          {isSimulated && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(8, 145, 178, 0.08)",
              border: "1px solid rgba(125, 211, 232, 0.25)",
              borderRadius: "14px",
              padding: "10px 16px",
              marginBottom: "20px",
              fontSize: "12px",
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}>
              <span style={{
                background: "rgba(8, 145, 178, 0.22)",
                color: "#7dd3e8",
                padding: "3px 8px",
                borderRadius: "6px",
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: "10px",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
              }}>
                SIMULATED BENCHMARK GRID
              </span>
              <span style={{ flex: 1, minWidth: "200px", lineHeight: "1.4" }}>
                AI benchmark squads displayed for telemetry testing. Live database results will automatically replace this grid once tournaments are posted.
              </span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {displayRows.map((team, index) => {
              const isUser = Boolean(team.isUserTeam);
              return (
                <div
                  key={team.team_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px 24px",
                    background: isUser ? "var(--bg-card-hover)" : index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)",
                    border: isUser ? "2px solid var(--color-primary)" : "1px solid var(--border-subtle)",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>{team.team_name}</h3>
                      {isUser ? (
                        <span style={{ background: "var(--color-primary)", color: "var(--color-primary-text)", fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                          YOUR SQUAD • LIVE
                        </span>
                      ) : isSimulated ? (
                        <span style={{ background: "rgba(255, 255, 255, 0.08)", color: "var(--text-muted)", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                          BENCHMARK SIM
                        </span>
                      ) : (
                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                          OFFICIAL ENTRY
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "3px 0 0" }}>
                      {team.school_name ?? "Solo entry"}
                    </p>
                  </div>
                  {team.lap && (
                    <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "12px", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "8px" }}>
                      {team.lap}
                    </div>
                  )}
                  {team.speed && (
                    <div style={{ textAlign: "center", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                      {team.speed}
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
      <span className={styles.metricTitle}>Your team in {row.tournament_title}</span>
      <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>{row.team_name}: #{row.rank} of {row.field_size}</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 6 }}>{row.points} points</p>
    </div>
  );
}
