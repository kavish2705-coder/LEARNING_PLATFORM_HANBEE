"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Copy, Check, Award, Trophy, 
  Flame, Zap, ArrowLeft, Sparkles, 
  CheckCircle2, Radio, MapPin
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

  // Dynamic Rank & Progression
  const rankNumber = xp >= 1850 ? "#1 Rank" : xp >= 1620 ? "#2 Rank" : xp >= 1490 ? "#3 Rank" : "#4 Rank";
  const rpTarget = 2000;
  const rpPercent = Math.min(100, Math.round((xp / rpTarget) * 100));

  // 3D Holographic Card Interactive Physics
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Smooth subtle pitch & yaw tilt (±7deg)
    setTilt({
      rotateX: (0.5 - y) * 14,
      rotateY: (x - 0.5) * 14,
    });
    setGlarePos({
      x: x * 100,
      y: y * 100,
      opacity: 0.2,
    });
  };

  const handleCardMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const driverName = profile?.full_name || "Student";
  const driverInitials = driverName
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase() || "ST";
  const teamName = team?.name || "No team yet";
  const serialNumber = profile?.id ? `HB-${profile.id.slice(0, 8).toUpperCase()}` : "HB-PENDING";

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
      void navigator.clipboard.writeText(serialNumber);
    }
    setCopied(true);
    setToastMessage(`✓ Copied Driver License ID: ${serialNumber}`);
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

      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            Student Driver License
          </h1>
          <p className={styles.pageSubtitle}>
            Your official RC racing pass, school team, and practice stats.
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

      {/* Balanced 2-Column Main Layout */}
      <div className={styles.licenseGrid}>
        
        {/* Left Column: Driver License Pass + RC Car & Race Info */}
        <div className={styles.leftCol}>
          <div className={styles.licensePerspectiveWrapper}>
            <motion.div 
              className={styles.licenseCard}
              animate={{ 
                rotateX: tilt.rotateX, 
                rotateY: tilt.rotateY,
              }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
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
                  background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.25) 0%, rgba(125, 211, 232, 0.12) 24%, transparent 60%)`,
                  opacity: glarePos.opacity,
                }}
              />

              {/* Card Header */}
              <div className={styles.cardHeader}>
                <div className={styles.cardFederationTitle}>
                  <ShieldCheck size={15} color="#7dd3e8" />
                  <span>HANBEE RACING CLUB // RC SERIES</span>
                </div>
                <div className={styles.licenseSuperBadge}>
                  RACER PASS
                </div>
              </div>

              {/* Driver Profile */}
              <div className={styles.driverRow}>
                <div className={styles.avatarContainer}>
                  {driverInitials}
                </div>

                <div className={styles.driverInfoMeta}>
                  <div className={styles.driverNameWrap}>
                    <h2 className={styles.driverName}>{driverName}</h2>
                    <span className={styles.statusVerifiedBadge}>● VERIFIED</span>
                  </div>
                  <p className={styles.driverCallsign}>
                    [HB-42] {teamName} • {schoolName}
                  </p>
                </div>
              </div>

              {/* Stats Triple Row */}
              <div className={styles.statsTriple}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>BEST LAP</span>
                  <span className={`${styles.statValue} ${styles.statValueAccent}`}>12.84s</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>PRACTICE RP</span>
                  <span className={styles.statValue}>{xp.toLocaleString()} RP</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>TRACK RANK</span>
                  <span className={styles.statValue}>{rankNumber}</span>
                </div>
              </div>

              {/* Practice RP Progression */}
              <div className={styles.xpBox}>
                <div className={styles.xpHeader}>
                  <span>Practice Tier: <strong>Rookie Champ</strong></span>
                  <span>{xp.toLocaleString()} / 2,000 RP ({rpPercent}%)</span>
                </div>
                <div className={styles.xpTrack}>
                  <motion.div 
                    className={styles.xpFill} 
                    initial={{ width: 0 }}
                    animate={{ width: `${rpPercent}%` }}
                    transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                  />
                </div>
              </div>

              {/* Footer Barcode */}
              <div className={styles.cardFooter}>
                <div className={styles.barcodeArea}>
                  <div className={styles.barcodeBar} style={{ width: 2 }} />
                  <div className={styles.barcodeBar} style={{ width: 4 }} />
                  <div className={styles.barcodeBar} style={{ width: 1 }} />
                  <div className={styles.barcodeBar} style={{ width: 3 }} />
                  <div className={styles.barcodeBar} style={{ width: 5 }} />
                  <div className={styles.barcodeBar} style={{ width: 2 }} />
                  <div className={styles.barcodeBar} style={{ width: 1 }} />
                  <div className={styles.barcodeBar} style={{ width: 4 }} />
                  <span className={styles.licenseSerial}>{serialNumber}</span>
                </div>

                <div className={styles.officialBadge}>
                  <span>OFFICIAL PASS</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RC Car & Race Info Card */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>
                <Radio size={18} color="#7dd3e8" />
                <span>RC Car & Race Info</span>
              </h3>
            </div>

            <div className={styles.registryList}>
              <div className={styles.registryRow}>
                <span className={styles.registryLabel}>Car Model</span>
                <span className={styles.registryVal}>4WD RC Buggy</span>
              </div>
              <div className={styles.registryRow}>
                <span className={styles.registryLabel}>Remote Link</span>
                <span className={styles.registryStatusOk}>
                  <CheckCircle2 size={13} />
                  <span>2.4GHz Connected</span>
                </span>
              </div>
              <div className={styles.registryRow}>
                <span className={styles.registryLabel}>Car Status</span>
                <span className={styles.registryStatusOk}>
                  <CheckCircle2 size={13} />
                  <span>Checked & Ready to Drive</span>
                </span>
              </div>
              <div className={styles.registryRow}>
                <span className={styles.registryLabel}>Registered Team</span>
                <span className={styles.registryVal}>{teamName}</span>
              </div>
              <div className={styles.registryRow}>
                <span className={styles.registryLabel}>Track Location</span>
                <span className={styles.registryVal}>Hanbee Track, Chennai</span>
              </div>
            </div>

            <Link href="/dashboard" className={styles.returnPaddockLink}>
              <span>Back to Race Track & Hub →</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Next Race Countdown & Badges */}
        <div className={styles.rightCol}>
          
          {/* Next Race Countdown Card */}
          <div className={styles.countdownCard}>
            <div className={styles.countdownHeader}>
              <div className={styles.countdownTitleWrap}>
                <div className={styles.countdownIconWrap}>
                  <Trophy size={16} />
                </div>
                <div>
                  <h3 className={styles.countdownTitle}>{tournament?.title || "Hanbee RC Cup 2026"}</h3>
                  <div className={styles.countdownLocationWrap}>
                    <MapPin size={12} color="var(--text-muted)" />
                    <span className={styles.countdownTrack}>Hanbee Track, Chennai</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.timerGrid}>
              <div className={styles.timerSegment}>
                <span className={styles.timerNumber}>{String(timeLeft.days).padStart(2, "0")}</span>
                <span className={styles.timerLabel}>DAYS</span>
              </div>
              <div className={styles.timerColon}>:</div>
              <div className={styles.timerSegment}>
                <span className={styles.timerNumber}>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className={styles.timerLabel}>HOURS</span>
              </div>
              <div className={styles.timerColon}>:</div>
              <div className={styles.timerSegment}>
                <span className={styles.timerNumber}>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className={styles.timerLabel}>MINUTES</span>
              </div>
              <div className={styles.timerColon}>:</div>
              <div className={styles.timerSegment}>
                <span className={styles.timerNumber}>{String(timeLeft.seconds).padStart(2, "0")}</span>
                <span className={styles.timerLabel}>SECONDS</span>
              </div>
            </div>
          </div>

          {/* Racer Badges & Trophies */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>
                <Award size={18} color="#fbbf24" />
                <span>Racer Badges & Trophies</span>
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

      </div>
    </div>
  );
}
