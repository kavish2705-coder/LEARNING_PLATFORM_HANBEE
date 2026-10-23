"use client";

import { useEffect, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, CalendarDays, MapPin, Users, Zap, 
  Radio, CheckCircle2, RotateCw, Award, Sparkles, 
  ChevronRight, ChevronDown, ChevronUp, Flag, Activity, Cpu, 
  Layers, Compass, Disc, Gamepad2, BatteryCharging, Wrench, IdCard, Gauge, Clock
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
  const [schoolName, setSchoolName] = useState("Delhi Tech Academy");
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
      wheels: false,
      body: false,
      motor: false,
      wiring: false,
      remote: false,
      battery: false,
    };
  });

  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const [realLeaderboard, setRealLeaderboard] = useState<Array<{
    id: string;
    name: string;
    school: string;
    car: string;
    bestLap: string;
    avgLap?: string;
    topSpeed: string;
    readiness: number;
    points: number;
    status: string;
    statusType: string;
    isUserTeam: boolean;
    winRate?: string;
    motorSpec?: string;
    batterySpec?: string;
    chassis?: string;
    members?: Array<{ name: string; role: string; isCaptain?: boolean }>;
  }> | null>(null);

  // Dynamic Countdown to Next Tournament (Driven strictly by live tournament data)
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!tournament?.starts_at) {
      setTimeLeft(null);
      return;
    }

    function calculateTimeLeft() {
      const targetTime = new Date(tournament!.starts_at).getTime();
      const diff = Math.max(0, targetTime - Date.now());
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
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
            const lbRows = await getLeaderboard(event.id);
            if (active && Array.isArray(lbRows) && lbRows.length > 0) {
              setRealLeaderboard(lbRows.map((r) => ({
                id: r.team_id,
                name: r.team_name,
                school: r.school_name || "Registered School",
                car: "RC Race Buggy",
                bestLap: "12.50s",
                topSpeed: "24.0 km/h",
                readiness: 100,
                points: r.points,
                status: "Official Entry",
                statusType: "active",
                isUserTeam: false,
              })));
            }
          } catch {
            // Live leaderboard not populated yet; benchmark simulation will be used
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
        setToastMessage(`🏎️ Pre-Race Pit Inspection 100% Complete! Car is cleared for the track! (+50 XP)`);
        addXpTask("insp_all_bonus", 50, "Full Pre-Race Paddock Clearance");
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
    addXpTask("insp_all_bonus", 50, "Full Pre-Race Paddock Clearance");
    setToastMessage(`🎉 All 6 Self-Checklist Items Passed! Full Race Readiness (+50 XP Bonus)`);
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

  const driverName = profile?.full_name || "Alex Mitchell";
  const driverInitials = driverName.split(/\s+/).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase() || "AM";
  const teamName = team?.name || "Vortex Racing";

  // Benchmark Teams with Rich Roster & Telemetry
  const baseDummyTeams = [
    {
      id: "team_redline",
      name: "Team Redline Apex",
      school: "St. Xavier Tech",
      car: "Redline RC Buggy (4WD)",
      bestLap: "11.42s",
      avgLap: "11.85s",
      topSpeed: "26.8 km/h",
      readiness: 100,
      points: 1850,
      status: "On Track",
      statusType: "active",
      isUserTeam: false,
      winRate: "4 / 5 Podiums (80%)",
      motorSpec: "Brushless 4200KV • 45A ESC",
      batterySpec: "2S LiPo 1500mAh 30C",
      chassis: "4WD Carbon/Polymer • 760g",
      members: [
        { name: "Rohan V.", role: "Team Captain & Lead Driver", isCaptain: true },
        { name: "Aarav P.", role: "Telemetry & Electronics Lead", isCaptain: false },
        { name: "Zara K.", role: "Pit Crew & Chassis Mechanic", isCaptain: false },
      ],
    },
    {
      id: "team_cyberdrift",
      name: "CyberDrift FC",
      school: "Modern Academy",
      car: "Blue Thunder RC 16X",
      bestLap: "11.89s",
      avgLap: "12.18s",
      topSpeed: "25.4 km/h",
      readiness: 100,
      points: 1620,
      status: "Pit Ready",
      statusType: "active",
      isUserTeam: false,
      winRate: "3 / 5 Podiums (60%)",
      motorSpec: "Brushless 3900KV • 40A ESC",
      batterySpec: "2S LiPo 1400mAh 25C",
      chassis: "Shaft-Driven 4WD • 775g",
      members: [
        { name: "Maya T.", role: "Lead Driver & Strategist", isCaptain: true },
        { name: "Elena S.", role: "Battery & Motor Tech", isCaptain: false },
        { name: "Liam N.", role: "Lap Analysis & Sensor Lead", isCaptain: false },
      ],
    },
    {
      id: "team_torquecraft",
      name: "TorqueCraft Racing",
      school: "DPS Engineering",
      car: "Turbo Racer Buggy",
      bestLap: "12.15s",
      avgLap: "12.42s",
      topSpeed: "24.6 km/h",
      readiness: 100,
      points: 1490,
      status: "Pit Ready",
      statusType: "active",
      isUserTeam: false,
      winRate: "2 / 5 Podiums (40%)",
      motorSpec: "Modified 540 Brushed • 35A ESC",
      batterySpec: "7.2V NiMH 1800mAh Pack",
      chassis: "Reinforced Buggy Plate • 810g",
      members: [
        { name: "David C.", role: "Squad Captain & Driver", isCaptain: true },
        { name: "Nathan R.", role: "Gearbox & Suspension Tech", isCaptain: false },
      ],
    },
    {
      id: "team_neon",
      name: "Neon Drift Squad",
      school: "Greenwood High",
      car: "Neon Cruiser 4WD",
      bestLap: "13.05s",
      avgLap: "13.38s",
      topSpeed: "23.2 km/h",
      readiness: 83,
      points: 1340,
      status: "Tuning",
      statusType: "tuning",
      isUserTeam: false,
      winRate: "1 / 4 Podiums (25%)",
      motorSpec: "Brushless 3300KV • 30A ESC",
      batterySpec: "2S LiPo 1300mAh 20C",
      chassis: "High-Clearance 4x4 • 785g",
      members: [
        { name: "Priya S.", role: "Lead Pilot", isCaptain: true },
        { name: "Marcus B.", role: "Radio Telemetry Lead", isCaptain: false },
      ],
    },
    {
      id: "team_falcon",
      name: "Falcon Aero RC",
      school: "National Public School",
      car: "Aero Storm Buggy",
      bestLap: "13.22s",
      avgLap: "13.55s",
      topSpeed: "22.8 km/h",
      readiness: 100,
      points: 1280,
      status: "Pit Ready",
      statusType: "active",
      isUserTeam: false,
      winRate: "1 / 5 Podiums (20%)",
      motorSpec: "Brushed 380 High-Torque",
      batterySpec: "7.4V Li-ion 1200mAh",
      chassis: "Aero Composite Frame • 770g",
      members: [
        { name: "Oliver G.", role: "Team Pilot", isCaptain: true },
        { name: "Sophia D.", role: "Aerodynamics & Wing Tuning", isCaptain: false },
      ],
    },
    {
      id: "team_hyperspark",
      name: "HyperSpark Racing",
      school: "Oakridge Tech",
      car: "Spark Runner 1:16",
      bestLap: "13.58s",
      avgLap: "13.92s",
      topSpeed: "22.1 km/h",
      readiness: 67,
      points: 1190,
      status: "Battery Check",
      statusType: "tuning",
      isUserTeam: false,
      winRate: "0 / 3 Podiums",
      motorSpec: "Stock 390 Brushed Motor",
      batterySpec: "6.0V NiMH 1100mAh",
      chassis: "Molded Tub Chassis • 795g",
      members: [
        { name: "Daniel K.", role: "Lead Driver", isCaptain: true },
        { name: "Chloe M.", role: "Battery Charging Tech", isCaptain: false },
      ],
    },
    {
      id: "team_apex",
      name: "Apex Predators",
      school: "Bishop Cotton",
      car: "Predator RC 4x4",
      bestLap: "13.91s",
      avgLap: "14.20s",
      topSpeed: "21.5 km/h",
      readiness: 83,
      points: 1050,
      status: "In Paddock",
      statusType: "paddock",
      isUserTeam: false,
      winRate: "0 / 2 Podiums",
      motorSpec: "Standard 380 Motor",
      batterySpec: "7.4V 1000mAh LiPo",
      chassis: "4WD Dual Differential • 820g",
      members: [
        { name: "Aryan T.", role: "Driver", isCaptain: true },
        { name: "Ananya B.", role: "Pit Lane Coordinator", isCaptain: false },
      ],
    },
  ];

  const userSquad = {
    id: "user_squad",
    name: teamName,
    school: schoolName,
    car: "Thunder RC 4WD Buggy",
    bestLap: "12.84s",
    avgLap: "13.15s",
    topSpeed: "23.9 km/h",
    readiness: readinessScore,
    points: xp,
    status: readinessScore === 100 ? "Ready to Drive" : "Inspecting",
    statusType: readinessScore === 100 ? "active" : "tuning",
    isUserTeam: true,
    winRate: `${Math.min(5, Math.max(1, Math.floor(xp / 350)))} / 5 Events Logged`,
    motorSpec: "High-Torque 380 Motor • 30A Waterproof ESC",
    batterySpec: "7.4V 1200mAh Li-ion Pack",
    chassis: "4WD High-Clearance Buggy Chassis • 790g",
    members: team && team.members && team.members.length > 0
      ? team.members.map((m) => ({
          name: m.name,
          role: m.is_captain ? "Team Captain & Driver" : "Co-Driver & Pit Crew",
          isCaptain: m.is_captain,
        }))
      : [
          { name: driverName, role: "Team Captain & Driver", isCaptain: true },
          { name: "Open Slot", role: "Invite Classmate from Squad Hub", isCaptain: false },
        ],
  };

  const isSimulated = !realLeaderboard || realLeaderboard.length === 0;

  const allRankedTeams = (isSimulated
    ? [...baseDummyTeams, userSquad]
    : realLeaderboard.map((t) => ({ ...t, isUserTeam: team ? t.id === team.id : t.id === "user_squad" }))
  )
    .sort((a, b) => b.points - a.points)
    .map((t, idx) => ({ ...t, rank: idx + 1 }));

  const userRank = allRankedTeams.find((t) => t.isUserTeam)?.rank ?? 4;
  const teamAhead = allRankedTeams.find((t) => t.rank === userRank - 1);
  const ptsBehind = teamAhead ? Math.max(0, teamAhead.points - xp) : 0;
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const studentName = profile?.full_name ? profile.full_name.split(" ")[0] : "Driver";

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
          <span className={styles.perfValue}>{team?.name || "Vortex Racing"} ({schoolName || "Delhi Tech Academy"})</span>
        </div>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>PADDOCK STANDING</span>
          <span className={styles.perfValue} style={{ color: userRank === 1 ? "#f59e0b" : "var(--accent-subtle-text)" }}>
            {userRank === 1 ? "Rank #1 (Championship Lead)" : `Rank #${userRank} (${ptsBehind > 0 ? `${ptsBehind} pts behind P${userRank - 1}` : "Chasing Podium"})`}
          </span>
        </div>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>AVERAGE LAP</span>
          <span className={styles.perfValue} style={{ color: "var(--accent-subtle-text)" }}>12.84s</span>
        </div>
        <div className={styles.perfItem}>
          <span className={styles.perfLabel}>PRE-RACE READINESS</span>
          <span className={styles.perfValue} style={{ color: readinessScore === 100 ? "#10b981" : "#7dd3e8" }}>
            {readinessScore}% {readinessScore === 100 ? "· Track Ready" : "· In Inspection"}
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
          <div className={styles.hubTitle} style={{ fontSize: "20px" }}>
            <Award size={22} color="#fbbf24" />
            <span>Active Grid Standings & Top 3 Podium</span>
          </div>
          <Link href="/dashboard/leaderboard" style={{ fontSize: "13px", color: "var(--accent-subtle-text)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <span>Full Standings (8 Teams)</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* 3D-styled Dynamic Podium */}
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
              <p>{allRankedTeams[0].school} • {allRankedTeams[0].car}</p>
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
              <p>{allRankedTeams[1].school} • {allRankedTeams[1].car}</p>
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
              <p>{allRankedTeams[2].school} • {allRankedTeams[2].car}</p>
            </div>
            <div className={styles.podiumPts} style={{ color: "#f59e0b" }}>{allRankedTeams[2].points.toLocaleString()} pts</div>
          </motion.div>
        </div>

        {/* Dynamic Rivalry Indicator */}
        <div className={styles.rivalryBar}>
          <div className={styles.rivalryLeft}>
            <Flag size={18} color="var(--accent-subtle-text)" />
            <span>
              Your Squad: <strong>#{userRank} {teamName}</strong> ({xp.toLocaleString()} XP)
            </span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>
              {userRank === 1 ? (
                <span>👑 <strong>Championship Leader!</strong> Defend your P1 grid position!</span>
              ) : userRank <= 3 ? (
                <span>🎉 <strong>Podium Position Secured!</strong> Only <strong>{ptsBehind} XP behind #{userRank - 1} [{teamAhead?.name}]</strong> for the next position!</span>
              ) : (
                <span>Only <strong>{ptsBehind} XP behind #{userRank - 1} [{teamAhead?.name}]</strong>! Complete pit tasks or checks to climb the podium!</span>
              )}
            </span>
          </div>

          <div className={styles.rivalryDelta}>
            {userRank === 1 ? "P1 LEADER" : `GAP: -${ptsBehind} XP`}
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className={styles.mobileSwipeHint}>
          ← Swipe table horizontally to inspect lap times & telemetry →
        </div>

        {/* Full Grid Standings & Team Telemetry Table */}
        <div className={styles.standingsTableContainer}>
          <table className={styles.standingsTable}>
            <thead className={styles.standingsThead}>
              <tr>
                <th>Grid Pos</th>
                <th>Team</th>
                <th>School</th>
                <th>Best Lap</th>
                <th>Top Speed</th>
                <th style={{ textAlign: "right" }}>Total Points</th>
              </tr>
            </thead>
            <tbody>
              {allRankedTeams.map((t) => {
                const isExpanded = expandedTeamId === t.id;
                return (
                  <Fragment key={t.id}>
                    <tr 
                      className={`${styles.standingsRow} ${t.isUserTeam ? styles.standingsUserRow : ""} ${isExpanded ? styles.standingsRowActive : ""}`}
                      onClick={() => setExpandedTeamId(isExpanded ? null : t.id)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedTeamId(isExpanded ? null : t.id);
                        }
                      }}
                      title="Click to view team member roster & telemetry specs"
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
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{t.name}</span>
                            <span 
                              className={styles.expandChevronIcon} 
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                color: isExpanded ? "var(--accent)" : "var(--text-muted)",
                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease, color 0.2s ease",
                              }}
                            >
                              <ChevronDown size={14} />
                            </span>
                          </div>
                          {t.isUserTeam && (
                            <span className={styles.userSquadTag}>YOUR SQUAD • LIVE</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.standingsCell}>
                        <span className={styles.teamSchoolText}>{t.school}</span>
                      </td>
                      <td className={styles.standingsCell}>
                        <span className={styles.lapTimeBadge}>{t.bestLap}</span>
                      </td>
                      <td className={styles.standingsCell}>
                        <span className={styles.speedBadge}>{t.topSpeed}</span>
                      </td>
                      <td className={styles.standingsCell}>
                        <div className={styles.teamPointsBadge}>
                          {t.points.toLocaleString()} pts
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Dropdown: Team Members & Extended Telemetry */}
                    {isExpanded && (
                      <tr className={styles.expandedDetailsRow}>
                        <td colSpan={6} className={styles.expandedDetailsCell}>
                          <div className={styles.expandedDropdownCard}>
                            <div className={styles.expandedHeader}>
                              <div className={styles.expandedHeaderLeft}>
                                <div className={styles.expandedCarBadge}>
                                  <Activity size={13} />
                                  <span>{t.car || "4WD Racing Buggy"}</span>
                                </div>
                                <span className={styles.expandedSchoolMeta}>• {t.school}</span>
                              </div>
                              <div className={styles.expandedWinPill}>
                                <Trophy size={13} color="#f59e0b" />
                                <span>{t.winRate || "3 / 5 Podiums"}</span>
                              </div>
                            </div>

                            <div className={styles.expandedGrid}>
                              {/* Column 1: Team Members / Roster */}
                              <div className={styles.expandedColRoster}>
                                <div className={styles.expandedSectionLabel}>
                                  <Users size={13} />
                                  <span>TEAM MEMBERS & ROSTER</span>
                                </div>
                                <div className={styles.memberCardList}>
                                  {(t.members && t.members.length > 0 ? t.members : [
                                    { name: "Team Pilot", role: "Lead Driver", isCaptain: true },
                                    { name: "Pit Technician", role: "Telemetry & Battery", isCaptain: false }
                                  ]).map((m, mIdx) => {
                                    const initials = m.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                                    return (
                                      <div key={mIdx} className={styles.memberCardItem}>
                                        <div className={`${styles.memberAvatar} ${m.isCaptain ? styles.memberAvatarCaptain : ""}`}>
                                          {initials || "TM"}
                                        </div>
                                        <div className={styles.memberInfo}>
                                          <div className={styles.memberNameRow}>
                                            <span className={styles.memberName}>{m.name}</span>
                                            {m.isCaptain && <span className={styles.captainPill}>CAPTAIN</span>}
                                          </div>
                                          <span className={styles.memberRole}>{m.role}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Column 2: Telemetry & Hardware Specs */}
                              <div className={styles.expandedColTelemetry}>
                                <div className={styles.expandedSectionLabel}>
                                  <Zap size={13} />
                                  <span>TELEMETRY & HARDWARE SPECS</span>
                                </div>
                                <div className={styles.telemetrySpecsGrid}>
                                  <div className={styles.specItem}>
                                    <span className={styles.specLabel}>BEST LAP</span>
                                    <span className={styles.specValueHighlight}>{t.bestLap}</span>
                                  </div>
                                  <div className={styles.specItem}>
                                    <span className={styles.specLabel}>AVG LAP</span>
                                    <span className={styles.specValue}>{t.avgLap || "12.05s"}</span>
                                  </div>
                                  <div className={styles.specItem}>
                                    <span className={styles.specLabel}>TOP VELOCITY</span>
                                    <span className={styles.specValue}>{t.topSpeed}</span>
                                  </div>
                                  <div className={styles.specItem}>
                                    <span className={styles.specLabel}>READINESS</span>
                                    <span className={styles.specValue} style={{ color: t.readiness === 100 ? "#10b981" : "#f59e0b" }}>
                                      {t.readiness}% {t.readiness === 100 ? "Ready" : "Tuning"}
                                    </span>
                                  </div>
                                  <div className={styles.specItemWide}>
                                    <span className={styles.specLabel}>POWERTRAIN & MOTOR</span>
                                    <span className={styles.specValueSmall}>{t.motorSpec || "Brushless 4200KV • 45A ESC"}</span>
                                  </div>
                                  <div className={styles.specItemWide}>
                                    <span className={styles.specLabel}>BATTERY & CHASSIS</span>
                                    <span className={styles.specValueSmall}>{t.batterySpec || "2S LiPo 1500mAh"} • {t.chassis || "4WD Buggy Chassis"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Self-Checklist & Practice Tasks ===== */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.sectionHeaderLeft}>
          <h3 className={styles.sectionGroupTitle}>Self-Checklist & Practice Tasks</h3>
        </div>
        <div className={styles.sectionStatusPill}>
          {passedCount === 6 ? (
            <span className={styles.paddockClearedPill}>
              <CheckCircle2 size={13} /> READY TO DRIVE
            </span>
          ) : (
            <span className={styles.paddockActionPill}>
              <Wrench size={13} /> {6 - passedCount} CHECKS LEFT
            </span>
          )}
        </div>
      </div>

      {/* ===== Middle Grid: Telemetry Readiness & Daily Bounties ===== */}
      <div className={styles.middleGrid}>

        {/* Self-Checklist (Active Workstation) */}
        <div className={`${styles.telemetryCard} ${styles.activeWorkshopCard}`}>
          <div className={styles.cardHeaderTitle}>
            <div className={styles.telemetryHeading}>
              <Wrench size={18} color="#7dd3e8" />
              <span>Self-Checklist</span>
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
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>
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
                  ? "Car Condition: 100% (Ready to Drive!)"
                  : readinessScore >= 50
                  ? `Car Condition: Good (${readinessScore}%)`
                  : `Car Condition: Checking (${readinessScore}%)`}
              </h4>
              <p>
                {readinessScore === 100
                  ? "All 6 parts checked and approved by student. Car is good to go!"
                  : `${6 - passedCount} part(s) left to check before driving.`}
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
          <div>
            <div className={styles.eventMeta}>
              <div>
                <h2 className={styles.eventTitle}>
                  {tournament.title}
                </h2>
                <div className={styles.eventCircuit}>
                  <Compass size={14} color="#7dd3e8" />
                  <span>{tournament.venue || "Official Tournament Circuit"}</span>
                </div>
              </div>

              <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
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
            {timeLeft ? (
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
            ) : (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-muted)", fontSize: "14px" }}>
                Tournament in progress or scheduled start reached.
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
            <Compass size={32} color="var(--accent-subtle-text)" style={{ margin: "0 auto 10px", opacity: 0.85 }} />
            <h2 className={styles.eventTitle} style={{ fontSize: "18px", marginBottom: "6px" }}>
              No Upcoming Tournaments Scheduled
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px", maxWidth: "460px", margin: "0 auto", lineHeight: 1.5 }}>
              Official tournament dates, venues, and live countdowns will appear here as soon as the next championship round is announced.
            </p>
          </div>
        )}

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

    </div>
  );
}
