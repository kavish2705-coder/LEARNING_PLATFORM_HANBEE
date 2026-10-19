"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Crown, CheckCircle2, Copy, Check, Timer, Gauge, 
  Trophy, ChevronRight, BarChart3, Zap, ArrowLeft, Radio, 
  MapPin, Award, Flame, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./license.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";
import { fetchUpcomingTournament, fetchMyTeamFormation, fetchMySchool, type MyTeamFormation, type UpcomingTournament } from "../../../lib/teamFormationApi";

export default function DriverLicensePage() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();
  const { xp } = useUserXp();
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [schoolName, setSchoolName] = useState("Your School");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Guard: Driver License is strictly student-only
  useEffect(() => {
    if (profile?.role && profile.role !== "student") {
      const home = profile.role === "school_staff" 
        ? "/dashboard/school/overview" 
        : profile.role === "staff" 
          ? "/dashboard/hanbee/my-space" 
          : "/dashboard/manager/monitor";
      router.replace(home);
    }
  }, [profile, router]);

  if (profile?.role && profile.role !== "student") {
    return null;
  }

  // Interactive RC Motor Audio Synthesis
  const [isRevving, setIsRevving] = useState(false);
  const [rpm, setRpm] = useState(1400);

  const playRcMotorRev = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3200, now);

      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1850, now + 0.35);
      osc.frequency.setValueAtTime(1400, now + 0.42);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.85);
      osc.frequency.exponentialRampToValueAtTime(280, now + 1.4);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.setValueAtTime(0.18, now + 0.9);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.45);
    } catch {
      // Graceful fallback if audio permissions are blocked
    }
  };

  const handleRevMotor = () => {
    if (isRevving) return;
    setIsRevving(true);
    playRcMotorRev();
    setRpm(18650);

    setTimeout(() => setRpm(14200), 400);
    setTimeout(() => setRpm(19800), 800);
    setTimeout(() => {
      setRpm(1400);
      setIsRevving(false);
    }, 1450);
  };

  // 3D Holographic Card Interactive Physics
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Smooth subtle pitch & yaw tilt (±6deg)
    setTilt({
      rotateX: (0.5 - y) * 12,
      rotateY: (x - 0.5) * 12,
    });
    setGlarePos({
      x: x * 100,
      y: y * 100,
      opacity: 0.22,
    });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const driverName = profile?.full_name || "Ranjith";
  const driverInitial = driverName.charAt(0).toUpperCase() || "R";
  const teamName = team?.name || "No team yet";
  const licenseId = "HB-42";
  const displayRp = xp > 0 ? xp : 2215;

  useEffect(() => {
    let active = true;
    async function loadTeam() {
      try {
        const [tournamentData, schoolInfo] = await Promise.all([
          fetchUpcomingTournament(),
          fetchMySchool(),
        ]);
        if (schoolInfo?.name && active) setSchoolName(schoolInfo.name);
        if (tournamentData && active) {
          setTournament(tournamentData);
          const formation = await fetchMyTeamFormation(tournamentData.id);
          if (active) setTeam(formation.my_team);
        }
      } catch {
        // Fallback team and school names are used
      }
    }
    void loadTeam();
    return () => { active = false; };
  }, []);

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

  const handleCopySerial = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(licenseId);
    }
    setCopied(true);
    setToastMessage(`✓ Copied Driver License ID: ${licenseId}`);
    setTimeout(() => {
      setCopied(false);
      setToastMessage(null);
    }, 3000);
  };

  const badges = [
    {
      id: "quick_lap",
      name: "Quick Lap",
      desc: "Clocked a lap under 14 seconds",
      icon: Zap,
      color: "#38bdf8",
      bgColor: "rgba(56, 189, 248, 0.12)",
    },
    {
      id: "pre_race_check",
      name: "Pre-Race Check",
      desc: "Checked all 6 car parts",
      icon: ShieldCheck,
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.12)",
    },
    {
      id: "streak",
      name: "4-Day Streak",
      desc: "Practiced 4 days in a row",
      icon: Flame,
      color: "#f97316",
      bgColor: "rgba(249, 115, 22, 0.12)",
    },
    {
      id: "club_driver",
      name: "Club Driver",
      desc: "Official Hanbee RC racer",
      icon: Trophy,
      color: "#fbbf24",
      bgColor: "rgba(251, 191, 36, 0.12)",
    },
  ];

  return (
    <div className={styles.licensePage}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={styles.toastNotification}
          >
            <Sparkles size={18} color="#7dd3e8" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            Student Driver License
          </h1>
          <p className={styles.pageSubtitle}>
            Official Hanbee RC Racing Club pass, telemetry stats, and track records.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button 
            type="button" 
            className={styles.actionBtnSecondary}
            onClick={handleCopySerial}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? "Copied ID" : "Copy License ID"}</span>
          </button>
          <Link href="/dashboard" className={styles.actionBtnPrimary}>
            <ArrowLeft size={14} />
            <span>Race Overview</span>
          </Link>
        </div>
      </header>

      {/* ========================================================
          HERO RACER PASS CARD (Exact Mockup Match)
          ======================================================== */}
      <div className={styles.licenseStage}>
        <div className={styles.licenseHeroContainer}>
          <motion.div 
            className={styles.racerPassCard}
          animate={{ 
            rotateX: tilt.rotateX, 
            rotateY: tilt.rotateY,
          }}
          transition={{ 
            type: "spring", 
            stiffness: 280, 
            damping: 24, 
            mass: 0.5 
          }}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          {/* Subtle Dynamic Glare following cursor */}
          <div 
            className={styles.cardSpecularGlare}
            style={{
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.22) 0%, rgba(56, 189, 248, 0.12) 28%, transparent 62%)`,
              opacity: glarePos.opacity,
            }}
          />

          {/* Background RC Buggy with HANBEE Rear Spoiler */}
          <div className={styles.cardCarBg} />

          {/* Top Bar: Shield Icon + HANBEE RACING CLUB // RC SERIES + RACER PASS */}
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <ShieldCheck size={20} className={styles.shieldIcon} />
              <span className={styles.brandTitle}>HANBEE</span>
              <span className={styles.brandSubtitle}>RACING CLUB // RC SERIES</span>
            </div>

            <div className={styles.racerPassBadge}>
              <Crown size={14} className={styles.crownIcon} />
              <span>RACER PASS</span>
            </div>
          </div>

          {/* Middle Profile Row: Blue Rounded Avatar + Name + VERIFIED + HB-42 + Team/School */}
          <div className={styles.driverRow}>
            <div className={styles.avatarSquare}>
              {driverInitial}
            </div>

            <div className={styles.driverMeta}>
              <div className={styles.driverNameRow}>
                <h2 className={styles.driverName}>{driverName}</h2>
                <span className={styles.verifiedBadge}>
                  <CheckCircle2 size={13} className={styles.verifiedIcon} />
                  <span>VERIFIED</span>
                </span>
              </div>

              <div className={styles.serialRow}>
                <span>{licenseId}</span>
                <button 
                  type="button" 
                  onClick={handleCopySerial} 
                  className={styles.copyBtn} 
                  title="Copy Driver License ID"
                  aria-label="Copy Driver License ID"
                >
                  <Copy size={14} />
                </button>
              </div>

              <div className={styles.teamSchoolRow}>
                <span>{teamName} • {schoolName}</span>
              </div>
            </div>
          </div>

          {/* 3-Card Telemetry Grid: BEST LAP | TOP SPEED | RACE POINTS */}
          <div className={styles.statsGrid}>
            {/* 1. Best Lap */}
            <div className={styles.statCard}>
              <div className={styles.statIconWrap}>
                <Timer size={26} color="#38bdf8" />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>BEST LAP</span>
                <span className={styles.statValue}>12.84s</span>
                <span className={styles.purpleTag}>
                  <Zap size={11} color="#c084fc" />
                  <span>PURPLE FAST</span>
                </span>
              </div>
            </div>

            {/* 2. Top Speed */}
            <div className={styles.statCard}>
              <div className={styles.statIconWrap}>
                <Gauge size={26} color="#38bdf8" />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>TOP SPEED</span>
                <span className={styles.statValue}>44.8 km/h</span>
                <span className={styles.greenTag}>PEAK APEX</span>
              </div>
            </div>

            {/* 3. Race Points (Golden Amber Highlight) */}
            <div 
              className={styles.statCardGold}
              onClick={() => setShowDetails((prev) => !prev)}
              title="Click to view full racing profile"
            >
              <div className={styles.statGoldLeft}>
                <div className={styles.statIconWrap}>
                  <Trophy size={28} color="#f59e0b" />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.goldStatLabel}>RACE POINTS</span>
                  <span className={styles.goldStatValue}>
                    {displayRp.toLocaleString()} <span className={styles.rpUnit}>RP</span>
                  </span>
                </div>
              </div>

              <div className={styles.goldArrowBtn}>
                <ChevronRight size={18} color="#f59e0b" />
              </div>
            </div>
          </div>

          {/* Bottom Action Button: View Racing Profile */}
          <button 
            type="button" 
            className={styles.viewProfileBtn}
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
          >
            <div className={styles.viewProfileLeft}>
              <BarChart3 size={18} color="#2dd4bf" />
              <span>View Racing Profile</span>
            </div>

            <div className={styles.tealCircleArrow}>
              {showDetails ? (
                <ChevronUp size={16} color="#042f2e" strokeWidth={2.8} />
              ) : (
                <ChevronRight size={16} color="#042f2e" strokeWidth={2.8} />
              )}
            </div>
          </button>
        </motion.div>
      </div>
      </div>

      {/* ========================================================
          EXPANDABLE RACING PROFILE DETAILS (Revealed on click)
          ======================================================== */}
      <AnimatePresence>
        {showDetails && (
          <motion.div 
            className={styles.detailsDrawer}
            initial={{ opacity: 0, height: 0, y: -16 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Interactive Cockpit RC Throttle Console */}
            <div className={`${styles.throttleConsole} ${isRevving ? styles.throttleConsoleRevving : ""}`}>
              <div className={styles.throttleLeft}>
                <div className={styles.throttleMetaRow}>
                  <span className={styles.throttleLabel}>RC Motor RPM Telemetry:</span>
                  <span className={`${styles.throttleRpmVal} ${isRevving ? styles.throttleRpmValActive : ""}`}>
                    {rpm.toLocaleString()} RPM {isRevving ? "⚡ BOOST" : "• IDLE"}
                  </span>
                </div>
                <div className={styles.tachometerTrack}>
                  <div 
                    className={styles.tachometerFill}
                    style={{ width: `${Math.min(100, Math.max(8, (rpm / 20000) * 100))}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                className={`${styles.revThrottleBtn} ${isRevving ? styles.revThrottleBtnActive : ""}`}
                onClick={handleRevMotor}
                disabled={isRevving}
                title="Click to test your RC car electric motor audio!"
              >
                <Zap size={14} />
                <span>{isRevving ? "REVVED UP!" : "🏎️ Test Throttle"}</span>
              </button>
            </div>

            {/* 2-Column Supporting Grid (RC Car Hardware & Badges) */}
            <div className={styles.detailsGrid}>
              {/* RC Car & Race Info Card */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeaderWithAction}>
                  <h3 className={styles.cardTitle}>
                    <Radio size={18} color="#38bdf8" />
                    <span>RC Buggy Hardware & Diagnostics</span>
                  </h3>
                </div>

                <div className={styles.registryList}>
                  <div className={styles.registryRow}>
                    <span className={styles.registryLabel}>Chassis & Drive</span>
                    <span className={styles.registryVal}>1/10 4WD RC Buggy</span>
                  </div>
                  <div className={styles.registryRow}>
                    <span className={styles.registryLabel}>Remote 2.4GHz Link</span>
                    <span className={styles.registryStatusOk}>
                      <CheckCircle2 size={13} />
                      <span>Paired & Connected</span>
                    </span>
                  </div>
                  <div className={styles.registryRow}>
                    <span className={styles.registryLabel}>Safety Check</span>
                    <span className={styles.registryStatusOk}>
                      <CheckCircle2 size={13} />
                      <span>Passed (6/6 Verified)</span>
                    </span>
                  </div>
                  <div className={styles.registryRow}>
                    <span className={styles.registryLabel}>Paddock Location</span>
                    <span className={styles.registryVal}>Hanbee Track, Chennai</span>
                  </div>
                </div>
              </div>

              {/* Racer Badges & Trophies */}
              <div className={styles.infoCard}>
                <div className={styles.cardHeaderWithAction}>
                  <h3 className={styles.cardTitle}>
                    <Award size={18} color="#fbbf24" />
                    <span>Official Badges & Accolades</span>
                  </h3>
                  <span className={styles.badgesCountBadge}>
                    4 Earned
                  </span>
                </div>

                <div className={styles.badgesGrid}>
                  {badges.map((badge) => {
                    const IconComponent = badge.icon;
                    return (
                      <div key={badge.id} className={styles.badgeCard}>
                        <div className={styles.badgeTop}>
                          <div 
                            className={styles.badgeIconWrap}
                            style={{ background: badge.bgColor, color: badge.color }}
                          >
                            <IconComponent size={15} />
                          </div>
                          <h4 className={styles.badgeName}>{badge.name}</h4>
                        </div>
                        <p className={styles.badgeDesc}>{badge.desc}</p>
                        <div className={styles.badgeFooter}>
                          <span className={styles.badgeUnlockedTag}>
                            <Check size={11} color="#10b981" />
                            <span>Earned</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
