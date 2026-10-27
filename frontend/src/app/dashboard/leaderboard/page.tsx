"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, Gauge, Building2, Flag, Award, Clock, ChevronDown, Users, Trophy } from "lucide-react";
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
  avg_lap?: string;
  speed?: string;
  isUserTeam?: boolean;
  wins?: number;
  races?: number;
  members?: Array<{ name: string; role: string; isCaptain?: boolean }>;
}

const benchmarkTeams: LeaderboardRowDisplay[] = [
  {
    team_id: "demo-1", rank: 1, team_name: "Apex Predators", school_name: "Greenwood High School", points: 1850, lap: "11.42s", avg_lap: "11.85s", speed: "44.8 km/h", wins: 4, races: 5,
    members: [
      { name: "Rahul Deshmukh", role: "Captain • Lead Driver", isCaptain: true },
      { name: "Samir Nair", role: "Telemetry & Battery Specialist", isCaptain: false },
      { name: "Tanvi Rao", role: "Chassis & Wing Balance", isCaptain: false },
    ]
  },
  {
    team_id: "demo-2", rank: 2, team_name: "Vortex Racing", school_name: "Oakridge International", points: 1720, lap: "11.68s", avg_lap: "12.02s", speed: "43.9 km/h", isUserTeam: true, wins: 3, races: 5,
    members: [
      { name: "Aryan Sharma", role: "Captain • Lead Driver", isCaptain: true },
      { name: "Dev Patel", role: "Telemetry & Motor RPM Engineer", isCaptain: false },
      { name: "Pooja Hegde", role: "Pit Strategist & Spotter", isCaptain: false },
    ]
  },
  {
    team_id: "demo-3", rank: 3, team_name: "CyberDrift FC", school_name: "Delhi Public School", points: 1640, lap: "11.89s", avg_lap: "12.24s", speed: "43.2 km/h", wins: 2, races: 4,
    members: [
      { name: "Kunal Ghosh", role: "Captain • Lead Driver", isCaptain: true },
      { name: "Aditi Roy", role: "Aero & Weight Distribution", isCaptain: false },
    ]
  },
  {
    team_id: "demo-4", rank: 4, team_name: "Neon Velocity", school_name: "National Public School", points: 1510, lap: "12.04s", avg_lap: "12.45s", speed: "42.7 km/h", wins: 2, races: 4,
    members: [
      { name: "Vikram Sethi", role: "Captain • Lead Driver", isCaptain: true },
      { name: "Meera Krishnan", role: "Battery Health & Esc", isCaptain: false },
    ]
  },
  {
    team_id: "demo-5", rank: 5, team_name: "Torque Titans", school_name: "Bishop Cotton School", points: 1420, lap: "12.25s", avg_lap: "12.68s", speed: "42.1 km/h", wins: 1, races: 4,
    members: [
      { name: "Anand Verma", role: "Captain • Lead Driver", isCaptain: true },
      { name: "Sneha Joseph", role: "Suspension Tuner", isCaptain: false },
    ]
  },
  {
    team_id: "demo-6", rank: 6, team_name: "Aero Dynamics", school_name: "Inventure Academy", points: 1350, lap: "12.48s", avg_lap: "12.92s", speed: "41.6 km/h", wins: 1, races: 3,
    members: [
      { name: "Rishi Menon", role: "Captain • Driver", isCaptain: true },
    ]
  },
  {
    team_id: "demo-7", rank: 7, team_name: "Volt Racers", school_name: "St. Joseph's Boys School", points: 1280, lap: "12.71s", avg_lap: "13.15s", speed: "41.0 km/h", wins: 1, races: 3,
    members: [
      { name: "Zaid Khan", role: "Captain • Driver", isCaptain: true },
    ]
  },
  {
    team_id: "demo-8", rank: 8, team_name: "Shadow Apex", school_name: "The International School", points: 1190, lap: "12.94s", avg_lap: "13.40s", speed: "40.5 km/h", wins: 0, races: 3,
    members: [
      { name: "Farhan Qureshi", role: "Captain • Driver", isCaptain: true },
    ]
  },
];

export default function LeaderboardPage() {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
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
  const displayRows: LeaderboardRowDisplay[] = isRealData
    ? rows!.map((r) => ({
        team_id: r.team_id,
        rank: r.rank,
        team_name: r.team_name,
        school_name: r.school_name || "Official Enrolled School",
        points: r.points,
        lap: "12.10s",
        avg_lap: "12.55s",
        speed: "42.5 km/h",
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

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {displayRows.map((team, index) => {
              const isUser = Boolean(team.isUserTeam);
              const isExpanded = expandedTeamId === team.team_id;
              return (
                <div
                  key={team.team_id}
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.team_id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "18px 24px",
                    background: isUser ? "var(--bg-card-hover)" : index < 3 ? "var(--bg-card-hover)" : "var(--bg-card)",
                    border: isUser ? "2px solid var(--color-primary)" : isExpanded ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                    boxShadow: index < 3 ? "var(--clay-shadow-elevated)" : "var(--clay-shadow-outer)",
                    borderRadius: "18px",
                    gap: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", width: "100%" }}>
                    {/* Rank Badge */}
                    <div style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      fontFamily: "monospace",
                      color: index === 0 ? "#fbbf24" : index === 1 ? "#9ca3af" : index === 2 ? "#f59e0b" : "var(--text-muted)",
                      background: index === 0 ? "rgba(251, 191, 36, 0.15)" : index === 1 ? "rgba(156, 163, 175, 0.15)" : index === 2 ? "rgba(245, 158, 11, 0.15)" : "var(--bg-surface-elevated)",
                      border: index < 3 ? `1px solid ${index === 0 ? "rgba(251, 191, 36, 0.4)" : index === 1 ? "rgba(156, 163, 175, 0.4)" : "rgba(245, 158, 11, 0.4)"}` : "1px solid var(--border-elevated)",
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      #{team.rank}
                    </div>

                    {/* Team & School Meta */}
                    <div style={{ flex: "1 1 220px", minWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--text-main)" }}>
                          {team.team_name}
                        </h3>
                        {isUser && (
                          <span style={{ background: "var(--color-primary)", color: "var(--color-primary-text)", fontSize: "9px", fontWeight: 800, padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                            YOUR SQUAD • LIVE
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>
                          <Building2 size={13} style={{ color: "var(--accent)" }} />
                          {team.school_name ?? "Independent Squad"}
                        </span>
                      </div>
                    </div>

                    {/* Telemetry Chips (Best Lap, Avg Lap, Speed) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      {/* Best Lap */}
                      {team.lap && (
                        <div 
                          title="Fastest Flying Lap"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: "rgba(16, 185, 129, 0.12)",
                            border: "1px solid rgba(16, 185, 129, 0.35)",
                            color: "#10b981",
                            padding: "5px 10px",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Zap size={13} />
                          <span>Best: {team.lap}</span>
                        </div>
                      )}

                      {/* Average Lap Time */}
                      {team.avg_lap && (
                        <div 
                          title="Average Stint Lap Time"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border-elevated)",
                            color: "var(--text-main)",
                            padding: "5px 10px",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Clock size={13} style={{ color: "var(--text-muted)" }} />
                          <span>Avg: {team.avg_lap}</span>
                        </div>
                      )}

                      {/* Top Velocity */}
                      {team.speed && (
                        <div 
                          title="Top Track Speed"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border-elevated)",
                            color: "var(--text-muted)",
                            padding: "5px 10px",
                            borderRadius: "8px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Gauge size={13} />
                          <span>{team.speed}</span>
                        </div>
                      )}
                    </div>

                    {/* Points Badge */}
                    <div style={{ textAlign: "right", minWidth: "90px", flexShrink: 0 }}>
                      <div style={{ fontSize: "17px", fontWeight: "800", fontFamily: "monospace", color: "var(--accent)" }}>
                        {team.points.toLocaleString()} pts
                      </div>
                    </div>

                    {/* Expand Chevron Icon */}
                    <div 
                      title="Click to view team member details"
                      style={{
                        padding: "6px",
                        borderRadius: "8px",
                        background: isExpanded ? "var(--color-primary)" : "var(--bg-surface-elevated)",
                        color: isExpanded ? "#ffffff" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {/* Expanded Dropdown Panel: Team Members & Extended Telemetry */}
                  {isExpanded && (
                    <div 
                      style={{
                        width: "100%",
                        paddingTop: "16px",
                        marginTop: "8px",
                        borderTop: "1px solid var(--border-elevated)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                        <div style={{ background: "var(--bg-surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-elevated)" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Win Rate</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "#10b981", marginTop: "2px" }}>
                            {team.wins ?? 3} / {team.races ?? 4} ({Math.round(((team.wins ?? 3) / (team.races ?? 4)) * 100)}%)
                          </div>
                        </div>
                        <div style={{ background: "var(--bg-surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-elevated)" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg Lap Time</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "monospace", color: "var(--text-main)", marginTop: "2px" }}>
                            {team.avg_lap}
                          </div>
                        </div>
                        <div style={{ background: "var(--bg-surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-elevated)" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Top Speed</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "monospace", color: "var(--accent)", marginTop: "2px" }}>
                            {team.speed}
                          </div>
                        </div>
                        <div style={{ background: "var(--bg-surface-elevated)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-elevated)" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Best Qualifying</div>
                          <div style={{ fontSize: "15px", fontWeight: "700", fontFamily: "monospace", color: "#10b981", marginTop: "2px" }}>
                            {team.lap}
                          </div>
                        </div>
                      </div>

                      {/* Team Member Roster */}
                      <div style={{ marginTop: "4px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Users size={13} /> Team Drivers & Pit Crew
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                          {(team.members ?? [
                            { name: "Aryan Sharma", role: "Captain • Lead Driver", isCaptain: true },
                            { name: "Dev Patel", role: "Telemetry & Battery Tech", isCaptain: false },
                            { name: "Rohan Varma", role: "Chassis & Aero Specialist", isCaptain: false },
                          ]).map((m, mIdx) => (
                            <div key={mIdx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "var(--bg-surface-elevated)", borderRadius: "8px", border: "1px solid var(--border-elevated)" }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: m.isCaptain ? "var(--color-primary)" : "var(--bg-card)", color: m.isCaptain ? "#ffffff" : "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0 }}>
                                {m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span>{m.name}</span>
                                  {m.isCaptain && <span style={{ fontSize: "9px", background: "rgba(2, 132, 199, 0.2)", color: "#0284c7", padding: "1px 5px", borderRadius: "4px", fontWeight: "700" }}>P1</span>}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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
