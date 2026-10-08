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
    hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const line1 = "Learn beyond the obvious.";
  const line2 = "Build beyond the expected.";

  return (
    <section className={styles.hero}>
      {/* Background Image with Parallax */}
      <motion.div className={styles.bgImage} style={{ y: yBg }} />

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
          href="/login?mode=signup"
          className={styles.ctaButton}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
          }}
          whileHover={{
            scale: 1.04,
            transition: { type: "spring", stiffness: 350, damping: 20 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          <span className={styles.ctaText}>Start Learning</span>
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.ctaArrow}
          >
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </motion.svg>
          <div className={styles.ctaGlow}></div>
        </motion.a>
      </motion.div>

    </section>
  );
}
