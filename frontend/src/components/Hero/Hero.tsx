"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import styles from "./Hero.module.css";

export default function Hero() {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 1000], [0, 300]);
  const opacityText = useTransform(scrollY, [0, 400], [1, 0]);
  const containerVariant = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.018,
        delayChildren: 0.3,
      },
    },
  };

  const charVariant: any = {
    hidden: { opacity: 0, y: 30, scale: 0.9, filter: "blur(8px)", rotateX: -30 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 12,
        mass: 0.8
      },
    },
  };

  const line1 = "Learn beyond the obvious.";
  const line2 = "Build beyond the expected.";

  return (
    <section className={styles.hero}>
      {/* Background Video with Parallax & Fallback Poster */}
      <motion.div className={styles.bgVideoWrap} style={{ y: yBg }}>
        <video
          className={styles.bgVideo}
          autoPlay
          muted
          playsInline
          poster="/hero-bg.jpg"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* Futuristic Grid Overlay */}
      <div className={styles.gridOverlay} />
      
      {/* Animated Glowing Orb */}
      <div className={styles.glowingOrb} />

      {/* Gradient Overlay for text readability */}
      <div className={styles.overlay} />

      {/* Hero Content */}
      <motion.div className={styles.content} style={{ opacity: opacityText }}>
        {/* Tagline */}
        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          LEARN · GROW · BELONG
        </motion.p>

        {/* Main Heading */}
        <motion.h1
          className={styles.heading}
          variants={containerVariant}
          initial="hidden"
          animate="visible"
        >
          <span className={styles.headingLine}>
            {line1.split("").map((char, index) => (
              <motion.span key={`l1-${index}`} variants={charVariant} style={{ display: "inline-block" }}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </span>
          <span className={styles.headingLine}>
            {line2.split("").map((char, index) => (
              <motion.span key={`l2-${index}`} variants={charVariant} style={{ display: "inline-block" }}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Write the code. Build the car. Race it for real — at the Hanbee RC Cup.
        </motion.p>

        {/* CTA Button */}
        <motion.a
          href="/login"
          className={styles.ctaButton}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>Start Learning</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </motion.a>
      </motion.div>

    </section>
  );
}
