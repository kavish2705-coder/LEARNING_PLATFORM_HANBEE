"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Clock, TrendingUp, CheckCircle, AlertTriangle, Trophy,
  Users, Radio, Activity, Flag, ShieldCheck, ChevronRight,
  ExternalLink, Disc, Eye, ChevronDown, ChevronUp, Wrench,
  Sparkles, CalendarDays
} from "lucide-react";
import styles from "./HanbeeOverview.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";
import { listTournaments, getStudentLeaderboard, listTournamentTeamRoster } from "../../../../lib/tournamentAdminApi";
import type { StudentLeaderboardRow, TournamentRecord } from "../../../../lib/tournamentAdminApi";
import EmptyState from "../ui/EmptyState";
import Shimmer from "../ui/Shimmer";

type AttendanceDay = { work_date: string; status: string; clock_in: string | null; clock_out: string | null; hours: number | null };
type StaffTask = { id: string; title: string; priority: string; status: string; due_date: string | null; done: boolean };

interface HanbeeData {
  status: string;
  hoursWorked: { today: number | null; totalHours: number };
  personalTasks: { id: string; title: string; priority: string; status: string; dueDate: string | null }[];
  needsAttention: { id: string; message: string }[];
}

function formatLapTime(milliseconds: number | null) {
  return milliseconds === null ? "--" : `${(milliseconds / 1000).toFixed(2)}s`;
}

export default function HanbeeOverview() {
  const [activeTab, setActiveTab] = useState<"scores" | "operations">("scores");
  const [data, setData] = useState<HanbeeData | null>(null);
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [rows, setRows] = useState<StudentLeaderboardRow[] | null>(null);
  const [roster, setRoster] = useState<Record<string, string[]>>({});
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      await getAccountProfile();
      const taskQuery = new URLSearchParams({ select: "id,title,priority,status,due_date,done", order: "due_date.asc.nullslast" });
      const [attendance, tasks] = await Promise.all([
        authenticatedSupabaseFetch<AttendanceDay[]>("/rest/v1/rpc/staff_attendance", { method: "POST", body: JSON.stringify({}) }).catch(() => []),
        authenticatedSupabaseFetch<StaffTask[]>("/rest/v1/staff_tasks?" + taskQuery.toString()).catch(() => []),
      ]);
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const today = (attendance || []).find((row) => row.work_date === todayKey);
      const weekRows = (attendance || []).filter((row) => row.work_date <= todayKey);
      const weeklyHours = weekRows.reduce((sum, row) => sum + (row.hours ?? 0), 0);

      const mappedTasks = (tasks || []).map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
      }));

      setData({
        status: today?.clock_in && !today.clock_out ? "Clocked In" : "Off shift",
        hoursWorked: { today: today?.hours ?? null, totalHours: weeklyHours },
        personalTasks: mappedTasks,
        needsAttention: [],
      });
    } catch {
      setData({
        status: "Off shift",
        hoursWorked: { today: null, totalHours: 0 },
        personalTasks: [],
        needsAttention: [],
      });
    }

    try {
      const tournaments = await listTournaments().catch(() => []);
      const event = tournaments.find((item) => item.status === "live") ?? tournaments[0] ?? null;
      setTournament(event);
      if (event?.id) {
        const [lb, rosterRows] = await Promise.all([
          getStudentLeaderboard(event.id).catch(() => []),
          listTournamentTeamRoster(event.id).catch(() => []),
        ]);
        setRows(lb);
        const grouped: Record<string, string[]> = {};
        for (const member of rosterRows) {
          const list = grouped[member.team_id] ?? (grouped[member.team_id] = []);
          list.push(member.full_name ?? "Unnamed driver");
        }
        setRoster(grouped);
      }
    } catch {
      // No tournament data available yet.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      await fetchData();
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [fetchData]);

  const toggleExpandTeam = (id: string) => {
    setExpandedTeamId((prev) => (prev === id ? null : id));
  };

  const teamsToDisplay = rows ?? [];
  const totalSquads = teamsToDisplay.length;
  const totalDrivers = useMemo(
    () => teamsToDisplay.reduce((acc, row) => acc + (roster[row.team_id]?.length ?? 0), 0),
    [teamsToDisplay, roster],
  );
  const bestSessionLap = useMemo(() => {
    const laps = teamsToDisplay.map((row) => row.average_lap_time_ms).filter((ms): ms is number => ms !== null);
    return laps.length ? formatLapTime(Math.min(...laps)) : "--";
  }, [teamsToDisplay]);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.roleTag}>
            <Radio size={12} />
            Hanbee Staff Operations
          </div>
          <h1 className={styles.pageTitle}>
            Tournament Control & Team Standings
          </h1>
          <p className={styles.pageSubtitle}>
            Real-time synchronization with Student Tournament Track, School Teams & Circuit Telemetry.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/dashboard/leaderboard" className={`${styles.linkBtn} ${styles.primaryLinkBtn}`}>
            <Trophy size={15} />
            Live Student Grid
            <ExternalLink size={13} />
          </Link>
          <Link href="/dashboard/hanbee/tournament" className={styles.linkBtn}>
            <Users size={15} />
            Scrutineering Queue
          </Link>
        </div>
      </header>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "scores" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("scores")}
        >
          <Trophy size={16} />
          Tournament Overview & Team Scores
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "operations" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("operations")}
        >
          <Clock size={16} />
          Staff Operations & Tasks
        </button>
      </div>

      {activeTab === "scores" && (
        loading ? (
          <Shimmer rows={5} />
        ) : !tournament ? (
          <EmptyState
            icon={<Trophy size={22} />}
            title="No tournaments yet"
            description="Tournament standings will appear here once a tournament is scheduled."
          />
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className={styles.circuitHero}>
            <div className={styles.circuitTopRow}>
              <div className={styles.circuitTitleGroup}>
                <div className={styles.circuitTitle}>
                  <Flag size={20} color="var(--accent-subtle-text)" />
                  {tournament.title}
                </div>
                <p className={styles.circuitDesc}>
                  {tournament.venue || "Venue not set"}
                </p>
              </div>

              <span className={styles.liveBadge}>
                <Radio size={12} style={{ animation: "pulse 1.5s infinite" }} />
                {tournament.status === "live" ? "LIVE" : tournament.status?.toUpperCase?.() ?? "SCHEDULED"}
              </span>
            </div>

            <div className={styles.circuitMetrics}>
              <div className={styles.metricBox}>
                <div className={styles.metricIcon}>
                  <Users size={18} />
                </div>
                <div className={styles.metricMeta}>
                  <span className={styles.metricCategory}>PARTICIPATION</span>
                  <span className={styles.metricTitle}>Registered Squads</span>
                  <span className={styles.metricValue}>{totalSquads} Teams</span>
                </div>
              </div>

              <div className={styles.metricBox}>
                <div className={styles.metricIcon} style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                  <ShieldCheck size={18} />
                </div>
                <div className={styles.metricMeta}>
                  <span className={styles.metricCategory} style={{ color: "#10b981" }}>SCRUTINEERED</span>
                  <span className={styles.metricTitle}>Active Drivers</span>
                  <span className={styles.metricValue}>{totalDrivers} Drivers</span>
                </div>
              </div>

              <div className={styles.metricBox}>
                <div className={styles.metricIcon} style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.3)" }}>
                  <Sparkles size={18} />
                </div>
                <div className={styles.metricMeta}>
                  <span className={styles.metricCategory} style={{ color: "#a855f7" }}>PACE BENCHMARK</span>
                  <span className={styles.metricTitle}>Session Fast Lap</span>
                  <span className={styles.metricValue} style={{ color: "#a855f7" }}>{bestSessionLap}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableHeaderRow}>
              <div>
                <h2 className={styles.tableTitle}>
                  <Trophy size={18} color="var(--accent-subtle-text)" />
                  Live Team Standings & Telemetry Scores
                </h2>
                <span className={styles.tableSubtitle}>
                  Synchronized with the student dashboard. Click any team to inspect its driver roster.
                </span>
              </div>

              <Link href="/dashboard/hanbee/tournament" className={styles.linkBtn}>
                <Wrench size={14} />
                Publish Results & Verifications
              </Link>
            </div>

            {teamsToDisplay.length === 0 ? (
              <EmptyState
                icon={<Users size={20} />}
                title="No verified teams yet"
                description="Verified teams and their scores will appear here once squads are scrutineered."
              />
            ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>School</th>
                    <th>Roster Size</th>
                    <th>Avg Lap</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamsToDisplay.map((team) => {
                    const isExpanded = expandedTeamId === team.team_id;
                    const rankClass = team.rank === 1 ? styles.rankP1 : team.rank === 2 ? styles.rankP2 : team.rank === 3 ? styles.rankP3 : styles.rankOther;
                    const drivers = roster[team.team_id] ?? [];

                    return (
                      <React.Fragment key={team.team_id}>
                        <tr>
                          <td>
                            <span className={`${styles.rankBadge} ${rankClass}`}>
                              {team.rank === null ? "--" : `P${team.rank}`}
                            </span>
                          </td>
                          <td>
                            <span className={styles.teamNameText}>{team.team_name}</span>
                          </td>
                          <td>
                            <span className={styles.schoolText}>{team.school_name ?? "Solo entry"}</span>
                          </td>
                          <td>
                            <span className={styles.capacityPill}>
                              <Users size={12} />
                              {drivers.length}
                            </span>
                          </td>
                          <td>
                            <span className={styles.lapTimeText}>{formatLapTime(team.average_lap_time_ms)}</span>
                          </td>
                          <td>
                            <span className={styles.pointsText}>{team.points.toLocaleString()} pts</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={styles.expandBtn}
                              onClick={() => toggleExpandTeam(team.team_id)}
                            >
                              <Eye size={13} />
                              {isExpanded ? "Hide Roster" : "Inspect Roster"}
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className={styles.rosterExpandedTr}>
                            <td colSpan={7} className={styles.rosterExpandedRow}>
                              <div className={styles.driversMiniGrid}>
                                {drivers.length > 0 ? (
                                  drivers.map((name) => {
                                    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
                                    return (
                                      <div key={name} className={styles.driverMiniCard}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <div className={styles.driverAvatar}>{initials}</div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className={styles.driverMiniName}>{name}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "8px 0" }}>
                                    No drivers registered to this team yet.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
        )
      )}

      {activeTab === "operations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className={styles.staffOpsRow}>
            <div className={styles.opsCard}>
              <div className={styles.opsHeader}>
                <Clock size={20} color="var(--accent-subtle-text)" />
                Shift Hours Today
              </div>
              <div className={styles.hoursDisplay}>
                <span className={styles.bigHours}>{data?.hoursWorked.today !== null && data?.hoursWorked.today !== undefined ? `${data.hoursWorked.today}h` : "--"}</span>
                <span className={styles.hoursSub}>worked today</span>
              </div>
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                ● Status: {data?.status ?? "Off shift"}
              </div>
            </div>

            <div className={styles.opsCard}>
              <div className={styles.opsHeader}>
                <TrendingUp size={20} color="var(--accent-subtle-text)" />
                Weekly Hours Total
              </div>
              <div className={styles.hoursDisplay}>
                <span className={styles.bigHours}>{data?.hoursWorked.totalHours ?? 0}h</span>
                <span className={styles.hoursSub}>last 7 days</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Logged across tournament and classroom sessions
              </div>
            </div>

            <div className={styles.opsCard}>
              <div className={styles.opsHeader}>
                <AlertTriangle size={20} color={data?.needsAttention.length ? "#f59e0b" : "#10b981"} />
                Scrutineering Alert
              </div>
              <div style={{ fontSize: 14, color: "var(--text-main)", fontWeight: 500 }}>
                {data?.needsAttention[0]?.message ?? "No scrutineering alerts right now."}
              </div>
              <Link href="/dashboard/hanbee/tournament" style={{ fontSize: 12, color: "var(--accent-subtle-text)", textDecoration: "none", marginTop: "auto" }}>
                Open Inspection Queue →
              </Link>
            </div>
          </div>

          <div className={styles.tableCard}>
            <div className={styles.tableHeaderRow}>
              <div>
                <h2 className={styles.tableTitle}>
                  <CheckCircle size={18} color="var(--accent-subtle-text)" />
                  Assigned Staff Tasks & Queue
                </h2>
                <span className={styles.tableSubtitle}>
                  Scrutineering verifications, quiz audits, and school approvals.
                </span>
              </div>
            </div>

            {(data?.personalTasks.length ?? 0) === 0 ? (
              <EmptyState
                icon={<CheckCircle size={20} />}
                title="No tasks assigned"
                description="Tasks assigned to you will show up here."
              />
            ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.personalTasks || []).map((task) => (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 600 }}>{task.title}</td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            textTransform: "uppercase",
                            background: task.priority === "high" ? "rgba(239, 68, 68, 0.15)" : "rgba(125, 211, 232, 0.15)",
                            color: task.priority === "high" ? "#ef4444" : "var(--accent-subtle-text)",
                            border: task.priority === "high" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(125, 211, 232, 0.3)",
                          }}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            textTransform: "uppercase",
                            background: task.status === "done" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: task.status === "done" ? "#10b981" : "#f59e0b",
                            border: task.status === "done" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          {task.status === "done" ? "Completed" : task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{task.dueDate ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
