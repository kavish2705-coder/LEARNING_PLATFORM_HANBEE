"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Copy, Check, Award, Trophy,
  Zap, ArrowLeft, Sparkles,
  MapPin, Lock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./license.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";
import {
  fetchUpcomingTournament, fetchMyTeamFormation, fetchMySchool, type MyTeamFormation, type UpcomingTournament,
  fetchMyLicense, type DriverLicense,
} from "../../../lib/teamFormationApi";
import { getStudentLeaderboard } from "../../../lib/tournamentAdminApi";
import { createLicenseUpiPayment, getUpiPaymentStatus, claimUpiUtr, type PublicUpiPayment } from "../../../lib/upiClient";
import AccessBlocker from "../components/access/AccessBlocker";

export default function DriverLicensePage() {
  return (
    <AccessBlocker direction="add_tournament">
      <DriverLicensePageContent />
    </AccessBlocker>
  );
}

function DriverLicensePageContent() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();
  const { xp } = useUserXp();
  const [copied, setCopied] = useState(false);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [schoolName, setSchoolName] = useState("Independent");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [bestLapMs, setBestLapMs] = useState<number | null>(null);
  const [license, setLicense] = useState<DriverLicense | null>(null);
  const [upiPayment, setUpiPayment] = useState<PublicUpiPayment | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseError, setLicenseError] = useState("");

  const loadLicense = async () => {
    try {
      setLicense(await fetchMyLicense());
    } catch {
      // License card shows its own "couldn't load" state below.
    }
  };

  useEffect(() => {
    void loadLicense();
  }, []);

  // Start (or reopen) a UPI auto-pay payment once we know the license
  // isn't active yet -- codemode-upi-pay's createPayment is itself
  // idempotent for the same order while its QR is still valid, so this is
  // safe to call again on every mount.
  useEffect(() => {
    if (!license || license.status === "active" || upiPayment) return;
    createLicenseUpiPayment()
      .then(setUpiPayment)
      .catch((reason) => setLicenseError(reason instanceof Error ? reason.message : "We couldn't start your payment."));
  }, [license, upiPayment]);

  // Poll for the bank's confirmation while a payment is open -- this is
  // what makes it "automatic": no staff click needed once the alert email
  // is read and matched.
  useEffect(() => {
    if (!upiPayment || upiPayment.status !== "pending") return;
    const timer = setInterval(() => {
      getUpiPaymentStatus(upiPayment.id)
        .then((p) => {
          // The status-poll endpoint deliberately omits `qr` (regenerating
          // that SVG on every 4s poll would be wasted work) -- merge the
          // status fields in instead of replacing the whole object, or the
          // QR vanishes the moment the first poll lands.
          setUpiPayment((current) => (current ? { ...current, ...p, qr: current.qr } : p));
          if (p.status === "paid") void loadLicense();
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [upiPayment]);

  async function handleClaimUtr() {
    if (!upiPayment) return;
    if (!paymentReference.trim()) {
      setLicenseError("Enter the UPI transaction ID / UTR from your payment confirmation.");
      return;
    }
    setLicenseBusy(true);
    setLicenseError("");
    try {
      const r = await claimUpiUtr(upiPayment.id, paymentReference);
      if (r.result === "not_found") {
        setLicenseError("We haven't received that payment yet -- it can take a minute after the bank's alert arrives. Try again shortly.");
      } else if (r.result === "used") {
        setLicenseError("That UTR has already been used for another payment.");
      } else {
        const p = await getUpiPaymentStatus(upiPayment.id);
        setUpiPayment((current) => (current ? { ...current, ...p, qr: current.qr } : p));
        if (p.status === "paid") await loadLicense();
      }
    } catch (reason) {
      setLicenseError(reason instanceof Error ? reason.message : "We couldn't check that UTR.");
    } finally {
      setLicenseBusy(false);
    }
  }

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

      // Realistic electric RC motor whine (idle rev -> peak launch -> shift -> idle)
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
          try {
            const rows = await getStudentLeaderboard(tournamentData.id);
            const mine = rows.find((row) => row.is_current_user);
            if (active && mine) setBestLapMs(mine.average_lap_time_ms);
          } catch {
            // No leaderboard entry yet -- bestLapMs stays null
          }
        }
      } catch {
        // Fallback team and school names are used
      }
    }
    void loadTeam();
    return () => { active = false; };
  }, []);

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

  // Each badge's earned state is computed from real data (a recorded lap,
  // the team actually existing, the local practice checklist actually being
  // complete) -- previously every badge showed "Earned" unconditionally,
  // regardless of whether the student had done anything.
  const practiceChecklistComplete = (() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem("hanbee_rc_inspection");
      if (!raw) return false;
      const status = JSON.parse(raw) as Record<string, boolean>;
      return ["wheels", "body", "motor", "wiring", "remote", "battery"].every((key) => status[key]);
    } catch {
      return false;
    }
  })();

  const badges = [
    {
      id: "quick_lap",
      name: "Quick Lap",
      desc: "Clocked a lap under 14 seconds",
      icon: Zap,
      color: "#38bdf8",
      bgColor: "rgba(56, 189, 248, 0.12)",
      earned: bestLapMs !== null && bestLapMs < 14000,
    },
    {
      id: "pre_race_check",
      name: "Practice Checklist",
      desc: "Checked all 6 items on your practice checklist",
      icon: ShieldCheck,
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.12)",
      earned: practiceChecklistComplete,
    },
    {
      id: "club_driver",
      name: "Registered Racer",
      desc: "Registered a tournament team",
      icon: Trophy,
      color: "#fbbf24",
      bgColor: "rgba(251, 191, 36, 0.12)",
      earned: team !== null,
    },
  ];
  const earnedCount = badges.filter((badge) => badge.earned).length;

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

      {/* Driver License purchase gate -- shown whenever the license isn't active yet */}
      {license && license.status !== "active" && (
        <div className={styles.infoCard}>
          <div className={styles.cardHeaderWithAction}>
            <h3 className={styles.cardTitle}>
              <Lock size={18} color="#fbbf24" />
              <span>Get Your Driver License</span>
            </h3>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            You need an active Driver License before you can enter a tournament.
          </p>

          {license.status === "rejected" && (
            <p role="alert" style={{ fontSize: 14, color: "var(--color-danger)", marginTop: 8 }}>
              Your last payment was rejected. Contact Hanbee staff, or pay again below.
            </p>
          )}

          {upiPayment?.status === "paid" ? (
            <p role="status" style={{ fontSize: 14, color: "var(--color-success)", marginTop: 8 }}>
              Payment confirmed — activating your license…
            </p>
          ) : upiPayment?.status === "expired" ? (
            <div style={{ marginTop: 12 }}>
              <p role="alert" style={{ fontSize: 14, color: "var(--color-danger)" }}>
                This payment window expired before we received it. No charge was made -- start a new one below.
              </p>
              <button
                type="button"
                disabled={licenseBusy}
                onClick={() => { setUpiPayment(null); setPaymentReference(""); setLicenseError(""); }}
                style={{ marginTop: 10, padding: "9px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, border: "none", background: "var(--color-primary)", color: "var(--color-primary-text)", cursor: "pointer" }}
              >
                Start New Payment
              </button>
            </div>
          ) : upiPayment?.status === "underpaid" ? (
            <p role="alert" style={{ fontSize: 14, color: "var(--color-danger)", marginTop: 8 }}>
              We received a payment of ₹{upiPayment.paidAmount} but ₹{upiPayment.payAmount} was expected. This needs a Hanbee staff member to review it manually -- contact them with your payment reference.
            </p>
          ) : upiPayment ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              <p style={{ fontSize: 15 }}>
                License fee: <strong style={{ color: "var(--text-main)" }}>₹{upiPayment.payAmount}</strong>
              </p>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                {upiPayment.qr && (
                  <div
                    style={{ width: 160, height: 160, borderRadius: 10, border: "1px solid var(--border-elevated)", background: "#fff", padding: 8 }}
                    dangerouslySetInnerHTML={{ __html: upiPayment.qr }}
                  />
                )}
                <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420 }}>
                  <p style={{ marginBottom: 6 }}>Pay to UPI ID: <strong style={{ color: "var(--text-main)" }}>{upiPayment.upiId}</strong></p>
                  <p style={{ marginBottom: 6 }}>Scan the QR, or <a href={upiPayment.link} style={{ color: "var(--accent-subtle-text)" }}>open in your UPI app</a>.</p>
                  <p role="status">Waiting for payment… this confirms automatically once your bank processes it — usually within a minute.</p>
                </div>
              </div>

              <label style={{ display: "block", fontSize: 13 }}>
                Already paid but it hasn&apos;t confirmed yet? Enter your UPI transaction ID / UTR
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. 408812345678"
                  maxLength={12}
                  disabled={licenseBusy}
                  style={{ display: "block", marginTop: 4, width: "100%", maxWidth: 320, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-elevated)", background: "var(--bg-input)", color: "var(--text-main)" }}
                />
              </label>
              {licenseError && <p role="alert" style={{ fontSize: 13, color: "var(--color-danger)" }}>{licenseError}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  disabled={licenseBusy}
                  onClick={() => void handleClaimUtr()}
                  style={{
                    padding: "9px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, border: "none",
                    background: licenseBusy ? "var(--btn-secondary-bg)" : "var(--color-primary)",
                    color: licenseBusy ? "var(--text-muted)" : "var(--color-primary-text)",
                    cursor: licenseBusy ? "not-allowed" : "pointer",
                  }}
                >
                  {licenseBusy ? "Checking…" : "Check Payment"}
                </button>
              </div>
            </div>
          ) : (
            <p role="status" style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
              {licenseError || "Starting your payment…"}
            </p>
          )}
        </div>
      )}

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
                    {team?.status === "verified" ? (
                      <span className={styles.statusVerifiedBadge}>● VERIFIED</span>
                    ) : (
                      <span className={styles.statusVerifiedBadge} style={{ background: "transparent", color: "var(--text-muted)" }}>● {team ? "Pending verification" : "Not registered"}</span>
                    )}
                  </div>
                  <p className={styles.driverCallsign}>
                    {teamName} • {schoolName}
                  </p>
                </div>
              </div>

              {/* Gold Smart Chip & Superlicense Class Row */}
              <div className={styles.chipRow}>
                <div className={styles.smartChip} title="2.4GHz Telemetry RFID Microchip">
                  <div className={styles.smartChipInner}>
                    <div className={styles.smartChipLineH} />
                    <div className={styles.smartChipLineV} />
                  </div>
                </div>
                <div className={styles.licenseClassBadge}>
                  <Zap size={12} color="#7dd3e8" />
                  <span>CLASS-A SUPERLICENSE // 4WD RC BUGGY</span>
                </div>
              </div>

              {/* Telemetry Matrix -- only tiles with real data behind them */}
              <div className={styles.statsMatrix}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>BEST LAP</span>
                  <span className={`${styles.statValue} ${styles.statValueAccent}`}>
                    {bestLapMs === null ? "—" : `${(bestLapMs / 1000).toFixed(2)}s`}
                  </span>
                  <span className={`${styles.statSubBadge} ${styles.statSubPurple}`}>
                    {bestLapMs === null ? "NOT RECORDED YET" : "AVG RECORDED LAP"}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>PRACTICE POINTS</span>
                  <span className={styles.statValue}>{xp.toLocaleString()} RP</span>
                  <span className={styles.statSubBadge}>NOT TOURNAMENT RANKING</span>
                </div>
              </div>

              {/* Interactive Cockpit RC Throttle Console (Replaces Loading Bar!) */}
              <div className={`${styles.throttleConsole} ${isRevving ? styles.throttleConsoleRevving : ""}`}>
                <div className={styles.throttleLeft}>
                  <div className={styles.throttleMetaRow}>
                    <span className={styles.throttleLabel}>RC Motor RPM:</span>
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
                  title="Click to test your RC car electric motor sound!"
                >
                  <Zap size={13} />
                  <span>{isRevving ? "REVVED UP!" : "🏎️ Test Throttle"}</span>
                </button>
              </div>

              {/* Driver Signature Stamp */}
              <div className={styles.signatureRow}>
                <span className={styles.signatureLabel}>Driver Signature:</span>
                <span className={styles.signatureText}>{driverName}</span>
                <span className={styles.statusVerifiedBadge} style={{ fontSize: 9 }}>FIA-RC // SEALED</span>
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

          <Link href="/dashboard" className={styles.returnPaddockLink}>
            <span>Back to Race Track & Hub →</span>
          </Link>
        </div>

        {/* Right Column: Next Race Countdown & Badges */}
        <div className={styles.rightCol}>
          
          {/* Next Race Countdown Card */}
          <div className={styles.countdownCard}>
            {tournament ? (
              <>
                <div className={styles.countdownHeader}>
                  <div className={styles.countdownTitleWrap}>
                    <div className={styles.countdownIconWrap}>
                      <Trophy size={16} />
                    </div>
                    <div>
                      <h3 className={styles.countdownTitle}>{tournament.title}</h3>
                      <div className={styles.countdownLocationWrap}>
                        <MapPin size={12} color="var(--text-muted)" />
                        <span className={styles.countdownTrack}>{tournament.venue || "Venue to be announced"}</span>
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
              </>
            ) : (
              <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
                No upcoming races scheduled. Check back later.
              </p>
            )}
          </div>

          {/* Racer Badges & Trophies */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>
                <Award size={18} color="#fbbf24" />
                <span>Racer Badges & Trophies</span>
              </h3>
              <span className={styles.badgesCountBadge}>
                {earnedCount} / {badges.length} Earned
              </span>
            </div>

            <div className={styles.badgesGrid}>
              {badges.map((badge) => {
                const IconComponent = badge.icon;
                return (
                  <div key={badge.id} className={styles.badgeCard} style={{ opacity: badge.earned ? 1 : 0.55 }}>
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
                      {badge.earned ? (
                        <span className={styles.badgeUnlockedTag}>
                          <Check size={11} color="#10b981" />
                          <span>Earned</span>
                        </span>
                      ) : (
                        <span className={styles.badgeUnlockedTag} style={{ color: "var(--text-muted)" }}>
                          <span>Not yet</span>
                        </span>
                      )}
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
