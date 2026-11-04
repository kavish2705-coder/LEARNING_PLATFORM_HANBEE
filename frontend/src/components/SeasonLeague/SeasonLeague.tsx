import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft,
  Flag,
  Target,
  ShieldCheck,
  Trophy,
  Gauge,
  Timer,
  Compass,
  BatteryCharging,
  Swords
} from "lucide-react";
import styles from "./SeasonLeague.module.css";

interface RoundInfo {
  monthNum: number;
  monthLabel: string;
  name: string;
  question: string;
  theRace: string;
  whatCounts: string;
  fairPlay: string;
  pointsHighlight: string;
  icon: any;
}

const SEASON_ROUNDS: RoundInfo[] = [
  {
    monthNum: 1,
    monthLabel: "Month 1",
    name: "Speed Race",
    question: "Who can race fastest and finish cleanly?",
    theRace: "5 laps on the track. Cars line up together on the starting grid and race wheel-to-wheel.",
    whatCounts: "The first car across the finish line takes 1st place and 25 championship points.",
    fairPlay: "Avoidable crashing gets a time penalty. If another car spins you out, race control gives you a fair restart.",
    pointsHighlight: "1st: 25 pts · 2nd: 18 pts · 3rd: 15 pts",
    icon: Gauge,
  },
  {
    monthNum: 2,
    monthLabel: "Month 2",
    name: "Time Trial",
    question: "Who can complete the track in the shortest time?",
    theRace: "3 solo laps against the stopwatch. Only one car on the track at a time — pure driver focus.",
    whatCounts: "Your team's single fastest clean lap goes onto the official season leaderboard.",
    fairPlay: "No other cars to bump into. Just stay inside track limits — smooth steering wins over wheelspin.",
    pointsHighlight: "Fastest single valid lap wins 25 pts",
    icon: Timer,
  },
  {
    monthNum: 3,
    monthLabel: "Month 3",
    name: "Obstacle Challenge",
    question: "Who has the sharpest steering and car control?",
    theRace: "A technical course marked with gates, chicanes, and tight corners where raw speed won't help.",
    whatCounts: "Fastest time through all gates. Two scored runs per team — only your best run counts.",
    fairPlay: "Hitting or missing a gate adds penalty seconds to your time. Smooth, accurate driving wins here.",
    pointsHighlight: "Best clean run earns 25 pts",
    icon: Compass,
  },
  {
    monthNum: 4,
    monthLabel: "Month 4",
    name: "Endurance Race",
    question: "Who can keep racing consistently for 10 full minutes?",
    theRace: "A non-stop 10-minute race. A real test of hardware reliability and calm driving without spinning out.",
    whatCounts: "Teams are ranked by total completed laps before the 10-minute buzzer goes off.",
    fairPlay: "Don't overheat the motor or drain battery in lap 1. Pacing and steady consistency take the podium.",
    pointsHighlight: "Most laps completed earns 25 pts",
    icon: BatteryCharging,
  },
  {
    monthNum: 5,
    monthLabel: "Month 5",
    name: "Knockout Challenge",
    question: "Who can win head-to-head duels under pressure?",
    theRace: "Teams race in pairs (best of 3 heats). Winners move forward; defeated cars race in consolation heats.",
    whatCounts: "Win your duel to advance up the bracket toward the round final.",
    fairPlay: "Nobody is knocked out of the league. Even defeated teams continue racing to earn season points.",
    pointsHighlight: "Bracket winner earns 25 pts",
    icon: Swords,
  },
  {
    monthNum: 6,
    monthLabel: "Month 6",
    name: "Grand Championship",
    question: "Who takes home the Season 1 Championship Trophy?",
    theRace: "The season finale! The top 8 teams on points race for the title. All other teams race in placement finals.",
    whatCounts: "Your Month 6 final points are added to Months 1–5 total points to crown the Season Champion.",
    fairPlay: "Special awards for everyone: Best Driver, Best Teamwork, Most Improved, and Fair Play Award.",
    pointsHighlight: "Total 6-month points decide the Champion",
    icon: Trophy,
  },
];

export default function SeasonLeague() {
  const [activeMonth, setActiveMonth] = useState<number>(1);
  const currentRound = SEASON_ROUNDS[activeMonth - 1];

  const handlePrev = () => {
    setActiveMonth((prev) => (prev > 1 ? prev - 1 : 6));
  };

  const handleNext = () => {
    setActiveMonth((prev) => (prev < 6 ? prev + 1 : 1));
  };

  // Keyboard navigation for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const prevRound = SEASON_ROUNDS[(activeMonth - 2 + 6) % 6];
  const nextRound = SEASON_ROUNDS[activeMonth % 6];

  return (
    <div className={styles.seasonExplorer}>
      {/* 6-Month Track Dial: Interactive Circuit Roadmap */}
      <div className={styles.circuitRibbon}>
        <div className={styles.circuitTrack}>
          {SEASON_ROUNDS.map((round) => {
            const isActive = round.monthNum === activeMonth;
            const Icon = round.icon;
            return (
              <button
                key={round.monthNum}
                onClick={() => setActiveMonth(round.monthNum)}
                className={`${styles.stationBtn} ${isActive ? styles.stationActive : ""}`}
                aria-label={`Switch to ${round.monthLabel}: ${round.name}`}
              >
                <div className={styles.stationBadge}>
                  <span className={styles.stationNumber}>{String(round.monthNum).padStart(2, "0")}</span>
                </div>
                <div className={styles.stationMeta}>
                  <span className={styles.stationMonth}>{round.monthLabel}</span>
                  <strong className={styles.stationTitle}>{round.name}</strong>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeStationGlow"
                    className={styles.stationGlow}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Race Briefing Card */}
      <div className={styles.briefingCard}>
        {/* Subtle Background Watermark Number */}
        <div className={styles.cardWatermark}>
          {String(currentRound.monthNum).padStart(2, "0")}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentRound.monthNum}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={styles.briefingBody}
          >
            {/* Top Bar: Headline & Quick Nav */}
            <div className={styles.cardHeader}>
              <div className={styles.headerLeft}>
                <div className={styles.stageTag}>
                  <span className={styles.stageDot} />
                  <span>MONTH {currentRound.monthNum} OF 6</span>
                </div>
                <h3 className={styles.roundTitle}>{currentRound.name}</h3>
                <p className={styles.roundQuestion}>&ldquo;{currentRound.question}&rdquo;</p>
              </div>

              {/* Quick Arrow Flippers */}
              <div className={styles.headerControls}>
                <button onClick={handlePrev} className={styles.flipBtn} title={`Go to ${prevRound.name}`}>
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <div className={styles.roundIndicator}>
                  <strong>{currentRound.monthNum}</strong> / 6
                </div>
                <button onClick={handleNext} className={styles.flipBtn} title={`Go to ${nextRound.name}`}>
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* 3 Simple Paddock Cards: Format, What Counts, Fair Play */}
            <div className={styles.threePillarsGrid}>
              <div className={styles.pillarCard}>
                <div className={styles.pillarHeader}>
                  <div className={styles.pillarIconWrap}>
                    <Flag size={16} />
                  </div>
                  <strong className={styles.pillarHeading}>The Race Setup</strong>
                </div>
                <p className={styles.pillarText}>{currentRound.theRace}</p>
              </div>

              <div className={styles.pillarCard}>
                <div className={styles.pillarHeader}>
                  <div className={styles.pillarIconWrap}>
                    <Target size={16} />
                  </div>
                  <strong className={styles.pillarHeading}>How You Win</strong>
                </div>
                <p className={styles.pillarText}>{currentRound.whatCounts}</p>
              </div>

              <div className={styles.pillarCard}>
                <div className={styles.pillarHeader}>
                  <div className={styles.pillarIconWrap}>
                    <ShieldCheck size={16} />
                  </div>
                  <strong className={styles.pillarHeading}>Fair Play Rule</strong>
                </div>
                <p className={styles.pillarText}>{currentRound.fairPlay}</p>
              </div>
            </div>


          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
