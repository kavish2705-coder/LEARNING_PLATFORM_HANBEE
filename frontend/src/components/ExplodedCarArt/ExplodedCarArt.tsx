"use client";

import { motion, type Variants } from "framer-motion";
import styles from "./ExplodedCarArt.module.css";

// Blueprint-style line-art of a modern open-wheel race car, AI-generated
// as real separate SVG part groups (front wing, nose, chassis, halo,
// sidepod, engine cover, rear wing, diffuser, two wheel+wishbone
// assemblies) via Gemini, then hand-reviewed and corrected (rear wing
// re-seated closer to the body) before being wired into this animation.
// Each part starts at an "exploded" transform and settles into its
// assembled position once, the first time this scrolls into view.

const line = (opacity = 1) => `rgba(255,255,255,${opacity})`;

function part(from: { x?: number; y?: number; rotate?: number; scale?: number }, delay: number): Variants {
  return {
    hidden: { x: from.x ?? 0, y: from.y ?? 0, rotate: from.rotate ?? 0, scale: from.scale ?? 1, opacity: 0 },
    show: { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, transition: { duration: 1.05, delay, ease: [0.16, 1, 0.3, 1] } },
  };
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0 } } };
const badgeVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 1.6, ease: [0.16, 1, 0.3, 1] } },
};
const guidesVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export default function ExplodedCarArt() {
  return (
    <motion.svg
      viewBox="0 0 1000 460"
      className={styles.svg}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={container}
      role="img"
      aria-label="A HANBEE RC race car, shown exploded and assembling into its final form"
    >
      {/* blueprint guide/dimension lines, faint and static -- just fades in */}
      <motion.g variants={guidesVariants} stroke={line(0.25)} strokeDasharray="4,4" strokeWidth={0.75} fill="none">
        <line x1="50" y1="385" x2="950" y2="385" />
        <line x1="285" y1="80" x2="285" y2="410" />
        <line x1="720" y1="80" x2="720" y2="410" />
        <line x1="50" y1="120" x2="950" y2="120" />
        <line x1="50" y1="210" x2="950" y2="210" />
        <path d="M 120 405 L 120 425 M 120 415 L 285 415 M 285 405 L 285 425" />
        <path d="M 285 405 L 285 425 M 285 415 L 720 415 M 720 405 L 720 425" />
        <path d="M 720 405 L 720 425 M 720 415 L 890 415 M 890 405 L 890 425" />
        <circle cx="285" cy="335" r="55" />
        <circle cx="720" cy="335" r="55" />
      </motion.g>

      {/* front wheel + wishbones, slides in from the left */}
      <motion.g variants={part({ x: -170, y: -8, rotate: 10 }, 0.14)} stroke={line()} strokeWidth={2} fill="none">
        <rect x="230" y="280" width="110" height="110" rx="20" ry="20" />
        <circle cx="285" cy="335" r="48" stroke={line(0.7)} strokeWidth={1} />
        <circle cx="285" cy="335" r="32" strokeWidth={2.5} />
        <circle cx="285" cy="335" r="8" fill={line(0.8)} />
        <line x1="285" y1="303" x2="285" y2="327" />
        <line x1="285" y1="343" x2="285" y2="367" />
        <line x1="253" y1="335" x2="277" y2="335" />
        <line x1="293" y1="335" x2="317" y2="335" />
        <line x1="262" y1="312" x2="279" y2="325" />
        <line x1="291" y1="345" x2="308" y2="358" />
        <line x1="262" y1="358" x2="279" y2="345" />
        <line x1="291" y1="325" x2="308" y2="312" />
        <path d="M 285 300 L 390 245 M 285 330 L 405 255 M 285 365 L 390 270" stroke={line(0.9)} strokeWidth={1.5} />
        <path d="M 390 245 L 405 255 L 390 270 Z" fill="rgba(255,255,255,0.15)" strokeWidth={1} />
      </motion.g>

      {/* rear wheel + wishbones, slides in from the right */}
      <motion.g variants={part({ x: 170, y: -8, rotate: -10 }, 0.1)} stroke={line()} strokeWidth={2} fill="none">
        <rect x="665" y="275" width="110" height="115" rx="18" ry="18" />
        <circle cx="720" cy="333" r="50" stroke={line(0.7)} strokeWidth={1} />
        <circle cx="720" cy="333" r="34" strokeWidth={2.5} />
        <circle cx="720" cy="333" r="8" fill={line(0.8)} />
        <line x1="720" y1="299" x2="720" y2="325" />
        <line x1="720" y1="341" x2="720" y2="367" />
        <line x1="686" y1="333" x2="712" y2="333" />
        <line x1="728" y1="333" x2="754" y2="333" />
        <line x1="696" y1="309" x2="713" y2="322" />
        <line x1="727" y1="344" x2="744" y2="357" />
        <line x1="696" y1="357" x2="713" y2="344" />
        <line x1="727" y1="322" x2="744" y2="309" />
        <path d="M 720 298 L 630 250 M 720 333 L 615 260 M 720 368 L 630 275" stroke={line(0.9)} strokeWidth={1.5} />
      </motion.g>

      {/* front wing: main plane + flap + endplates, slides in low from the front */}
      <motion.g variants={part({ x: -220, y: 30, rotate: -12 }, 0.34)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 95 372 L 205 372 L 200 380 L 100 380 Z" strokeWidth={1.5} />
        <path d="M 110 364 L 195 364 L 190 368 L 115 368 Z" strokeWidth={1.5} />
        <rect x="92" y="352" width="8" height="32" rx="2" />
        <rect x="202" y="352" width="7" height="32" rx="2" />
        <path d="M 145 352 L 145 330 M 170 352 L 165 330" strokeWidth={1.5} />
      </motion.g>

      {/* nose, drops in from above */}
      <motion.g variants={part({ y: -140, rotate: -6 }, 0.48)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 150 325 C 200 325, 230 310, 315 250 L 315 235 C 240 280, 200 310, 150 310 Z" />
        <path d="M 150 310 L 150 325" />
        <path d="M 235 298 L 245 295 L 245 302 Z" fill="rgba(255,255,255,0.2)" strokeWidth={1} />
      </motion.g>

      {/* chassis tub, the anchor piece, settles with a gentle scale-in */}
      <motion.g variants={part({ scale: 0.93, y: -16 }, 0)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 315 235 L 500 230 L 610 255 L 610 320 L 315 320 Z" />
        <path d="M 315 320 L 760 320 L 800 355 L 315 355 Z" strokeWidth={1.5} />
        <path d="M 430 220 C 450 216, 490 216, 520 220" strokeWidth={1.5} />
        <path d="M 505 210 L 535 210 L 530 220 L 510 220 Z" strokeWidth={1.5} />
      </motion.g>

      {/* halo, drops straight down onto the cockpit */}
      <motion.g variants={part({ y: -100 }, 0.6)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 445 220 L 475 192 L 515 220" strokeWidth={2.5} />
        <line x1="475" y1="192" x2="475" y2="220" strokeWidth={2} />
        <path d="M 450 218 C 475 196, 500 196, 510 218" stroke={line(0.5)} strokeWidth={1} />
      </motion.g>

      {/* sidepod with undercut, slides in from below */}
      <motion.g variants={part({ y: 100, scale: 0.92 }, 0.38)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 410 248 C 410 248, 440 235, 475 240 C 530 248, 590 250, 630 280 L 630 320 L 410 320 Z" />
        <path d="M 410 248 L 422 250 L 422 300 L 410 300 Z" strokeWidth={1.5} />
        <path d="M 460 252 L 560 262" stroke={line(0.6)} strokeWidth={1} />
        <path d="M 470 256 L 550 266" stroke={line(0.6)} strokeWidth={1} />
        <path d="M 480 260 L 540 270" stroke={line(0.6)} strokeWidth={1} />
      </motion.g>

      {/* engine cover, slides in from above */}
      <motion.g variants={part({ y: -90, x: 40 }, 0.52)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 515 220 C 530 200, 560 170, 640 170 C 700 170, 730 210, 760 250 L 630 250 C 570 245, 540 230, 515 220 Z" />
        <ellipse cx="530" cy="198" rx="7" ry="11" />
        <path d="M 560 185 L 750 230 L 750 185 Z" strokeWidth={1.5} />
      </motion.g>

      {/* rear wing: main plane + DRS flap + endplates + swan-neck mounts, drops in from upper right */}
      <motion.g variants={part({ x: 180, y: -120, rotate: 16 }, 0.56)} stroke={line()} strokeWidth={2} fill="none">
        <g transform="translate(-8,22)">
          <path d="M 725 125 C 725 155, 735 185, 740 210 M 765 125 C 765 155, 775 185, 780 210" strokeWidth={2} />
          <path d="M 685 125 L 835 115 L 830 125 L 690 135 Z" />
          <path d="M 688 112 L 833 103 L 832 110 L 689 119 Z" />
          <path d="M 680 95 L 840 85 L 845 155 L 685 160 Z" strokeWidth={1.5} />
          <path d="M 700 105 L 720 103 M 700 115 L 720 113 M 700 125 L 720 123" stroke={line(0.7)} strokeWidth={1} />
        </g>
      </motion.g>

      {/* diffuser, slides out from under the car */}
      <motion.g variants={part({ y: 40 }, 0.42)} stroke={line()} strokeWidth={2} fill="none">
        <path d="M 760 320 L 845 355 L 760 355 Z" />
        <line x1="785" y1="332" x2="795" y2="355" strokeWidth={1.25} />
        <line x1="810" y1="338" x2="825" y2="355" strokeWidth={1.25} />
        <line x1="832" y1="344" x2="842" y2="355" strokeWidth={1.25} />
        <ellipse cx="755" cy="225" rx="5" ry="8" />
      </motion.g>

      {/* badge: #09 roundel + HANBEE wordmark, reveals last */}
      <motion.g variants={badgeVariants}>
        <circle cx="470" cy="280" r="19" fill="none" stroke={line()} strokeWidth={1.6} />
        <text x="470" y="287" textAnchor="middle" fontSize="17" fontFamily="var(--font-heading)" fill={line()} letterSpacing="0.5">09</text>
        <text x="560" y="300" fontSize="12" fontFamily="var(--font-body)" fill={line(0.6)} letterSpacing="4" textAnchor="middle">HANBEE</text>
      </motion.g>

      {/* decorative sparkle accent, bottom right */}
      <motion.g variants={badgeVariants} opacity={0.5}>
        <path d="M 930 400 L 934 412 L 946 416 L 934 420 L 930 432 L 926 420 L 914 416 L 926 412 Z" fill={line(0.55)} />
      </motion.g>
    </motion.svg>
  );
}
