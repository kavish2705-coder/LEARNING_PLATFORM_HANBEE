"use client";

import { useState } from "react";
import {
  Wrench,
  Radio,
  Gauge,
  Timer,
  Flag,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import styles from "./RaceDaySchedule.module.css";

interface Phase {
  step: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

const PHASES: Phase[] = [
  { step: "01", title: "Safety check-in", desc: "Check in with your team, have your car inspected, and confirm your transponder frequency.", icon: Wrench },
  { step: "02", title: "Driver briefing", desc: "Walk the track, review the safety flags and track limits, and find out your heat assignment.", icon: Radio },
  { step: "03", title: "Practice laps", desc: "Get out on the track and fine-tune your tire grip, suspension, and trim.", icon: Gauge },
  { step: "04", title: "Qualifying & heats", desc: "Set your official time, then take on wheel-to-wheel heats timed by optical gates.", icon: Timer },
  { step: "05", title: "Finals & placement", desc: "Race the championship bracket or take your place in the placement finals.", icon: Flag },
  { step: "06", title: "Results check", desc: "We verify lap data, review penalties, and update the championship points.", icon: CheckCircle2 },
  { step: "07", title: "Podium & awards", desc: "Celebrate the round winner, best driver, best teamwork, and fair play.", icon: Trophy },
];

export default function RaceDaySchedule() {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  return (
    <div className={styles.wrapper}>
      {/* Centered Roadmap Timeline */}
      <div className={styles.roadmapTimeline}>
        <div className={styles.centerSpineLine} />

        {PHASES.map((phase, idx) => {
          const isActive = idx === activeIdx;
          const isPassed = idx < activeIdx;
          const isEven = idx % 2 === 0;
          const Icon = phase.icon;

          return (
            <div
              key={phase.step}
              className={`${styles.roadmapRow} ${isEven ? styles.rowEven : styles.rowOdd} ${isActive ? styles.rowActive : ""}`}
            >
              {/* Left Column (Card if Even, Meta Pill if Odd) */}
              <div className={`${styles.sideCol} ${styles.leftCol}`}>
                {isEven ? (
                  <button
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`${styles.phaseCard} ${isActive ? styles.cardActive : ""}`}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.iconWrap}>
                        <Icon size={16} />
                      </div>
                      <div className={styles.titleWrap}>
                        <span className={styles.phaseStep}>PHASE {phase.step}</span>
                        <h4 className={styles.phaseTitle}>{phase.title}</h4>
                      </div>
                    </div>
                    <p className={styles.phaseDesc}>{phase.desc}</p>
                  </button>
                ) : (
                  <div className={styles.metaBadgeWrapRight}>
                    <span className={styles.metaPhasePill}>PHASE {phase.step}</span>
                  </div>
                )}
              </div>

              {/* Center Column: Spine & Central Radar Node */}
              <div className={styles.centerCol}>
                <div
                  className={`${styles.spineSegmentTop} ${idx === 0 ? styles.hidden : ""} ${
                    isPassed || isActive ? styles.spineFilled : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`${styles.centerNode} ${isActive ? styles.nodeActive : ""} ${isPassed ? styles.nodePassed : ""}`}
                  aria-label={`Select ${phase.title}`}
                >
                  {isActive && <span className={styles.nodeRadarPulse} />}
                  <span className={styles.nodeCore} />
                </button>
                <div
                  className={`${styles.spineSegmentBottom} ${idx === PHASES.length - 1 ? styles.hidden : ""} ${
                    isPassed ? styles.spineFilled : ""
                  }`}
                />
              </div>

              {/* Right Column (Meta Pill if Even, Card if Odd) */}
              <div className={`${styles.sideCol} ${styles.rightCol}`}>
                {isEven ? (
                  <div className={styles.metaBadgeWrapLeft}>
                    <span className={styles.metaPhasePill}>PHASE {phase.step}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`${styles.phaseCard} ${isActive ? styles.cardActive : ""}`}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.iconWrap}>
                        <Icon size={16} />
                      </div>
                      <div className={styles.titleWrap}>
                        <span className={styles.phaseStep}>PHASE {phase.step}</span>
                        <h4 className={styles.phaseTitle}>{phase.title}</h4>
                      </div>
                    </div>
                    <p className={styles.phaseDesc}>{phase.desc}</p>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
