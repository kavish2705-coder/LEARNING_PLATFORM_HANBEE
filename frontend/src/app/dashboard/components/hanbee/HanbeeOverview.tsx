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
import { listTournaments, getStudentLeaderboard, listTournamentTeamRoster, pickActiveTournament } from "../../../../lib/tournamentAdminApi";
import type { StudentLeaderboardRow, TournamentRecord } from "../../../../lib/tournamentAdminApi";
import { fetchScrutineeringQueue } from "../../../../lib/teamFormationApi";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";
import EmptyState from "../ui/EmptyState";
import Shimmer from "../ui/Shimmer";

type RosterDriver = {
  name: string;
  student_id?: string;
  // TODO: backend field — not returned by listTournamentTeamRoster yet; stubbed defensively.
  phone?: string | null;
  // TODO: backend field — not returned by listTournamentTeamRoster yet; stubbed defensively.
  location?: string | null;
  // TODO: backend field — not returned by listTournamentTeamRoster yet; stubbed defensively.
  is_independent?: boolean | null;
  // TODO: backend field — not returned by listTournamentTeamRoster yet; stubbed defensively.
  school_name?: string | null;
};

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
  const { data: profile } = useSessionProfile();
  const [data, setData] = useState<HanbeeData | null>(null);
  const [opsError, setOpsError] = useState("");
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [rows, setRows] = useState<StudentLeaderboardRow[] | null>(null);
  const [roster, setRoster] = useState<Record<string, RosterDriver[]>>({});
  const [standingsError, setStandingsError] = useState("");
  const [scrutineeredTeamIds, setScrutineeredTeamIds] = useState<Set<string> | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [clockBusy, setClockBusy] = useState(false);
  const [clockError, setClockError] = useState("");

  // Separate from fetchStandings: attendance/tasks and tournament
  // standings are independent sections with independent failure modes, and
  // each needs to show "couldn't load" rather than silently becoming "zero."
  const fetchOps = useCallback(async () => {
    setOpsError("");
    try {
      await getAccountProfile();
      const taskQuery = new URLSearchParams({ select: "id,title,priority,status,due_date,done", order: "due_date.asc.nullslast" });
      const [attendance, tasks] = await Promise.all([
        authenticatedSupabaseFetch<AttendanceDay[]>("/rest/v1/rpc/staff_attendance", { method: "POST", body: JSON.stringify({}) }),
        authenticatedSupabaseFetch<StaffTask[]>("/rest/v1/staff_tasks?" + taskQuery.toString()),
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
    } catch (reason) {
      setData(null);
      setOpsError(reason instanceof Error ? reason.message : "Couldn't load your shift and task data.");
    }
  }, []);

  // RLS already allows a staff member to update their own staff_tasks row
  // (staff_id = auth.uid()) -- the gap was purely that My Space rendered
  // status as a read-only badge with no control to actually change it.
  async function updateTaskStatus(taskId: string, status: "todo" | "in_progress" | "done") {
    setUpdatingTaskId(taskId);
    try {
      await authenticatedSupabaseFetch(`/rest/v1/staff_tasks?id=eq.${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status }),
      });
      await fetchOps();
    } catch {
      // fetchOps will leave the previous status visible; no silent fake success.
    } finally {
      setUpdatingTaskId("");
    }
  }

  async function handleClockToggle() {
    setClockBusy(true);
    setClockError("");
    try {
      if (data?.status === "Clocked In") {
        await authenticatedSupabaseFetch("/rest/v1/rpc/clock_out", { method: "POST", body: "{}" });
      } else {
        await authenticatedSupabaseFetch("/rest/v1/rpc/clock_in", { method: "POST", body: "{}" });
      }
      await fetchOps();
    } catch (reason) {
      setClockError(reason instanceof Error ? reason.message : "We couldn't update your clock status.");
    } finally {
      setClockBusy(false);
    }
  }

  const fetchStandings = useCallback(async () => {
    setStandingsError("");
    try {
      const tournaments = await listTournaments();
      const event = pickActiveTournament(tournaments);
      setTournament(event);
      if (event?.id) {
        const [lb, rosterRows, scrutineeringRows] = await Promise.all([
          getStudentLeaderboard(event.id),
          listTournamentTeamRoster(event.id),
          fetchScrutineeringQueue(event.id).catch(() => null),
        ]);
        setRows(lb);
        const grouped: Record<string, RosterDriver[]> = {};
        for (const member of rosterRows) {
          const list = grouped[member.team_id] ?? (grouped[member.team_id] = []);
          // TODO: backend field — listTournamentTeamRoster currently returns only
          // full_name; phone/location/is_independent/school_name are read
          // defensively when (and if) the backend adds them.
          const row = member as unknown as {
            team_id: string;
            student_id: string;
            full_name: string | null;
            phone?: string | null;
            location?: string | null;
            is_independent?: boolean | null;
            school_name?: string | null;
            school?: string | null;
          };
          list.push({
            name: row.full_name ?? "Unnamed driver",
            student_id: row.student_id,
            phone: row.phone ?? null,
            location: row.location ?? null,
            is_independent: row.is_independent ?? null,
            school_name: row.school_name ?? row.school ?? null,
          });
        }
        setRoster(grouped);
        // null (not an empty set) means "scrutineering data unavailable" so
        // the metric can say so instead of showing a false zero.
        setScrutineeredTeamIds(
          scrutineeringRows ? new Set(scrutineeringRows.filter((row) => row.scrutineering_status === "passed").map((row) => row.team_id)) : null,
        );
      } else {
        setRows([]);
        setRoster({});
        setScrutineeredTeamIds(new Set());
      }
    } catch (reason) {
      setRows(null);
      setStandingsError(reason instanceof Error ? reason.message : "Couldn't load tournament standings.");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchOps(), fetchStandings()]);
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [fetchOps, fetchStandings]);

  const toggleExpandTeam = (id: string) => {
    setExpandedTeamId((prev) => (prev === id ? null : id));
  };

  const teamsToDisplay = rows ?? [];
  const totalSquads = teamsToDisplay.length;
  const scrutineeredCount = useMemo(
    () => (scrutineeredTeamIds ? teamsToDisplay.filter((row) => scrutineeredTeamIds.has(row.team_id)).length : null),
    [teamsToDisplay, scrutineeredTeamIds],
  );
  const scrutineeredDrivers = useMemo(
    () =>
      scrutineeredTeamIds
        ? teamsToDisplay.reduce((acc, row) => acc + (scrutineeredTeamIds.has(row.team_id) ? roster[row.team_id]?.length ?? 0 : 0), 0)
        : null,
    [teamsToDisplay, roster, scrutineeredTeamIds],
  );
  const bestAverageLap = useMemo(() => {
    const laps = teamsToDisplay.map((row) => row.average_lap_time_ms).filter((ms): ms is number => ms !== null);
    return laps.length ? formatLapTime(Math.min(...laps)) : "--";
  }, [teamsToDisplay]);
  const firstName = profile?.full_name.trim().split(/\s+/)[0];

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.roleTag}>
            <Radio size={12} />
            Hanbee Staff Operations
          </div>
          <h1 className={styles.pageTitle}>
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className={styles.pageSubtitle}>
            Tournament Control & Team Standings. Real-time synchronization with Student Tournament Track, School Teams & Circuit Telemetry.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/dashboard/leaderboard" className={`${styles.linkBtn} ${styles.primaryLinkBtn}`}>
            <Trophy size={15} />
            Live Student Grid
            <ExternalLink size={13} />
          </Link>
          <Link href={tournament ? `/dashboard/hanbee/scrutineering?tournament=${encodeURIComponent(tournament.id)}` : "/dashboard/hanbee/scrutineering"} className={styles.linkBtn}>
            <Users size={15} />
            Scrutineering Queue
          </Link>
        </div>
      </header>

      {loading ? <Shimmer rows={5} /> : (
        <div className={styles.overviewSections}>
          <section className={styles.dashboardSection}>
            <div className={styles.dashboardSectionHeading}>
              <div>
                <h2>Tournament overview</h2>
                <p>Standings and team performance.</p>
              </div>
              <Trophy size={19} aria-hidden="true" />
            </div>
            {standingsError ? (
              <EmptyState
                icon={<AlertTriangle size={22} />}
                title="Unable to load tournament standings"
                description={standingsError}
                actionLabel="Retry"
                onAction={() => void fetchStandings()}
              />
            ) : !tournament ? (
              <EmptyState
                icon={<Trophy size={22} />}
                title="No tournaments yet"
                description="Tournament standings will appear here once a tournament is scheduled."
              />
            ) : (
            <div className={styles.scoreSectionContent}>
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
                  <span className={styles.metricTitle}>Payment Verified Squads</span>
                  <span className={styles.metricValue}>{totalSquads} Teams</span>
                </div>
              </div>

              <div className={styles.metricBox}>
                <div className={styles.metricIcon} style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
                  <ShieldCheck size={18} />
                </div>
                <div className={styles.metricMeta}>
                  <span className={styles.metricCategory} style={{ color: "#10b981" }}>SCRUTINEERING</span>
                  <span className={styles.metricTitle}>Race-Eligible Drivers</span>
                  <span className={styles.metricValue}>
                    {scrutineeredDrivers === null ? "—" : `${scrutineeredDrivers} Drivers`}
                  </span>
                  {scrutineeredCount !== null && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{scrutineeredCount} of {totalSquads} squads passed</span>
                  )}
                </div>
              </div>

              <div className={styles.metricBox}>
                <div className={styles.metricIcon} style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.3)" }}>
                  <Sparkles size={18} />
                </div>
                <div className={styles.metricMeta}>
                  <span className={styles.metricCategory} style={{ color: "#a855f7" }}>PACE BENCHMARK</span>
                  <span className={styles.metricTitle}>Best Average Lap</span>
                  <span className={styles.metricValue} style={{ color: "#a855f7" }}>{bestAverageLap}</span>
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
                title="No payment-verified entries yet"
                description="Teams appear here once their tournament entry payment is verified. Race-day eligibility is tracked separately under Scrutineering."
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
                                  drivers.map((driver) => {
                                    const name = driver.name;
                                    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
                                    const isIndependent = driver.is_independent === true;
                                    const showPhone = Boolean(driver.phone);
                                    const schoolLocation = [driver.school_name, driver.location].filter(Boolean).join(" · ");
                                    return (
                                      <div key={driver.student_id ?? name} className={styles.driverMiniCard}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <div className={styles.driverAvatar}>{initials}</div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className={styles.driverMiniName}>{name}</div>
                                            {showPhone && (
                                              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                                {driver.phone}
                                              </div>
                                            )}
                                            {isIndependent ? (
                                              <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--accent-subtle-bg)", color: "var(--accent-subtle-text)", border: "1px solid var(--accent-subtle-border)" }}>
                                                Independent
                                              </span>
                                            ) : (
                                              schoolLocation && (
                                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                                  {schoolLocation}
                                                </div>
                                              )
                                            )}
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
            )}
          </section>

          <section className={styles.dashboardSection}>
            <div className={styles.dashboardSectionHeading}>
              <div>
                <h2>Staff operations</h2>
                <p>Your shift, weekly hours, and assigned tasks.</p>
              </div>
              <Clock size={19} aria-hidden="true" />
            </div>
          {opsError ? (
            <EmptyState
              icon={<AlertTriangle size={22} />}
              title="Unable to load your shift and task data"
              description={opsError}
              actionLabel="Retry"
              onAction={() => void fetchOps()}
            />
          ) : (
          <>
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
              <button
                type="button"
                className={styles.linkBtn}
                disabled={clockBusy}
                onClick={() => void handleClockToggle()}
                style={{ marginTop: "auto", justifyContent: "center" }}
              >
                {clockBusy ? "Saving…" : data?.status === "Clocked In" ? "Clock out" : "Clock in"}
              </button>
              {clockError && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{clockError}</div>}
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
                <AlertTriangle size={20} color={scrutineeredCount !== null && totalSquads - scrutineeredCount > 0 ? "#f59e0b" : "#10b981"} />
                Scrutineering Alert
              </div>
              <div style={{ fontSize: 14, color: "var(--text-main)", fontWeight: 500 }}>
                {standingsError
                  ? "Couldn't load scrutineering status."
                  : scrutineeredCount === null
                  ? "No tournament selected yet."
                  : totalSquads - scrutineeredCount > 0
                  ? `${totalSquads - scrutineeredCount} squad${totalSquads - scrutineeredCount === 1 ? "" : "s"} still need inspection.`
                  : totalSquads > 0
                  ? "All payment-verified squads have passed scrutineering."
                  : "No scrutineering alerts right now."}
              </div>
              <Link
                href={tournament ? `/dashboard/hanbee/scrutineering?tournament=${encodeURIComponent(tournament.id)}` : "/dashboard/hanbee/scrutineering"}
                style={{ fontSize: 12, color: "var(--accent-subtle-text)", textDecoration: "none", marginTop: "auto" }}
              >
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
                        <select
                          value={task.status}
                          disabled={updatingTaskId === task.id}
                          onChange={(event) => void updateTaskStatus(task.id, event.target.value as "todo" | "in_progress" | "done")}
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
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Completed</option>
                        </select>
                      </td>
                      <td>{task.dueDate ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
          </>
          )}
          </section>
        </div>
      )}
    </div>
  );
}
