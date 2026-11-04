"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wrench,
  Radio,
  Gauge,
  Timer,
  Flag,
  CheckCircle2,
  Trophy,
  Zap,
  Users2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import styles from "./RaceDaySchedule.module.css";

interface Phase {
  time: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

const PHASES: Phase[] = [
  { time: "08:30", title: "Safety Inspection", desc: "Check-in and car inspection.", icon: Wrench },
  { time: "09:30", title: "Driver Briefing", desc: "Track walk and driver briefing.", icon: Radio },
  { time: "10:15", title: "Practice", desc: "Open warm-up sessions.", icon: Gauge },
  { time: "11:30", title: "Qualifying", desc: "Timed heats under official timing.", icon: Timer },
  { time: "14:00", title: "Finals", desc: "Championship and placement races.", icon: Flag },
  { time: "16:00", title: "Verification", desc: "Lap data audit and points update.", icon: CheckCircle2 },
  { time: "16:45", title: "Podium Ceremony", desc: "Trophies and team awards.", icon: Trophy },
];

const AWARDS = [
  { title: "Season Champion", icon: Trophy },
  { title: "Best Driver", icon: Zap },
  { title: "Best Teamwork", icon: Users2 },
  { title: "Most Improved", icon: TrendingUp },
  { title: "Fair Play", icon: ShieldCheck },
];

export default function RaceDaySchedule() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className={styles.wrapper}>
      <div className={styles.timeline}>
        {PHASES.map((phase, idx) => {
          const active = idx === activeIdx;
          const passed = idx < activeIdx;
          const Icon = phase.icon;

          return (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`${styles.timelineRow} ${active ? styles.timelineRowActive : ""}`}
            >
              <span className={styles.timeCol}>{phase.time}</span>

              <div className={styles.lineCol}>
                <div
                  className={`${styles.lineSegmentTop} ${idx === 0 ? styles.hidden : ""} ${
                    passed || active ? styles.lineFilled : ""
                  }`}
                />
                <div className={`${styles.node} ${active ? styles.nodeActive : ""} ${passed ? styles.nodePassed : ""}`} />
                <div
                  className={`${styles.lineSegmentBottom} ${idx === PHASES.length - 1 ? styles.hidden : ""} ${
                    passed ? styles.lineFilled : ""
                  }`}
                />
              </div>

              <div className={styles.contentCol}>
                <div className={styles.phaseHeader}>
                  <Icon size={16} className={styles.phaseIcon} />
                  <h4 className={styles.phaseTitle}>{phase.title}</h4>
                </div>
                {active && (
                  <motion.p
                    className={styles.phaseDesc}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {phase.desc}
                  </motion.p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className={styles.awardsRow}>
        {AWARDS.map((award, i) => {
          const Icon = award.icon;
          return (
            <div key={i} className={styles.awardPill}>
              <Icon size={14} />
              <span>{award.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
