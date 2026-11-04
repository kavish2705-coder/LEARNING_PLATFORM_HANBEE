"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  Wrench, 
  Radio, 
  Gauge, 
  Timer, 
  Flag, 
  CheckCircle2, 
  Trophy, 
  Award, 
  Zap, 
  Users2, 
  TrendingUp,
  ShieldAlert
} from "lucide-react";
import styles from "./RaceDaySchedule.module.css";

interface SchedulePhase {
  step: string;
  time: string;
  title: string;
  shortDesc: string;
  trackAction: string;
  pitDuty: string;
  statusBadge: string;
  icon: any;
}

const SCHEDULE_PHASES: SchedulePhase[] = [
  {
    step: "01",
    time: "08:30 AM",
    title: "Safety Inspection & Scrutineering",
    shortDesc: "Team check-in, car scrutineering, and transponder frequency verification.",
    trackAction: "Cars are placed on technical inspection scales to verify ride height, minimum weight, and battery voltage.",
    pitDuty: "Pit crew tests radio failsafe, checks wheel nuts, and confirms infrared transponder signal with timing gates.",
    statusBadge: "PITS OPEN",
    icon: Wrench,
  },
  {
    step: "02",
    time: "09:30 AM",
    title: "Driver Briefing & Track Walk",
    shortDesc: "Track walk, safety flags, track limits, and heat assignment review.",
    trackAction: "Drivers and race directors walk the circuit to inspect apex markers, braking zones, and run-off areas.",
    pitDuty: "Captains review flag signals (yellow, blue, red) and receive official heat lane assignments.",
    statusBadge: "BRIEFING ROOM",
    icon: Radio,
  },
  {
    step: "03",
    time: "10:15 AM",
    title: "Practice & Telemetry Dial-In",
    shortDesc: "Open track warm-up to dial in tire grip, suspension, and trim balance.",
    trackAction: "5-minute open track sessions per group to test track grip levels and ambient surface temperatures.",
    pitDuty: "Fine-tune steering trim on transmitters, adjust shock spring pre-load, and monitor motor heat.",
    statusBadge: "GREEN FLAG",
    icon: Gauge,
  },
  {
    step: "04",
    time: "11:30 AM",
    title: "Qualifying & Wheel-to-Wheel Heats",
    shortDesc: "Official timed runs and wheel-to-wheel heats under optical timing gates.",
    trackAction: "Cars run official heats under live transponder loops to determine starting positions.",
    pitDuty: "Swap in freshly balanced LiPo battery packs and log lap telemetry with Race Control.",
    statusBadge: "TIMED RUNS",
    icon: Timer,
  },
  {
    step: "05",
    time: "02:00 PM",
    title: "Championship Finals & Placement",
    shortDesc: "Main bracket finals alongside consolation placement races.",
    trackAction: "The main grid battles for podium honors, while all other teams compete in placement heats for season points.",
    pitDuty: "All teams race until the final flag — zero elimination means every lap contributes to season standings.",
    statusBadge: "FINALS LIVE",
    icon: Flag,
  },
  {
    step: "06",
    time: "04:00 PM",
    title: "Official Telemetry Verification",
    shortDesc: "Lap data verification, penalty review, and championship points update.",
    trackAction: "Race control audits digital transponder records, reviews contact reports, and calculates official points.",
    pitDuty: "Teams review incident replays with the Race Director if a restart or penalty clarification is needed.",
    statusBadge: "AUDIT IN PROGRESS",
    icon: CheckCircle2,
  },
  {
    step: "07",
    time: "04:45 PM",
    title: "Podium Ceremony & Team Awards",
    shortDesc: "Trophies for Round Winner, Best Driver, Best Teamwork, and Fair Play.",
    trackAction: "Top 3 teams take the podium. Full grid celebrations and next round announcement.",
    pitDuty: "Official photo sessions with school sponsors, mentors, and registered student squads.",
    statusBadge: "PODIUM COMPLETE",
    icon: Trophy,
  },
];

const LEAGUE_AWARDS = [
  { title: "Season Champion", desc: "Highest cumulative points over 6 months", icon: Trophy },
  { title: "Best Driver", desc: "Cleanest overtaking & consistent lap pace", icon: Zap },
  { title: "Best Teamwork", desc: "Fastest pit turnarounds & collaboration", icon: Users2 },
  { title: "Most Improved", desc: "Largest point climb across the calendar", icon: TrendingUp },
  { title: "Fair Play Award", desc: "Exemplary sportsmanship & incident-free racing", icon: ShieldCheck },
];

export default function RaceDaySchedule() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const current = SCHEDULE_PHASES[activeStep];

  const handlePrev = () => {
    setActiveStep((prev) => (prev > 0 ? prev - 1 : SCHEDULE_PHASES.length - 1));
  };

  const handleNext = () => {
    setActiveStep((prev) => (prev < SCHEDULE_PHASES.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={styles.raceDayWrapper}>
      {/* Interactive Time-Scrubber Track */}
      <div className={styles.scrubberStrip}>
        <div className={styles.scrubberTrack}>
          {SCHEDULE_PHASES.map((phase, idx) => {
            const isActive = idx === activeStep;
            const Icon = phase.icon;
            return (
              <button
                key={phase.step}
                onClick={() => setActiveStep(idx)}
                className={`${styles.scrubberNode} ${isActive ? styles.scrubberNodeActive : ""}`}
                aria-label={`Select Phase ${phase.step}: ${phase.title}`}
              >
                <div className={styles.nodeBadge}>
                  <Icon size={14} />
                  <span className={styles.nodeStepNum}>{phase.step}</span>
                </div>
                <div className={styles.nodeMeta}>
                  <span className={styles.nodeTime}>{phase.time}</span>
                  <span className={styles.nodeTitle}>{phase.title.split("&")[0]}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeScrubberGlow"
                    className={styles.nodeActiveGlow}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Futuristic Race Operations Terminal Card */}
      <div className={styles.terminalCard}>
        <div className={styles.terminalWatermark}>{current.step}</div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={styles.terminalContent}
          >
            {/* Header: Phase, Time & Flippers */}
            <div className={styles.terminalHeader}>
              <div className={styles.headerTitleGroup}>
                <div className={styles.phaseTagRow}>
                  <span className={styles.phaseTag}>PHASE {current.step} OF 07</span>
                  <span className={styles.timeTag}>{current.time}</span>
                  <span className={styles.statusLivePill}>{current.statusBadge}</span>
                </div>
                <h3 className={styles.terminalHeading}>{current.title}</h3>
                <p className={styles.terminalSummary}>{current.shortDesc}</p>
              </div>

              {/* Prev / Next controls */}
              <div className={styles.flipperGroup}>
                <button onClick={handlePrev} className={styles.flipperBtn} aria-label="Previous Phase">
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <span className={styles.flipperCount}>
                  <strong>{current.step}</strong> / 07
                </span>
                <button onClick={handleNext} className={styles.flipperBtn} aria-label="Next Phase">
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Split Telemetry Operations: Track Action vs Pit Duty */}
            <div className={styles.operationsGrid}>
              <div className={styles.operationTile}>
                <div className={styles.operationTileHeader}>
                  <div className={styles.opIconWrap}>
                    <Flag size={15} />
                  </div>
                  <strong className={styles.opTitle}>Track Action & Circuit Activity</strong>
                </div>
                <p className={styles.opDesc}>{current.trackAction}</p>
              </div>

              <div className={styles.operationTile}>
                <div className={styles.operationTileHeader}>
                  <div className={styles.opIconWrap}>
                    <Wrench size={15} />
                  </div>
                  <strong className={styles.opTitle}>Pit Crew & Student Technical Duty</strong>
                </div>
                <p className={styles.opDesc}>{current.pitDuty}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Futuristic Fair Play & Race Control Guarantee */}
      <div className={styles.fairControlCard}>
        <div className={styles.fairControlHeader}>
          <div className={styles.beaconWrap}>
            <span className={styles.beaconRadar} />
            <ShieldAlert size={18} className={styles.beaconIcon} />
          </div>
          <div className={styles.fairHeaderText}>
            <span className={styles.fairEyebrow}>RACE CONTROL FAIRNESS PROTOCOL</span>
            <h4 className={styles.fairTitle}>The Zero-Fault Restart Guarantee</h4>
          </div>
        </div>

        <p className={styles.fairDescription}>
          A team that is not at fault in an on-track incident will never lose their race. Fair restarts and rerun opportunities are awarded by Race Control whenever an unavoidable collision occurs. Every registered team stays fully eligible across all six months.
        </p>

        {/* 5 High-Tech Season Awards */}
        <div className={styles.awardsGrid}>
          {LEAGUE_AWARDS.map((award, idx) => {
            const Icon = award.icon;
            return (
              <div key={idx} className={styles.awardCard}>
                <div className={styles.awardIconWrap}>
                  <Icon size={16} />
                </div>
                <div className={styles.awardMeta}>
                  <strong className={styles.awardName}>{award.title}</strong>
                  <span className={styles.awardBrief}>{award.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

