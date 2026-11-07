"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Trophy,
  Gauge,
  Timer,
  Compass,
  BatteryCharging,
  Swords,
} from "lucide-react";
import styles from "./SeasonLeague.module.css";

interface RoundInfo {
  monthNum: number;
  name: string;
  format: string;
  icon: React.ElementType;
}

const SEASON_ROUNDS: RoundInfo[] = [
  {
    monthNum: 1,
    name: "Speed Race",
    format: "5-lap wheel-to-wheel sprint. First across the line wins.",
    icon: Gauge,
  },
  {
    monthNum: 2,
    name: "Time Trial",
    format: "3 solo laps against the clock. Fastest clean lap counts.",
    icon: Timer,
  },
  {
    monthNum: 3,
    name: "Obstacle Challenge",
    format: "Technical course with gates and chicanes. Best of two runs.",
    icon: Compass,
  },
  {
    monthNum: 4,
    name: "Endurance Race",
    format: "10-minute non-stop race. Most completed laps wins.",
    icon: BatteryCharging,
  },
  {
    monthNum: 5,
    name: "Knockout Challenge",
    format: "Head-to-head bracket duels. Best of 3 heats per matchup.",
    icon: Swords,
  },
  {
    monthNum: 6,
    name: "Grand Championship",
    format: "Top 8 race for the title. Everyone else races placement finals.",
    icon: Trophy,
  },
];

export default function SeasonLeague() {
  const [activeMonth, setActiveMonth] = useState(1);
  const current = SEASON_ROUNDS[activeMonth - 1];

  const handlePrev = () =>
    setActiveMonth((p) => (p > 1 ? p - 1 : 6));
  const handleNext = () =>
    setActiveMonth((p) => (p < 6 ? p + 1 : 1));

  return (
    <div className={styles.seasonExplorer}>
      <div className={styles.ribbon}>
        <button onClick={handlePrev} className={styles.ribbonArrow} aria-label="Previous round">
          <ChevronLeft size={16} />
        </button>

        <div className={styles.ribbonTrack}>
          {SEASON_ROUNDS.map((round) => {
            const active = round.monthNum === activeMonth;
            return (
              <button
                key={round.monthNum}
                onClick={() => setActiveMonth(round.monthNum)}
                className={`${styles.station} ${active ? styles.stationActive : ""}`}
              >
                <span className={styles.stationNum}>
                  {String(round.monthNum).padStart(2, "0")}
                </span>
                <span className={styles.stationName}>{round.name}</span>
                {active && (
                  <motion.div
                    layoutId="ribbonIndicator"
                    className={styles.stationIndicator}
                    transition={{ type: "spring", stiffness: 450, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button onClick={handleNext} className={styles.ribbonArrow} aria-label="Next round">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.briefingCard}>
        <div className={styles.glassReflection} />
        <div className={styles.glassPrismGlow} />
        <AnimatePresence mode="wait">
          <motion.div
            key={current.monthNum}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={styles.briefingRow}
          >
            <div className={styles.roundNumber}>
              {String(current.monthNum).padStart(2, "0")}
            </div>

            <div className={styles.roundContent}>
              <h3 className={styles.roundTitle}>{current.name}</h3>
              <p className={styles.roundFormat}>{current.format}</p>
            </div>

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
