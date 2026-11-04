"use client";

import { motion, type Variants } from "framer-motion";
import styles from "./ExplodedCarArt.module.css";

// Hand-authored blueprint-style line-art of a stylized race car, built as
// real separate SVG part groups (not a raster trace) so each one can be
// animated independently -- front wing, nose/cockpit, sidepod, rear wing,
// four wheel+strut assemblies, and the badge/wordmark. Each part starts at
// an "exploded" transform (translated/rotated away from its resting spot,
// matching the reference's exploded-diagram language) and settles into its
// assembled position once, the first time this scrolls into view.

const STROKE = "rgba(255,255,255,0.86)";
const STROKE_DIM = "rgba(255,255,255,0.5)";

function part(from: { x?: number; y?: number; rotate?: number; scale?: number }, delay: number): Variants {
  return {
    hidden: {
      x: from.x ?? 0,
      y: from.y ?? 0,
      rotate: from.rotate ?? 0,
      scale: from.scale ?? 1,
      opacity: 0,
    },
    show: {
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      transition: { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] },
    },
  };
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0 } },
};

const badgeVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 1.5, ease: [0.16, 1, 0.3, 1] } },
};

function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={44} fill="none" stroke={STROKE} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={20} fill="none" stroke={STROKE_DIM} strokeWidth={1.4} />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * 20;
        const y1 = cy + Math.sin(rad) * 20;
        const x2 = cx + Math.cos(rad) * 40;
        const y2 = cy + Math.sin(rad) * 40;
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE_DIM} strokeWidth={1} />;
      })}
    </g>
  );
}

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
      <defs>
        <radialGradient id="carVignette" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="1000" height="460" fill="url(#carVignette)" />

      {/* ground shadow, static */}
      <ellipse cx="490" cy="400" rx="380" ry="14" fill="rgba(255,255,255,0.05)" />

      {/* rear-left strut + wheel -- slides in from the left */}
      <motion.g variants={part({ x: -140, y: 10, rotate: -8 }, 0.05)}>
        <line x1="742" y1="330" x2="700" y2="350" stroke={STROKE_DIM} strokeWidth={1.5} />
        <line x1="742" y1="330" x2="705" y2="300" stroke={STROKE_DIM} strokeWidth={1.5} />
        <Wheel cx={760} cy={338} />
      </motion.g>

      {/* front wheel+strut -- slides in from the left */}
      <motion.g variants={part({ x: -150, y: -6, rotate: 10 }, 0.15)}>
        <line x1="236" y1="320" x2="280" y2="345" stroke={STROKE_DIM} strokeWidth={1.5} />
        <line x1="236" y1="320" x2="268" y2="295" stroke={STROKE_DIM} strokeWidth={1.5} />
        <Wheel cx={220} cy={338} />
      </motion.g>

      {/* front wing -- slides in from off-canvas front-left */}
      <motion.g variants={part({ x: -200, y: 40, rotate: -14 }, 0.3)}>
        <path
          d="M40 356 L220 356 L220 364 L40 364 Z M40 346 L40 374 L54 374 L54 346 Z M206 346 L206 374 L220 374 L220 346 Z"
          fill="none" stroke={STROKE} strokeWidth={1.8} strokeLinejoin="round"
        />
        <path d="M70 356 L70 364 M110 356 L110 364 M150 356 L150 364 M190 356 L190 364" stroke={STROKE_DIM} strokeWidth={1} />
      </motion.g>

      {/* nose cone -- drops in from above */}
      <motion.g variants={part({ y: -120, rotate: -6 }, 0.45)}>
        <path
          d="M70 310 C 110 280, 150 262, 198 256 C 220 253, 234 258, 240 268 L 236 292 C 210 288, 180 292, 150 300 C 120 308, 95 312, 70 310 Z"
          fill="none" stroke={STROKE} strokeWidth={2} strokeLinejoin="round"
        />
      </motion.g>

      {/* cockpit / chassis tub -- the anchor piece, settles with a gentle scale-in */}
      <motion.g variants={part({ scale: 0.92, y: -14 }, 0)}>
        <path
          d="M236 268 C 300 236, 380 222, 430 222 C 480 222, 520 232, 560 248 C 610 268, 650 288, 690 300 L 690 320 C 600 312, 520 300, 460 296 C 390 292, 320 294, 260 300 C 250 292, 240 280, 236 268 Z"
          fill="none" stroke={STROKE} strokeWidth={2.2} strokeLinejoin="round"
        />
        {/* halo */}
        <path d="M400 222 C 404 196, 440 184, 468 198 C 486 207, 490 222, 486 234" fill="none" stroke={STROKE} strokeWidth={2} />
        {/* cockpit opening */}
        <path d="M340 252 C 368 240, 404 236, 436 240 C 450 242, 456 250, 452 258 C 414 250, 376 252, 344 262 C 340 259, 338 255, 340 252 Z" fill="none" stroke={STROKE_DIM} strokeWidth={1.4} />
      </motion.g>

      {/* sidepod intake -- slides up from below */}
      <motion.g variants={part({ y: 90, scale: 0.9 }, 0.35)}>
        <path d="M420 280 L540 282 L552 306 L500 316 L430 312 Z" fill="none" stroke={STROKE} strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M440 288 L440 304 M470 286 L470 306 M500 286 L500 308" stroke={STROKE_DIM} strokeWidth={1} />
      </motion.g>

      {/* rear wing -- drops in from upper right with a rotation */}
      <motion.g variants={part({ x: 160, y: -100, rotate: 16 }, 0.5)}>
        <path d="M700 230 L820 206 L820 190 L700 214 Z" fill="none" stroke={STROKE} strokeWidth={2} strokeLinejoin="round" />
        <path d="M700 214 L698 190 L706 190 L708 212 M820 206 L820 182 L812 182 L812 204" fill="none" stroke={STROKE} strokeWidth={1.6} />
        <line x1="730" y1="300" x2="726" y2="222" stroke={STROKE_DIM} strokeWidth={1.6} />
        <line x1="780" y1="300" x2="784" y2="212" stroke={STROKE_DIM} strokeWidth={1.6} />
      </motion.g>

      {/* badge: #09 roundel + HANBEE wordmark, fades in once the car has landed */}
      <motion.g variants={badgeVariants}>
        <circle cx="470" cy="266" r="20" fill="none" stroke={STROKE} strokeWidth={1.6} />
        <text x="470" y="273" textAnchor="middle" fontSize="18" fontFamily="var(--font-heading)" fill={STROKE} letterSpacing="0.5">09</text>
        <text x="560" y="300" fontSize="13" fontFamily="var(--font-body)" fill={STROKE_DIM} letterSpacing="4" textAnchor="middle">HANBEE</text>
      </motion.g>

      {/* small decorative sparkle accent, bottom right -- echoes the brand mark used across the site's reference photography */}
      <motion.g variants={badgeVariants} opacity={0.5}>
        <path d="M930 400 L934 412 L946 416 L934 420 L930 432 L926 420 L914 416 L926 412 Z" fill={STROKE_DIM} />
      </motion.g>
    </motion.svg>
  );
}
