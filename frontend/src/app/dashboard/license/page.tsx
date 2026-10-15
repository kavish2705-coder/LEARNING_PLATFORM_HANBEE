"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, RotateCw, Copy, Check, Award, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./license.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";
import { fetchUpcomingTournament, fetchMyTeamFormation, fetchMySchool, type MyTeamFormation } from "../../../lib/teamFormationApi";

export default function DriverLicensePage() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();
  const { xp } = useUserXp();
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [schoolName, setSchoolName] = useState("Your School");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const rpTarget = 2000;
  const rpPercent = Math.min(100, Math.round((xp / rpTarget) * 100));

  // 3D Holographic Card Interactive Physics
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Ultra smooth subtle pitch & yaw tilt (±7deg)
    setTilt({
      rotateX: (0.5 - y) * 14,
      rotateY: (x - 0.5) * 14,
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
        const [tournament, schoolInfo] = await Promise.all([
          fetchUpcomingTournament(),
          fetchMySchool(),
        ]);
        if (schoolInfo?.name && active) setSchoolName(schoolInfo.name);
        if (tournament && active) {
          const formation = await fetchMyTeamFormation(tournament.id);
          if (active) setTeam(formation.my_team);
        }
      } catch {
        // Fallback team and school names are used
      }
    }
    void loadTeam();
    return () => { active = false; };
  }, []);

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

  return (
    <div className={styles.licensePage}>
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

      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.federationPill}>
            <ShieldCheck size={14} />
            HANBEE RACING // DRIVER PASS
          </div>
          <h1 className={styles.pageTitle}>
            Student Driver License
          </h1>
          <p className={styles.pageSubtitle}>
            Your official remote controlled racing pass, verified school team, and practice simulator RP.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button 
            type="button" 
            className={styles.actionBtnSecondary}
            onClick={handleCopySerial}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? "Copied ID" : "Copy ID"}</span>
          </button>
          <Link href="/dashboard" className={styles.actionBtnPrimary}>
            <ArrowLeft size={14} />
            <span>Race Overview</span>
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <div className={styles.licenseGrid}>
        
        {/* Left Column: 3D Holographic Driver Card */}
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
            {/* Dynamic Specular Shimmer Spot following cursor */}
            <div 
              className={styles.cardSpecularGlare}
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.28) 0%, rgba(125, 211, 232, 0.15) 24%, transparent 60%)`,
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
                <h2 className={styles.driverName}>{driverName}</h2>
                <p className={styles.driverCallsign}>
                  {teamName} • {schoolName}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isFlipped ? (
                <motion.div
                  key="front-stats"
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Front Stats */}
                  <div className={styles.statsTriple}>
                    <div className={styles.statItem} title="Practice Simulation Race Points (Saved to local browser profile)">
                      <span className={styles.statLabel}>PRACTICE RP</span>
                      <span className={styles.statValue}>{xp.toLocaleString()} RP</span>
                    </div>
                  </div>

                  {/* RP Progression */}
                  <div className={styles.xpBox}>
                    <div className={styles.xpHeader}>
                      <span>Practice Tier: <strong>Rookie Champ</strong></span>
                      <span title="Stored locally in browser">{xp.toLocaleString()} / 2,000 RP ({rpPercent}%)</span>
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
                </motion.div>
              ) : (
                <motion.div
                  key="car-specs"
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Flipped Simple & Cool RC Car Parts */}
                  <div className={styles.specsSheet}>
                    <div className={styles.specRow}>
                      <span className={styles.specKey}>Toy Motor</span>
                      <span className={styles.specVal}>Standard DC Electric Motor</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specKey}>Drive Type</span>
                      <span className={styles.specVal}>4-Wheel Drive (All 4 wheels spin)</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specKey}>Remote Control</span>
                      <span className={styles.specVal}>2.4GHz Handheld Remote</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specKey}>Steering</span>
                      <span className={styles.specVal}>Left / Right Turning Motor</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specKey}>Driving Range</span>
                      <span className={styles.specVal}>About 30-40 Meters</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specKey}>Battery</span>
                      <span className={styles.specVal}>Rechargeable Toy Battery Pack</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer Barcode & Flip Button */}
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

              <motion.button 
                type="button" 
                className={styles.flipCardBtn} 
                onClick={() => setIsFlipped(!isFlipped)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <motion.span 
                  animate={{ rotate: isFlipped ? 180 : 0 }} 
                  transition={{ type: "spring", stiffness: 350, damping: 22 }}
                  style={{ display: "inline-flex" }}
                >
                  <RotateCw size={13} />
                </motion.span>
                <span>{isFlipped ? "View Front Pass" : "View Car Parts"}</span>
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className={styles.sidebarCol}>
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>
              <Award size={18} color="#fbbf24" />
              <span>Achievements</span>
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              See your real earned milestones on the{" "}
              <Link href="/dashboard/achievements">Achievements page</Link>.
            </p>

            <Link href="/dashboard" className={styles.returnPaddockLink}>
              <span>Back to Race Track & Hub →</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
