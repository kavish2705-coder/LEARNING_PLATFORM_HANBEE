"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, CalendarDays, Users, Zap, 
  CheckCircle2, RotateCw, Award, Sparkles, 
  ChevronRight, Flag, ShieldCheck, Activity, Cpu, 
  Layers, Compass, Disc, Gamepad2, BatteryCharging, Wrench, IdCard
} from "lucide-react";
import Link from "next/link";
import styles from "./TournamentOverview.module.css";
import { fetchUpcomingTournament, fetchMyTeamFormation, fetchMySchool, type MyTeamFormation, type UpcomingTournament } from "../../../lib/teamFormationApi";
import { getLeaderboard } from "../../../lib/tournamentAdminApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";

export default function TournamentOverview() {
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [schoolName, setSchoolName] = useState("Your School");
  const [teamHref, setTeamHref] = useState("/dashboard/team");
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: profile, isLoading: profileLoading } = useSessionProfile();

  // Centralized Live XP Points (Deterministic & Capped)
  const { addXpTask, removeXpTask } = useUserXp();
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

  // Daily Pit Tasks State
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hanbee_pit_tasks");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Manual RC Car Hardware Inspection Checklist
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

  const [realLeaderboard, setRealLeaderboard] = useState<Array<{
    id: string;
    name: string;
    school: string;
    points: number;
    isUserTeam: boolean;
  }> | null>(null);

  // Dynamic Countdown to Next Tournament
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 14,
    minutes: 28,
    seconds: 45,
  });

  useEffect(() => {
    function calculateTimeLeft() {
      const targetTime = tournament?.starts_at 
        ? new Date(tournament.starts_at).getTime()
        : new Date("2026-10-24T10:00:00+05:30").getTime();
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
        if (schoolInfo) setSchoolName(schoolInfo.name);

        if (profile?.role === "student") {
          const teamData = await fetchMyTeamFormation();
          if (!active) return;
          setTeam(teamData.my_team);
          setTeamHref(teamData.my_team ? "/dashboard/team" : "/dashboard/team/start");
          setCanManageTeam(Boolean(teamData.my_team && teamData.my_team.leader_id === profile.id));
        }

        if (event) {
          try {
            const rows = await getLeaderboard(event.id);
            if (!active) return;
            if (rows && rows.length > 0) {
              setRealLeaderboard(rows.map((r: any) => ({
                id: r.team_id,
                name: r.team_name,
                school: r.school_name || "Registered School",
                points: r.points,
                isUserTeam: false,
              })));
            }
          } catch {
            // Live leaderboard not populated yet
          }
        }
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "We couldn't load the tournament summary.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOverview();
    return () => { active = false; };
  }, [profileLoading, profile?.role]);

  // Daily Driver Pit Tasks Definition
  const pitTasks = [
    {
      id: "task_steering",
      title: "Remote Steering Trim Test",
      desc: "Calibrate left & right trim so car drives perfectly straight on tarmac.",
      points: 25,
      icon: Gamepad2,
    },
    {
      id: "task_battery",
      title: "Pre-Grid LiPo Charge Verify",
      desc: "Safely verify battery charged and pack securely fastened in bay.",
      points: 25,
      icon: BatteryCharging,
    },
    {
      id: "task_wheel_nuts",
      title: "Wheel Hex & Pinion Check",
      desc: "Inspect all 4 wheel nuts and verify gear mesh spins smoothly by hand.",
      points: 30,
      icon: Disc,
    },
    {
      id: "task_transponder",
      title: "Sync Transponder Frequency",
      desc: "Lock receiver channel with race control frequency scanner.",
      points: 20,
      icon: Radio,
    },
  ];

  const handleCompletePitTask = (taskId: string, points: number, taskName: string) => {
    if (completedTasks[taskId]) return;
    const nextState = { ...completedTasks, [taskId]: true };
    setCompletedTasks(nextState);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_pit_tasks", JSON.stringify(nextState));
      } catch {}
    }
    addXpTask(`pit_${taskId}`, points);
    setToastMessage(`Pit drill finished! +${points} XP awarded for "${taskName}" 🏁`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClaimBounty = (bountyId: string, reward: number, bountyTitle: string) => {
    if (claimedBounties[bountyId]) return;
    const updated = { ...claimedBounties, [bountyId]: true };
    setClaimedBounties(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_claimed_bounties", JSON.stringify(updated));
      } catch {}
    }
    addXpTask(`bounty_${bountyId}`, reward);
    setToastMessage(`Quest Completed! +${reward} RP claimed for "${bountyTitle}" 🏆`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleInspection = (id: string, name: string) => {
    const isNowPassed = !inspectionStatus[id];
    const next = { ...inspectionStatus, [id]: isNowPassed };
    setInspectionStatus(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("hanbee_rc_inspection", JSON.stringify(next));
      } catch {}
    }
    if (isNowPassed) {
      addXpTask(`insp_${id}`, 25);
      const totalPassed = Object.values(next).filter(Boolean).length;
      if (totalPassed === inspectionItems.length) {
        addXpTask("insp_all_bonus", 50);
        setToastMessage(`All 6 checks passed! Pre-race clearance approved (+50 Bonus XP) 🏎️💨`);
      } else {
        setToastMessage(`Check passed: ${name} verified (+25 XP) ✅`);
      }
    } else {
      removeXpTask(`insp_${id}`);
      removeXpTask("insp_all_bonus");
      setToastMessage(`${name} marked for re-check.`);
    }
    setTimeout(() => setToastMessage(null), 2500);
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

  const teamName = team?.name || "No team yet";

  const allRankedTeams = (realLeaderboard ?? [
    { id: "t1", name: "Apex Racing Team", school: "Chennai RC Academy", points: 2450, isUserTeam: false },
    { id: "t2", name: "Redline Buggies", school: "National Public School", points: 2180, isUserTeam: false },
    { id: "t3", name: "Thunder Strikers", school: "Delhi Tech School", points: 1920, isUserTeam: false },
    { id: "t4", name: "Speed Racers", school: "Greenfield High", points: 1650, isUserTeam: false },
  ])
    .map((t) => ({ ...t, isUserTeam: team ? t.id === team.id : false }))
    .sort((a, b) => b.points - a.points)
    .map((t, idx) => ({ ...t, rank: idx + 1 }));

  const userRankEntry = allRankedTeams.find((t) => t.isUserTeam);
  const userRank = userRankEntry?.rank ?? null;
  const teamAhead = userRank ? allRankedTeams.find((t) => t.rank === userRank - 1) : undefined;
  const ptsBehind = teamAhead && userRankEntry ? Math.max(0, teamAhead.points - userRankEntry.points) : 0;

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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div className={styles.seasonBadge}>
              <Trophy size={13} />
              Season 2026 // Cup Series
            </div>
            <span className={styles.officialBadge}>
              <ShieldCheck size={11} /> Official Event
            </span>
          </div>
          <h1 className={styles.hubTitle}>
            Tournament Track Hub
          </h1>
          <p className={styles.hubSubtitle}>
            Live race countdown, quick RC car check, and squad standings.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/dashboard/license" className={styles.licenseNavBtn}>
            <IdCard size={15} />
            <span>Driver License</span>
          </Link>
        </div>
      </header>

      {/* ===== Grand Prix Race Countdown & F1 Start Lights ===== */}
      <div className={styles.grandPrixCard}>
        <div>
          <div className={styles.eventMeta}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span className={styles.seasonBadge}>NEXT RACE</span>
                <span className={styles.officialBadge}>
                  <ShieldCheck size={11} /> Verified Schedule
                </span>
              </div>
              <h2 className={styles.eventTitle}>
                {tournament?.title || "Hanbee RC Cup Autumn Race"}
              </h2>
              <div className={styles.eventCircuit}>
                <Compass size={14} color="#7dd3e8" />
                <span>{tournament?.venue || "Apex Indoor RC Track • School Gym Course"}</span>
              </div>
            </div>

            <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
              <div><CalendarDays size={13} style={{ display: "inline", marginRight: 4 }} /> {tournament?.starts_at ? new Date(tournament.starts_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Oct 24, 2026"}</div>
              <div>{tournament?.starts_at ? new Date(tournament.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00 AM IST"}</div>
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
      </div>

      {/* ===== Interactive Pit Bay ===== */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.sectionHeaderLeft}>
          <h3 className={styles.sectionGroupTitle}>Manual Hardware Inspection & Practice Drills</h3>
        </div>
        <div className={styles.sectionStatusPill}>
          {passedCount === 6 ? (
            <span className={styles.paddockClearedPill}>
              <CheckCircle2 size={13} /> PADDOCK CLEARED FOR TRACK
            </span>
          ) : (
            <span className={styles.paddockActionPill}>
              <Wrench size={13} /> {6 - passedCount} CHECKS REQUIRED BEFORE RACE
            </span>
          )}
        </div>
      </div>

      {/* ===== Middle Grid: Telemetry Readiness & Daily Bounties ===== */}
      <div className={styles.middleGrid}>

        {/* RC Car Pre-Race Hardware Inspection */}
        <div className={`${styles.telemetryCard} ${styles.activeWorkshopCard}`}>
          <div className={styles.cardHeaderTitle}>
            <div className={styles.telemetryHeading}>
              <Wrench size={18} color="#7dd3e8" />
              <span>RC Car Pre-Race Hardware Check</span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {passedCount === 6 && (
                <button 
                  type="button" 
                  className={styles.checkAllBtn}
                  onClick={handleResetInspection}
                  title="Reset inspection checklist for new test"
                >
                  <RotateCw size={11} /> Reset
                </button>
              )}
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

      {/* ===== Quick Pit Tasks & Practice Drills ===== */}
      <div className={styles.pitTasksCard}>
        <div className={styles.cardHeaderTitle}>
          <div className={styles.telemetryHeading}>
            <Sparkles size={18} color="#10b981" />
            <span>Quick Pit Tasks & Practice Drills</span>
          </div>
          <span className={styles.localSimNotice}>
            <Zap size={11} /> Click to Complete • Local Points
          </span>
        </div>

        <div className={styles.pitTasksGrid}>
          {pitTasks.map((task) => {
            const isDone = !!completedTasks[task.id];
            const Icon = task.icon;
            return (
              <motion.div
                key={task.id}
                className={`${styles.pitTaskItem} ${isDone ? styles.pitTaskItemDone : ""}`}
                onClick={() => handleCompletePitTask(task.id, task.points, task.title)}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
              >
                <div className={styles.pitTaskLeft}>
                  <div className={`${styles.pitTaskIconWrap} ${isDone ? styles.pitTaskIconWrapDone : ""}`}>
                    <Icon size={17} />
                  </div>
                  <div className={styles.pitTaskMeta}>
                    <h5>{task.title}</h5>
                    <p>{task.desc}</p>
                  </div>
                </div>

                <div>
                  {isDone ? (
                    <span className={styles.pitTaskDoneBadge}>
                      <CheckCircle2 size={12} />
                      <span>Done (+{task.points} XP)</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.pitTaskActionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompletePitTask(task.id, task.points, task.title);
                      }}
                    >
                      <Zap size={11} />
                      <span>+{task.points} XP</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ===== Championship Standings & Top 3 Podium ===== */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.sectionHeaderLeft}>
          <h3 className={styles.sectionGroupTitle}>Championship Standings</h3>
        </div>
      </div>

      <section className={styles.standingsSection}>
        <div className={styles.cardHeaderTitle}>
          <div className={styles.hubTitle} style={{ fontSize: "20px" }}>
            <Award size={22} color="#fbbf24" />
            <span>Active Grid Standings & Top 3 Podium</span>
          </div>
          <Link href="/dashboard/leaderboard" style={{ fontSize: "13px", color: "var(--accent-subtle-text)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <span>Full Standings ({allRankedTeams.length} Teams)</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {allRankedTeams.length >= 3 && (
          <div className={styles.podiumRow}>
            {/* Gold - P1 */}
            <motion.div 
              className={`${styles.podiumCard} ${styles.podiumCardGold}`}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              <div className={`${styles.podiumRank} ${styles.podiumRankGold}`}>1</div>
              <div className={styles.podiumDetails}>
                <h4>
                  {allRankedTeams[0].name}
                  {allRankedTeams[0].isUserTeam && (
                    <span className={styles.userSquadTag} style={{ marginLeft: 6 }}>YOUR SQUAD</span>
                  )}
                </h4>
                <p>{allRankedTeams[0].school}</p>
              </div>
              <div className={styles.podiumPts} style={{ color: "#fbbf24" }}>{allRankedTeams[0].points.toLocaleString()} pts</div>
            </motion.div>

            {/* Silver - P2 */}
            <motion.div 
              className={`${styles.podiumCard} ${styles.podiumCardSilver}`}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              <div className={`${styles.podiumRank} ${styles.podiumRankSilver}`}>2</div>
              <div className={styles.podiumDetails}>
                <h4>
                  {allRankedTeams[1].name}
                  {allRankedTeams[1].isUserTeam && (
                    <span className={styles.userSquadTag} style={{ marginLeft: 6 }}>YOUR SQUAD</span>
                  )}
                </h4>
                <p>{allRankedTeams[1].school}</p>
              </div>
              <div className={styles.podiumPts} style={{ color: "#9ca3af" }}>{allRankedTeams[1].points.toLocaleString()} pts</div>
            </motion.div>

            {/* Bronze - P3 */}
            <motion.div 
              className={`${styles.podiumCard} ${styles.podiumCardBronze}`}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              <div className={`${styles.podiumRank} ${styles.podiumRankBronze}`}>3</div>
              <div className={styles.podiumDetails}>
                <h4>
                  {allRankedTeams[2].name}
                  {allRankedTeams[2].isUserTeam && (
                    <span className={styles.userSquadTag} style={{ marginLeft: 6 }}>YOUR SQUAD</span>
                  )}
                </h4>
                <p>{allRankedTeams[2].school}</p>
              </div>
              <div className={styles.podiumPts} style={{ color: "#f59e0b" }}>{allRankedTeams[2].points.toLocaleString()} pts</div>
            </motion.div>
          </div>
        )}

        {/* Rivalry Indicator */}
        {userRank !== null && userRankEntry && (
          <div className={styles.rivalryBar}>
            <div className={styles.rivalryLeft}>
              <Flag size={18} color="var(--accent-subtle-text)" />
              <span>
                Your Squad: <strong>#{userRank} {teamName}</strong> ({userRankEntry.points.toLocaleString()} pts)
              </span>
              {teamAhead && (
                <>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span style={{ fontSize: "13px", opacity: 0.9 }}>
                    {userRank === 1 ? (
                      <span>👑 <strong>Championship Leader!</strong> Defend your P1 grid position!</span>
                    ) : (
                      <span>Only <strong>{ptsBehind} pts behind #{userRank - 1} [{teamAhead.name}]</strong>!</span>
                    )}
                  </span>
                </>
              )}
            </div>

            <div className={styles.rivalryDelta}>
              {userRank === 1 ? "P1 LEADER" : `GAP: -${ptsBehind} pts`}
            </div>
          </div>
        )}

        {/* Mobile Swipe Hint */}
        <div className={styles.mobileSwipeHint}>
          ← Swipe table horizontally to inspect standings →
        </div>

        {/* Full Grid Standings Table: Separate Team and School Columns */}
        <div className={styles.standingsTableContainer}>
          <table className={styles.standingsTable}>
            <thead className={styles.standingsThead}>
              <tr>
                <th>Grid Pos</th>
                <th>Team</th>
                <th>School</th>
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
                      #{t.rank}
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
                    <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t.school}</span>
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
      </section>

    </div>
  );
}
