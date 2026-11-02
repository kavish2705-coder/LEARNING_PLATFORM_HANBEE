"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, CalendarDays, MapPin, Users, Zap, 
  Radio, CheckCircle2, RotateCw, Award, Sparkles, 
  ChevronRight, Flag, Activity, Cpu, 
  Layers, Compass, Disc, Gamepad2, BatteryCharging, Wrench, IdCard
} from "lucide-react";
import Link from "next/link";
import styles from "./TournamentOverview.module.css";
import EmptyState from "./ui/EmptyState";
import Shimmer from "./ui/Shimmer";
import { fetchUpcomingTournament, fetchMyTeamFormation, fetchMySchool, type MyTeamFormation, type UpcomingTournament } from "../../../lib/teamFormationApi";
import { getStudentLeaderboard, type StudentLeaderboardRow } from "../../../lib/tournamentAdminApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";

export default function TournamentOverview() {
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [schoolName, setSchoolName] = useState("");
  const [teamHref, setTeamHref] = useState("/dashboard/team");
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: profile, isLoading: profileLoading } = useSessionProfile();

  // Centralized Live XP Points (Deterministic & Capped)
  const { xp, addXpTask, removeXpTask } = useUserXp();
  const [claimedBounties, setClaimedBounties] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hanbee_claimed_bounties");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Manual RC Car Hardware Inspection Checklist (Wheels, Car body, Motor, wiring, Remote controller condition, Battery)
  const inspectionItems = [
    {
      id: "wheels",
      name: "Wheels",
      hint: "All 4 wheels turn smoothly and aren't loose",
      icon: Disc,
    },
    {
      id: "body",
      name: "Car Body",
      hint: "Plastic shell is clicked on and bumper is safe",
      icon: Layers,
    },
    {
      id: "motor",
      name: "Motor",
      hint: "Toy motor spins without getting stuck",
      icon: Cpu,
    },
    {
      id: "wiring",
      name: "Wiring",
      hint: "All wires connected and neatly plugged in",
      icon: Activity,
    },
    {
      id: "remote",
      name: "Remote Controller",
      hint: "Power switch on, steering and forward/reverse working",
      icon: Gamepad2,
    },
    {
      id: "battery",
      name: "Battery",
      hint: "Rechargeable battery is plugged in and charged",
      icon: BatteryCharging,
    },
  ];

  const [inspectionStatus, setInspectionStatus] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hanbee_rc_inspection");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      wheels: true,
      body: true,
      motor: true,
      wiring: false,
      remote: false,
      battery: false,
    };
  });

  const [leaderboardRows, setLeaderboardRows] = useState<StudentLeaderboardRow[]>([]);

  // Dynamic Countdown to Next Tournament
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!tournament) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    const startsAt = tournament.starts_at;
    function calculateTimeLeft() {
      const targetTime = new Date(startsAt).getTime();
      const diff = Math.max(0, targetTime - Date.now());
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    }
    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [tournament?.starts_at]);

  useEffect(() => {
    if (profileLoading) return;
    let active = true;
    async function loadOverview() {
      try {
        const [event, schoolInfo] = await Promise.all([
          fetchUpcomingTournament(),
          fetchMySchool(),
        ]);
        if (!active) return;
        setTournament(event);
        if (schoolInfo?.name) setSchoolName(schoolInfo.name);
        if (profile?.role === "student") setCanManageTeam(true);
        if (profile?.role === "school_staff") {
          setTeamHref("/dashboard/school/teams");
          setCanManageTeam(true);
        }
        if (event && profile?.role === "student") {
          const formation = await fetchMyTeamFormation(event.id);
          if (active) setTeam(formation.my_team);
        }
        if (event) {
          try {
            const rows = await getStudentLeaderboard(event.id);
            if (active && Array.isArray(rows)) setLeaderboardRows(rows);
          } catch {
            // Leaderboard not available yet (e.g. no verified entries) -- the
            // empty-state below handles this; nothing fabricated as a stand-in.
          }
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournament information.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadOverview();
    return () => { active = false; };
  }, [profileLoading, profile?.role]);


  const handleClaimBounty = (id: string, points: number, title: string) => {
    if (claimedBounties[id]) return;
    const updated = { ...claimedBounties, [id]: true };
    setClaimedBounties(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_claimed_bounties", JSON.stringify(updated));
      } catch {}
    }
    addXpTask(id, points, title);
    setToastMessage(`🎉 Bounty Claimed: +${points} XP for "${title}"!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleInspection = (id: string, name: string) => {
    const current = !!inspectionStatus[id];
    const next = !current;
    const updated = { ...inspectionStatus, [id]: next };
    setInspectionStatus(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_rc_inspection", JSON.stringify(updated));
      } catch {}
    }

    if (next) {
      addXpTask(`insp_${id}`, 15, `${name}: Good Condition`);
      const passed = Object.values(updated).filter(Boolean).length;
      if (passed === 6) {
        setToastMessage(`🏎️ Practice checklist 100% complete! (+50 XP)`);
        addXpTask("insp_all_bonus", 50, "Practice Checklist Complete");
      } else {
        setToastMessage(`✓ ${name}: Passed / Good Condition (+15 XP)`);
      }
    } else {
      removeXpTask(`insp_${id}`);
      removeXpTask("insp_all_bonus");
      setToastMessage(`Marked ${name} as pending re-inspection.`);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleMarkAllInspected = () => {
    const allPassed: Record<string, boolean> = {
      wheels: true,
      body: true,
      motor: true,
      wiring: true,
      remote: true,
      battery: true,
    };
    setInspectionStatus(allPassed);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_rc_inspection", JSON.stringify(allPassed));
      } catch {}
    }
    Object.keys(allPassed).forEach((key) => {
      addXpTask(`insp_${key}`, 15, `${key}: Passed`);
    });
    addXpTask("insp_all_bonus", 50, "Practice Checklist Complete");
    setToastMessage(`🎉 All 6 items checked on your practice checklist (+50 XP)`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResetInspection = () => {
    const reset: Record<string, boolean> = {
      wheels: false,
      body: false,
      motor: false,
      wiring: false,
      remote: false,
      battery: false,
    };
    setInspectionStatus(reset);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_rc_inspection", JSON.stringify(reset));
      } catch {}
    }
    Object.keys(reset).forEach((key) => {
      removeXpTask(`insp_${key}`);
    });
    removeXpTask("insp_all_bonus");
    setToastMessage(`Inspection reset: Ready for a new pre-race hardware check.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const passedCount = inspectionItems.filter((i) => inspectionStatus[i.id]).length;
  const readinessScore = Math.round((passedCount / inspectionItems.length) * 100);


  // Real standings only -- no invented opponents or placeholder stats.
  // Entries without a submitted rank (rank === null) sort last, per the
  // get_student_leaderboard RPC's own ordering.
  const allRankedTeams = leaderboardRows.map((row) => ({
    id: row.team_id,
    name: row.team_name,
    school: row.school_name ?? "Solo entry",
    points: row.points,
    rank: row.rank,
    avgLapMs: row.average_lap_time_ms,
    races: row.matches_participated,
    isUserTeam: row.is_current_user,
  }));

  const fieldSize = leaderboardRows[0]?.field_size ?? 0;
  const userEntry = allRankedTeams.find((t) => t.isUserTeam) ?? null;
  const userRank = userEntry?.rank ?? null;
  const teamAhead = userRank ? allRankedTeams.find((t) => t.rank === userRank - 1) : undefined;
  const ptsBehind = teamAhead && userEntry ? Math.max(0, teamAhead.points - userEntry.points) : 0;

  function formatLapTime(ms: number | null) {
    return ms === null ? "—" : `${(ms / 1000).toFixed(2)}s`;
  }
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const studentName = profile?.full_name ? profile.full_name.split(" ")[0] : "Driver";

  if (loading || profileLoading) {
    return (
      <div className={styles.tournamentHub}>
        <Shimmer variant="cards" count={4} />
      </div>
    );
  }

  return (
    <div className={styles.tournamentHub}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: "fixed",
              top: 24,
              right: 24,
              zIndex: 9999,
              background: "linear-gradient(135deg, rgba(8, 145, 178, 0.95), rgba(6, 78, 59, 0.95))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(125, 211, 232, 0.4)",
              color: "#fff",
              padding: "14px 24px",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(125, 211, 232, 0.4)",
              fontWeight: 500,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Sparkles size={18} color="#7dd3e8" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Hub Header ===== */}
      <header className={styles.hubHeader}>
        <div className={styles.hubHeaderLeft}>
          <h1 className={styles.hubTitle} suppressHydrationWarning>
            {timeGreeting}, {studentName}!
          </h1>
          <p className={styles.hubSubtitle}>
            Live race countdown, quick RC car check, and squad standings.
          </p>
        </div>
      </header>

      {/* ===== Overview of Team Performance ===== */}
      <div className={styles.teamPerformanceStrip}>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>ACTIVE TEAM</span>
          <span className={styles.perfValue}>
            {team?.name ? (schoolName ? `${team.name} (${schoolName})` : team.name) : "No team yet"}
          </span>
          {!team && (
            <Link href={teamHref} style={{ color: "var(--accent-subtle-text)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Register your team →
            </Link>
          )}
        </div>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>PADDOCK STANDING</span>
          <span className={styles.perfValue} style={{ color: userRank === 1 ? "#f59e0b" : "var(--accent-subtle-text)" }}>
            {userRank === null
              ? "Not ranked yet"
              : userRank === 1
              ? "Rank #1 (Championship Lead)"
              : `Rank #${userRank} of ${fieldSize} (${ptsBehind > 0 ? `${ptsBehind} pts behind P${userRank - 1}` : "Chasing Podium"})`}
          </span>
        </div>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>BEST QUALIFYING LAP</span>
          <span className={styles.perfValue} style={{ color: "var(--accent-subtle-text)" }}>
            {formatLapTime(userEntry?.avgLapMs ?? null)}
          </span>
        </div>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>PRACTICE READINESS</span>
          <span className={styles.perfValue} style={{ color: readinessScore === 100 ? "#10b981" : "#7dd3e8" }}>
            {readinessScore}% {readinessScore === 100 ? "· Checklist Done" : "· In Progress"}
          </span>
        </div>
      </div>

      {/* ===== 01: Championship Standings (First Box) ===== */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.sectionHeaderLeft}>
          <h3 className={styles.sectionGroupTitle}>Championship Standings</h3>
        </div>
      </div>

      {/* ===== Section: Podium, Rivalry & Live Grid Standings ===== */}
      <section className={styles.standingsSection}>
        <div className={styles.cardHeaderTitle}>
          <div className={styles.sectionGroupTitle}>
            <Award size={22} color="#fbbf24" />
            <span>Active Grid Standings & Top 3 Podium</span>
          </div>
          <Link href="/dashboard/leaderboard" style={{ fontSize: "13px", color: "var(--accent-subtle-text)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <span>Full Standings ({fieldSize} {fieldSize === 1 ? "Team" : "Teams"})</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {allRankedTeams.length === 0 ? (
          <EmptyState
            icon={<Trophy size={22} />}
            title="No verified entries yet"
            description="Standings appear here once teams are verified for this tournament."
          />
        ) : (
          <>
            {/* 3D-styled Dynamic Podium */}
            <div className={styles.podiumRow}>
              {([
                { rankLabel: "1", cardClass: styles.podiumCardGold, rankClass: styles.podiumRankGold, ptsColor: "#fbbf24" },
                { rankLabel: "2", cardClass: styles.podiumCardSilver, rankClass: styles.podiumRankSilver, ptsColor: "#9ca3af" },
                { rankLabel: "3", cardClass: styles.podiumCardBronze, rankClass: styles.podiumRankBronze, ptsColor: "#f59e0b" },
              ] as const).map((slot, idx) => {
                const t = allRankedTeams[idx];
                if (!t) return null;
                return (
                  <motion.div
                    key={t.id}
                    className={`${styles.podiumCard} ${slot.cardClass}`}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  >
                    <div className={`${styles.podiumRank} ${slot.rankClass}`}>{slot.rankLabel}</div>
                    <div className={styles.podiumDetails}>
                      <h4>
                        {t.name}
                        {t.isUserTeam && (
                          <span className={styles.userSquadTag} style={{ marginLeft: 6 }}>YOUR SQUAD</span>
                        )}
                      </h4>
                      <p>{t.school}</p>
                    </div>
                    <div className={styles.podiumPts} style={{ color: slot.ptsColor }}>{t.points.toLocaleString()} pts</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Dynamic Rivalry Indicator */}
            {userEntry && (
              <div className={styles.rivalryBar}>
                <div className={styles.rivalryLeft}>
                  <Flag size={18} color="var(--accent-subtle-text)" />
                  <span>
                    Your Squad: <strong>#{userRank ?? "—"} {userEntry.name}</strong> ({userEntry.points.toLocaleString()} pts)
                  </span>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span style={{ fontSize: "13px", opacity: 0.9 }}>
                    {userRank === 1 ? (
                      <span>👑 <strong>Championship Leader!</strong> Defend your P1 grid position!</span>
                    ) : userRank !== null && teamAhead ? (
                      userRank <= 3 ? (
                        <span>🎉 <strong>Podium Position Secured!</strong> Only <strong>{ptsBehind} pts behind #{userRank - 1} [{teamAhead.name}]</strong> for the next position!</span>
                      ) : (
                        <span>Only <strong>{ptsBehind} pts behind #{userRank - 1} [{teamAhead.name}]</strong>! Keep racing to climb the podium!</span>
                      )
                    ) : (
                      <span>Submit a result to join the ranked standings.</span>
                    )}
                  </span>
                </div>

                <div className={styles.rivalryDelta}>
                  {userRank === 1 ? "P1 LEADER" : teamAhead ? `GAP: -${ptsBehind} pts` : "UNRANKED"}
                </div>
              </div>
            )}

            {/* Mobile Swipe Hint */}
            <div className={styles.mobileSwipeHint}>
              ← Swipe table horizontally to inspect lap times & telemetry →
            </div>

            {/* Full Grid Standings Table */}
            <div className={styles.standingsTableContainer}>
              <table className={styles.standingsTable}>
                <thead className={styles.standingsThead}>
                  <tr>
                    <th>Grid Pos</th>
                    <th>Team</th>
                    <th>School</th>
                    <th>Avg Lap</th>
                    <th>Races</th>
                    <th style={{ textAlign: "right" }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {allRankedTeams.map((t) => (
                    <tr
                      key={t.id}
                      className={`${styles.standingsRow} ${t.isUserTeam ? styles.standingsUserRow : ""}`}
                    >
                      <td className={styles.standingsCell}>
                        <div
                          className={`${styles.standingsRankBadge} ${
                            t.rank === 1 ? styles.rankP1 :
                            t.rank === 2 ? styles.rankP2 :
                            t.rank === 3 ? styles.rankP3 :
                            styles.rankOther
                          }`}
                        >
                          {t.rank === null ? "—" : `#${t.rank}`}
                        </div>
                      </td>
                      <td className={styles.standingsCell}>
                        <div className={styles.teamMetaTitle}>
                          <span>{t.name}</span>
                          {t.isUserTeam && (
                            <span className={styles.userSquadTag}>YOUR SQUAD • LIVE</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.standingsCell}>
                        <span className={styles.teamSchoolText}>{t.school}</span>
                      </td>
                      <td className={styles.standingsCell}>
                        <span className={styles.lapTimeBadge}>{formatLapTime(t.avgLapMs)}</span>
                      </td>
                      <td className={styles.standingsCell}>
                        <span className={styles.speedBadge}>{t.races}</span>
                      </td>
                      <td className={styles.standingsCell}>
                        <div className={styles.teamPointsBadge}>
                          {t.points.toLocaleString()} pts
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ===== Car Safety Check & Practice Tasks ===== */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.sectionHeaderLeft}>
          <h3 className={styles.sectionGroupTitle}>Practice Checklist & Bounties</h3>
        </div>
        <div className={styles.sectionStatusPill}>
          {passedCount === 6 ? (
            <span className={styles.paddockClearedPill}>
              <CheckCircle2 size={13} /> CHECKLIST DONE
            </span>
          ) : (
            <span className={styles.paddockActionPill}>
              <Wrench size={13} /> {6 - passedCount} CHECKS LEFT
            </span>
          )}
        </div>
      </div>
      <p style={{ margin: "-8px 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
        This is your own practice checklist, not the official race inspection. For your team&apos;s real scrutineering
        result, see <Link href={teamHref} style={{ color: "var(--accent-subtle-text)" }}>My Team</Link>.
      </p>

      {/* ===== Middle Grid: Telemetry Readiness & Daily Bounties ===== */}
      <div className={styles.middleGrid}>

        {/* RC Car Pre-Race Hardware Inspection (Active Workstation) */}
        <div className={`${styles.telemetryCard} ${styles.activeWorkshopCard}`}>
          <div className={styles.cardHeaderTitle}>
            <div className={styles.telemetryHeading}>
              <Wrench size={18} color="#7dd3e8" />
              <span>Personal Practice Checklist</span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {passedCount === 6 ? (
                <button 
                  type="button" 
                  className={styles.checkAllBtn}
                  onClick={handleResetInspection}
                  title="Reset inspection checklist for new test"
                >
                  <RotateCw size={11} />
                  <span>Reset</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  className={styles.checkAllBtn}
                  onClick={handleMarkAllInspected}
                  title="Mark all 6 items as passed"
                >
                  <CheckCircle2 size={11} />
                  <span>Pass All</span>
                </button>
              )}
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {passedCount}/6 CHECKED
              </span>
            </div>
          </div>

          {/* Readiness Dial */}
          <div className={styles.readinessGauge}>
            <div 
              className={styles.gaugeCircle}
              style={{
                background: `conic-gradient(#10b981 0% ${readinessScore}%, rgba(255, 255, 255, 0.1) ${readinessScore}% 100%)`,
                boxShadow: readinessScore === 100 ? "0 0 20px rgba(16, 185, 129, 0.5)" : "0 0 14px rgba(125, 211, 232, 0.25)",
              }}
            >
              <div className={styles.gaugeInner}>{readinessScore}%</div>
            </div>
            <div className={styles.readinessDetails}>
              <h4>
                {readinessScore === 100
                  ? "Practice checklist: 100% complete"
                  : readinessScore >= 50
                  ? `Practice checklist: Good (${readinessScore}%)`
                  : `Practice checklist: In progress (${readinessScore}%)`}
              </h4>
              <p>
                {readinessScore === 100
                  ? "All 6 parts self-checked. This doesn't replace staff scrutineering."
                  : `${6 - passedCount} part(s) left on your personal checklist.`}
              </p>
            </div>
          </div>

          {/* 6 Manual Inspection Checkpoints */}
          <div className={styles.diagnosticList}>
            {inspectionItems.map((item) => {
              const isPassed = !!inspectionStatus[item.id];
              const Icon = item.icon;
              return (
                <motion.div 
                  key={item.id} 
                  className={`${styles.diagRow} ${isPassed ? styles.diagRowPassed : ""}`}
                  onClick={() => handleToggleInspection(item.id, item.name)}
                  whileHover={{ x: 5, scale: 1.008 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                  title={`Click to mark ${item.name} as ${isPassed ? "pending re-inspection" : "passed"}`}
                >
                  <div className={styles.diagRowLeft}>
                    <div className={`${styles.diagIconWrap} ${isPassed ? styles.diagIconWrapPassed : ""}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h5 className={styles.diagItemTitle}>{item.name}</h5>
                      <p className={styles.diagItemHint}>{item.hint}</p>
                    </div>
                  </div>
                  <div>
                    {isPassed ? (
                      <motion.span 
                        initial={{ scale: 0.82, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className={styles.diagPassed}
                      >
                        <CheckCircle2 size={13} />
                        <span>Passed / Good Condition</span>
                      </motion.span>
                    ) : (
                      <span className={styles.diagPending}>
                        <CheckCircle2 size={13} />
                        <span>Check & Pass</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Pit-Stop Bounties & Daily Quests */}
        <div className={styles.bountiesCard}>
          <div className={styles.cardHeaderTitle}>
            <div className={styles.telemetryHeading}>
              <Zap size={18} color="#f59e0b" />
              <span>Pit-Stop Bounties & Quests</span>
            </div>
            <span className={styles.localSimNotice}>
              <Activity size={11} /> Practice Simulator XP
            </span>
          </div>

          <div className={styles.bountyList}>
            {[
              {
                id: "bounty_1",
                title: "Check Your RC Car",
                desc: "Check the Wheels, Body, Motor, Wires, Remote, and Battery.",
                reward: 100,
                icon: Wrench,
              },
              {
                id: "bounty_2",
                title: "Time Trial Practice Run",
                desc: "Clock a fast practice lap under 14 seconds.",
                reward: 250,
                icon: Zap,
              },
              {
                id: "bounty_3",
                title: "Assemble 3-Driver Team",
                desc: "Have 3 students ready on your school team roster.",
                reward: 150,
                icon: Users,
              },
            ].map((bounty) => (
              <motion.div 
                key={bounty.id} 
                className={styles.bountyItem}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className={styles.bountyLeft}>
                  <div className={styles.bountyIconWrap}>
                    <bounty.icon size={18} />
                  </div>
                  <div className={styles.bountyMeta}>
                    <h4>{bounty.title}</h4>
                    <p>{bounty.desc}</p>
                  </div>
                </div>

                {claimedBounties[bounty.id] ? (
                  <span className={styles.claimedPill}>✓ Claimed</span>
                ) : (
                  <motion.button 
                    type="button" 
                    className={styles.claimBtn}
                    onClick={() => handleClaimBounty(bounty.id, bounty.reward, bounty.title)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 450, damping: 20 }}
                  >
                    Claim +{bounty.reward} RP
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* ===== 03: Grand Prix Race Countdown (Bottom of Screen) ===== */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.sectionHeaderLeft}>
          <h3 className={styles.sectionGroupTitle}>Next Race</h3>
        </div>
      </div>

      <div className={styles.grandPrixCard}>
        {tournament ? (
          <>
            <div>
              <div className={styles.eventMeta}>
                <div>
                  <h2 className={styles.eventTitle}>{tournament.title}</h2>
                  <div className={styles.eventCircuit}>
                    <Compass size={14} color="#7dd3e8" />
                    <span>{tournament.venue || "Venue to be announced"}</span>
                  </div>
                </div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
                  <div><CalendarDays size={13} style={{ display: "inline", marginRight: 4 }} /> {new Date(tournament.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>
                  <div>{new Date(tournament.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>

              {/* F1 5-Light Start Gantry */}
              <div className={styles.f1Gantry}>
                {[1, 2, 3, 4, 5].map((light) => (
                  <div key={light} className={styles.f1LightHousing}>
                    <div
                      className={styles.f1LightRed}
                      style={{ animationDelay: `${light * 0.18}s` }}
                    />
                  </div>
                ))}
              </div>

              {/* Live Countdown Display */}
              <div className={styles.countdownGrid}>
                <div className={styles.countdownBox}>
                  <span className={styles.countdownDigit}>{String(timeLeft.days).padStart(2, "0")}</span>
                  <span className={styles.countdownUnit}>Days</span>
                </div>
                <div className={styles.countdownBox}>
                  <span className={styles.countdownDigit}>{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span className={styles.countdownUnit}>Hours</span>
                </div>
                <div className={styles.countdownBox}>
                  <span className={styles.countdownDigit}>{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span className={styles.countdownUnit}>Minutes</span>
                </div>
                <div className={styles.countdownBox}>
                  <span className={styles.countdownDigit} style={{ color: "var(--accent-subtle-text)" }}>{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <span className={styles.countdownUnit}>Seconds</span>
                </div>
              </div>
            </div>

            <div className={styles.countdownActions}>
              <Link href="/dashboard/license" className={styles.licenseActionBtn}>
                <IdCard size={15} />
                <span>Driver License</span>
              </Link>
              <Link href={teamHref} className={styles.paddockBtn}>
                <Users size={15} />
                <span>{team ? "Manage Race Team" : "Register Race Team"}</span>
              </Link>
              <Link href="/dashboard/leaderboard" className={styles.gridBtn}>
                <Flag size={15} />
                <span>Live Grid Standings</span>
              </Link>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
            No upcoming races scheduled. Check back later.
          </p>
        )}
      </div>

    </div>
  );
}
