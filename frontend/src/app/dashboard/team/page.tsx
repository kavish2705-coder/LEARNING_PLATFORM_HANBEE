"use client";

import { FormEvent, useCallback, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Trophy, Flag, ShieldCheck, Clock, Zap, 
  Flame, Award, CheckCircle2, AlertCircle, 
  Plus, UserPlus, Play, RotateCw, Sparkles, ChevronRight,
  Gauge, Activity, Compass, Disc, Wrench
} from "lucide-react";
import styles from "./team.module.css";
import {
  answerTeamInvitation,
  applyStudentTeam,
  createSoloTournamentEntry,
  fetchMySoloStatus,
  fetchMyTeamFormation,
  fetchUpcomingTournament,
  inviteStudentToTeam,
  leaveStudentTeam,
  startStudentTeam,
  submitStudentTeam,
  type MyTeamFormation,
  type UpcomingTournament,
} from "../../../lib/teamFormationApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";

// Maximum and Minimum members allowed in a team per company guidelines
const MAX_TEAM_SIZE = 5;
const MIN_TEAM_SIZE = 1;

interface DriverTelemetry {
  student_id: string;
  name: string;
  role: string;
  is_captain: boolean;
  is_self: boolean;
  bestLap: string;
  avgLap: string;
  totalLaps: number;
  topSpeed: string;
  consistency: string;
  status: "Ready" | "On Track" | "Pits";
  laps: {
    lapNumber: number;
    s1: string;
    s2: string;
    s3: string;
    total: string;
    isFastest?: boolean;
  }[];
}

export default function MyTeamPage() {
  const { data: profile } = useSessionProfile();
  const { xp, addXpTask } = useUserXp();

  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [formation, setFormation] = useState<MyTeamFormation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [isSolo, setIsSolo] = useState(false);
  const [paymentDeclared, setPaymentDeclared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState<"roster" | "laps" | "formation">("roster");
  const [isSimulatingLap, setIsSimulatingLap] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Load team data from backend
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [upcoming, solo] = await Promise.all([fetchUpcomingTournament(), fetchMySoloStatus()]);
      setTournament(upcoming);
      setIsSolo(solo);
      setFormation(upcoming ? await fetchMyTeamFormation(upcoming.id) : null);
    } catch (loadError) {
      // In development or demo, let the page load with mock squad data
      setError(loadError instanceof Error ? loadError.message : "Couldn't load your team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The team update was refused.");
    } finally {
      setBusy(false);
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;
    await runAction(() => startStudentTeam(tournament.id, teamName), "Team created successfully.");
    setTeamName("");
  }

  async function inviteClassmate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = formation?.my_team;
    if (!team || !inviteeId) return;
    await runAction(() => inviteStudentToTeam(team.id, inviteeId), "Invitation sent.");
    setInviteeId("");
  }

  // Current user's name
  const currentUserName = profile?.full_name || "Kavish Sharma";
  const currentUserId = profile?.id || "self-id";

  // Build driver telemetry roster merging backend or realistic squad fallback
  const fallbackMembers: DriverTelemetry[] = useMemo(() => {
    const rawMembers = formation?.my_team?.members ?? [];
    
    // If backend has actual members, map them
    if (rawMembers.length > 0) {
      return rawMembers.map((m, idx) => {
        const isSelf = m.student_id === currentUserId || m.name === currentUserName;
        return {
          student_id: m.student_id,
          name: m.name,
          role: m.is_captain ? "Lead Driver / Captain" : idx === 1 ? "Telemetry Strategist" : idx === 2 ? "Motor & Trim Specialist" : idx === 3 ? "Pit Strategist" : "Reserve Driver",
          is_captain: m.is_captain,
          is_self: isSelf,
          bestLap: isSelf ? "13.42s" : `${(13.5 + idx * 0.35).toFixed(2)}s`,
          avgLap: `${(14.1 + idx * 0.4).toFixed(2)}s`,
          totalLaps: 22 - idx * 3,
          topSpeed: `${(43.5 - idx * 1.2).toFixed(1)} km/h`,
          consistency: `${(96 - idx * 2.5).toFixed(1)}%`,
          status: idx === 0 ? "On Track" : "Ready",
          laps: [
            { lapNumber: 1, s1: "4.30s", s2: "5.25s", s3: "4.15s", total: "13.70s" },
            { lapNumber: 2, s1: "4.24s", s2: "5.19s", s3: "4.08s", total: "13.51s" },
            { lapNumber: 3, s1: "4.21s", s2: "5.18s", s3: "4.03s", total: isSelf ? "13.42s" : "13.65s", isFastest: isSelf },
            { lapNumber: 4, s1: "4.28s", s2: "5.24s", s3: "4.12s", total: "13.64s" },
          ],
        };
      });
    }

    // Default rich fallback squad for interactive demo
    return [
      {
        student_id: "self",
        name: currentUserName,
        role: "Team Captain",
        is_captain: true,
        is_self: true,
        bestLap: "13.42s",
        avgLap: "13.85s",
        totalLaps: 28,
        topSpeed: "44.2 km/h",
        consistency: "96.4%",
        status: "Ready",
        laps: [
          { lapNumber: 1, s1: "4.29s", s2: "5.21s", s3: "4.12s", total: "13.62s" },
          { lapNumber: 2, s1: "4.23s", s2: "5.18s", s3: "4.05s", total: "13.46s" },
          { lapNumber: 3, s1: "4.21s", s2: "5.18s", s3: "4.03s", total: "13.42s", isFastest: true },
          { lapNumber: 4, s1: "4.26s", s2: "5.20s", s3: "4.08s", total: "13.54s" },
        ],
      },
      {
        student_id: "m2",
        name: "Rohan Varma",
        role: "Driver",
        is_captain: false,
        is_self: false,
        bestLap: "13.76s",
        avgLap: "14.12s",
        totalLaps: 24,
        topSpeed: "42.8 km/h",
        consistency: "94.8%",
        status: "Ready",
        laps: [
          { lapNumber: 1, s1: "4.36s", s2: "5.32s", s3: "4.20s", total: "13.88s" },
          { lapNumber: 2, s1: "4.31s", s2: "5.26s", s3: "4.19s", total: "13.76s" },
          { lapNumber: 3, s1: "4.35s", s2: "5.30s", s3: "4.22s", total: "13.87s" },
        ],
      },
      {
        student_id: "m3",
        name: "Aarav Patel",
        role: "Driver",
        is_captain: false,
        is_self: false,
        bestLap: "14.05s",
        avgLap: "14.42s",
        totalLaps: 20,
        topSpeed: "41.6 km/h",
        consistency: "93.1%",
        status: "Ready",
        laps: [
          { lapNumber: 1, s1: "4.44s", s2: "5.41s", s3: "4.30s", total: "14.15s" },
          { lapNumber: 2, s1: "4.40s", s2: "5.38s", s3: "4.27s", total: "14.05s" },
        ],
      },
      {
        student_id: "m4",
        name: "Priya Sharma",
        role: "Driver",
        is_captain: false,
        is_self: false,
        bestLap: "14.32s",
        avgLap: "14.70s",
        totalLaps: 18,
        topSpeed: "40.9 km/h",
        consistency: "92.0%",
        status: "Ready",
        laps: [
          { lapNumber: 1, s1: "4.52s", s2: "5.48s", s3: "4.38s", total: "14.38s" },
          { lapNumber: 2, s1: "4.49s", s2: "5.45s", s3: "4.38s", total: "14.32s" },
        ],
      },
    ];
  }, [formation, currentUserId, currentUserName]);

  const [drivers, setDrivers] = useState<DriverTelemetry[]>(fallbackMembers);

  useEffect(() => {
    setDrivers(fallbackMembers);
  }, [fallbackMembers]);

  // Current active squad details
  const team = formation?.my_team;
  const isTeamActive = Boolean(team) || drivers.length > 0;
  const teamDisplayName = team?.name || "Team Redline Apex";
  const teamStatus = team?.status || "verified";
  const memberCount = team?.members.length || drivers.length;
  const isCaptain = team ? team.is_captain : true;

  // Simulate Practice Hot Lap for current user only
  const handleSimulateHotLap = () => {
    if (isSimulatingLap) return;
    setIsSimulatingLap(true);
    setSimMessage("🏎️ Transponder active! Accelerating out of pit lane into flying lap...");

    setTimeout(() => {
      setSimMessage("⚡ Sector 1: 4.19s (-0.02s purple delta)");
    }, 1000);

    setTimeout(() => {
      setSimMessage("⚡ Sector 2: 5.15s (Optimal apex speed 44.8 km/h)");
    }, 2000);

    setTimeout(() => {
      const newLapTime = "13.34s";
      setSimMessage(`🏁 Flying Lap Complete: ${newLapTime}! NEW PERSONAL BEST · +25 RP Earned!`);
      
      // Update logged in student's stats
      setDrivers((prev) =>
        prev.map((d) => {
          if (!d.is_self) return d;
          return {
            ...d,
            bestLap: newLapTime,
            totalLaps: d.totalLaps + 1,
            topSpeed: "44.8 km/h",
            laps: [
              ...d.laps,
              {
                lapNumber: d.laps.length + 1,
                s1: "4.19s",
                s2: "5.15s",
                s3: "4.00s",
                total: newLapTime,
                isFastest: true,
              },
            ],
          };
        })
      );

      // Award XP
      addXpTask("practice_hot_lap", 25);
      setIsSimulatingLap(false);
    }, 3200);
  };

  const selfDriver = drivers.find((d) => d.is_self) || drivers[0];

  return (
    <div className={styles.teamPage}>
      {/* Hero Team Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <h1 className={styles.teamName}>
            {teamDisplayName}
            {isCaptain && <span className={styles.badgeCaptain}>Captain</span>}
          </h1>
          <p className={styles.teamSubtitle}>
            St. Xavier Tech • {memberCount} Registered Drivers
          </p>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.pointsPill}>
            <span className={styles.pointsLabel}>Team Points</span>
            <span className={styles.pointsValue}>1,850 pts</span>
          </div>
        </div>
      </div>

      {/* Notice / Status Banners */}
      {notice && (
        <div className={`${styles.noticeAlert} ${styles.noticeAlertSuccess}`}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className={`${styles.noticeAlert} ${styles.noticeAlertError}`}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIconBox}>
            <Clock size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Team Avg Lap</span>
            <span className={styles.metricVal}>14.28s</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.3)" }}>
            <Award size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Session Fast Lap</span>
            <span className={styles.metricVal} style={{ color: "#a855f7" }}>{selfDriver.bestLap}</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", borderColor: "rgba(56, 189, 248, 0.3)" }}>
            <Disc size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Practice Laps</span>
            <span className={styles.metricVal}>68 Laps</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <Activity size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Consistency</span>
            <span className={styles.metricVal}>95.4%</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "roster" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("roster")}
        >
          <Users size={15} />
          Driver Roster ({memberCount})
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "laps" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("laps")}
        >
          <Clock size={15} />
          Timing Board
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "formation" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("formation")}
        >
          <UserPlus size={15} />
          Squad Formation
        </button>
      </div>

      {/* TAB 1: Driver Roster */}
      {activeTab === "roster" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Drivers Grid */}
          <div className={styles.rosterGrid}>
            {drivers.map((driver) => {
              const initial = driver.name.charAt(0).toUpperCase();
              return (
                <div
                  key={driver.student_id}
                  className={`${styles.driverCard} ${driver.is_self ? styles.driverCardSelf : ""}`}
                >
                  <div className={styles.driverHeader}>
                    <div className={styles.driverProfile}>
                      <div className={`${styles.driverAvatar} ${driver.is_self ? styles.driverAvatarSelf : ""}`}>
                        {initial}
                      </div>
                      <div className={styles.driverNameRow}>
                        <div className={styles.driverName}>
                          <span>{driver.name}</span>
                          {driver.is_self && <span className={styles.badgeYou}>YOU</span>}
                        </div>
                        <span className={styles.driverRole}>{driver.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div className={styles.driverTelemetry}>
                    <div className={styles.telemItem}>
                      <span className={styles.telemKey}>Best Lap</span>
                      <span className={`${styles.telemVal} ${driver.bestLap === selfDriver.bestLap ? styles.fastLapHighlight : ""}`}>
                        {driver.bestLap}
                      </span>
                    </div>

                    <div className={styles.telemItem}>
                      <span className={styles.telemKey}>Average Lap</span>
                      <span className={styles.telemVal}>{driver.avgLap}</span>
                    </div>

                    <div className={styles.telemItem}>
                      <span className={styles.telemKey}>Laps Clocked</span>
                      <span className={styles.telemVal}>{driver.totalLaps} Laps</span>
                    </div>

                    <div className={styles.telemItem}>
                      <span className={styles.telemKey}>Top Velocity</span>
                      <span className={styles.telemVal}>{driver.topSpeed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Personal Practice Lap Logger */}
          <div className={styles.loggerContainer}>
            <div className={styles.loggerHeader}>
              <div className={styles.loggerTitleGroup}>
                <div className={styles.loggerTitle}>
                  <Zap size={18} color="var(--accent-subtle-text)" />
                  Practice Hot Lap
                </div>
                <div className={styles.loggerDesc}>
                  Log simulated practice laps to calibrate throttle response and record lap telemetry.
                </div>
              </div>

              <button
                type="button"
                className={styles.runSimBtn}
                onClick={handleSimulateHotLap}
                disabled={isSimulatingLap}
              >
                {isSimulatingLap ? (
                  <>
                    <RotateCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Run Practice Lap (+25 XP)
                  </>
                )}
              </button>
            </div>

            {simMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "rgba(125, 211, 232, 0.08)",
                  border: "1px solid rgba(125, 211, 232, 0.3)",
                  padding: "12px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "var(--accent-subtle-text)",
                  fontFamily: "monospace",
                }}
              >
                {simMessage}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Lap-by-Lap Timing Board */}
      {activeTab === "laps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className={styles.loggerHeader}>
            <div>
              <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Sector Splits & Timing Board</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Sector timings and delta telemetry recorded across practice sessions.
              </p>
            </div>
          </div>

          <div className={styles.timingTableWrapper}>
            <table className={styles.timingTable}>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Lap</th>
                  <th>Sector 1</th>
                  <th>Sector 2</th>
                  <th>Sector 3</th>
                  <th>Lap Time</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {drivers.flatMap((driver) =>
                  driver.laps.map((lap) => (
                    <tr key={`${driver.student_id}-${lap.lapNumber}`}>
                      <td>
                        <strong style={{ color: driver.is_self ? "var(--accent-subtle-text)" : "inherit" }}>
                          {driver.name}
                        </strong>{" "}
                        {driver.is_self && <span style={{ fontSize: 10, opacity: 0.7 }}>(You)</span>}
                      </td>
                      <td>Lap #{lap.lapNumber}</td>
                      <td>{lap.s1}</td>
                      <td>{lap.s2}</td>
                      <td>{lap.s3}</td>
                      <td className={lap.isFastest ? styles.purpleText : styles.greenText}>
                        {lap.total} {lap.isFastest ? "⚡ FASTEST" : ""}
                      </td>
                      <td>
                        <span style={{ color: lap.isFastest ? "#c084fc" : "#10b981", fontSize: 11 }}>
                          {lap.isFastest ? "-0.18s Purple" : "+0.12s Valid"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Squad Formation & Invitations */}
      {activeTab === "formation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Active Invitations */}
          {formation && formation.invitations.length > 0 && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Pending Team Invitations</h2>
                <p className={styles.formSubtitle}>You have been invited to join an existing school squad.</p>
              </div>

              {formation.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "var(--bg-surface-elevated)",
                    borderRadius: 12,
                    border: "1px solid var(--border-elevated)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 15 }}>{invitation.team_name}</strong>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {invitation.members} / {MAX_TEAM_SIZE} members
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      disabled={busy}
                      onClick={() => void runAction(() => answerTeamInvitation(invitation.id, true), "You joined the team.")}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={busy}
                      onClick={() => void runAction(() => answerTeamInvitation(invitation.id, false), "Invitation declined.")}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Captain Inviting Classmates (Max 5 Limit) */}
          {isCaptain && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Invite Classmates to Squad</h2>
                <p className={styles.formSubtitle}>
                  Current size: {memberCount} of {MAX_TEAM_SIZE} players.{" "}
                  {memberCount < MAX_TEAM_SIZE
                    ? `${MAX_TEAM_SIZE - memberCount} slot${MAX_TEAM_SIZE - memberCount === 1 ? "" : "s"} remaining.`
                    : "Your squad has reached the maximum capacity of 5 students."}
                </p>
              </div>

              {memberCount < MAX_TEAM_SIZE ? (
                <form onSubmit={inviteClassmate} className={styles.inlineForm}>
                  <select
                    id="team-invitee"
                    value={inviteeId}
                    onChange={(e) => setInviteeId(e.target.value)}
                    required
                    disabled={busy}
                    className={styles.textInput}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select a classmate</option>
                    {(formation?.eligible_classmates ?? []).map((student) => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" disabled={busy} className={styles.actionBtn}>
                    {busy ? "Sending Invite..." : "Send Squad Invite"}
                  </button>
                </form>
              ) : (
                <div style={{ color: "#10b981", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  Squad roster is full with 5 drivers. Ready for qualifying!
                </div>
              )}
            </div>
          )}

          {/* Create Squad if not in one and in a school */}
          {!team && formation?.school_id && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Form a New RC Racing Squad</h2>
                <p className={styles.formSubtitle}>
                  Choose a team name. Teams can have 1 to 5 members. You can start solo and invite teammates later.
                </p>
              </div>

              <form onSubmit={createTeam} className={styles.inlineForm}>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Team Vortex Apex, Neon Velocity..."
                  minLength={1}
                  maxLength={40}
                  required
                  disabled={busy}
                  className={styles.textInput}
                />
                <button type="submit" disabled={busy} className={styles.actionBtn}>
                  {busy ? "Creating Squad..." : "Start Squad (1-5 Players)"}
                </button>
              </form>
            </div>
          )}

          {/* Solo Entry if not attached to a school */}
          {!team && !formation?.school_id && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>{isSolo ? "Solo Tournament Entry" : "School Membership Needed"}</h2>
                <p className={styles.formSubtitle}>
                  {isSolo
                    ? "Enter this tournament as a team of one. Your entry will be reviewed by Hanbee staff after you confirm payment."
                    : "Your account is not attached to an active school or marked for solo entry. Contact Hanbee staff to restore your school membership or enable solo participation."}
                </p>
              </div>
              {isSolo && tournament && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy}
                  onClick={() => void runAction(() => createSoloTournamentEntry(tournament.id), "Solo entry created. Confirm payment below to submit it.")}
                >
                  Create Solo Entry
                </button>
              )}
            </div>
          )}

          {/* Submission and Approval Actions for School Teams */}
          {team && isCaptain && team.status === "draft" && formation?.school_id && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Submit Squad for School Staff Approval</h2>
                <p className={styles.formSubtitle}>
                  Teams with 1 to 5 players are eligible for official submission.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy || memberCount < MIN_TEAM_SIZE || memberCount > MAX_TEAM_SIZE}
                  onClick={() => void runAction(() => submitStudentTeam(team.id), "Squad submitted to school staff for verification.")}
                >
                  Submit Team for Verification ({memberCount}/{MAX_TEAM_SIZE} Players)
                </button>

                <button
                  type="button"
                  className={styles.dangerBtn}
                  disabled={busy}
                  onClick={() => void runAction(() => leaveStudentTeam(team.id), "You left the team.")}
                >
                  Leave Squad
                </button>
              </div>
            </div>
          )}

          {/* Solo entry: payment confirmation instead of school-staff submission */}
          {team && isCaptain && team.status === "draft" && !formation?.school_id && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Confirm Tournament Payment</h2>
                <p className={styles.formSubtitle}>
                  Confirm payment for your solo tournament entry. Hanbee staff will verify the entry after submission.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={paymentDeclared}
                    onChange={(e) => setPaymentDeclared(e.target.checked)}
                  />
                  I have completed the tournament payment.
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={busy || !paymentDeclared}
                    onClick={() => void runAction(() => applyStudentTeam(team.id, true), "Payment declared. Your solo entry is waiting for Hanbee review.")}
                  >
                    Submit Paid Solo Entry
                  </button>
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    disabled={busy}
                    onClick={() => void runAction(() => leaveStudentTeam(team.id), "You left the team.")}
                  >
                    Leave Team
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
