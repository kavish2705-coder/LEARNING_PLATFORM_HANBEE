"use client";

import { motion } from "framer-motion";
import Features from "@/components/Features/Features";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background Image */}
      <div className={styles.bgImage} />

      {/* Gradient Overlay for text readability */}
      <div className={styles.overlay} />

      {/* Hero Content */}
      <div className={styles.content}>
        {/* Tagline */}
        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
        >
          LEARN · GROW · BELONG
        </motion.p>

        {/* Main Heading */}
        <motion.h1
          className={styles.heading}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className={styles.headingLine}>Learn beyond the obvious.</span>
          <span className={styles.headingLine}>Build beyond the expected.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7, ease: "easeOut" }}
        >
          A learning space for curious minds —
          <br />
          built to help you gain real skills, achieve your goals,
          <br />
          and create a life you&apos;re proud of.
        </motion.p>

        {/* CTA Button */}
        <motion.a
          href="#start"
          className={styles.ctaButton}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: "easeOut" }}
          whileHover={{
            scale: 1.04,
            background: "rgba(30, 30, 30, 0.9)",
            transition: { type: "spring", stiffness: 400, damping: 17 },
          }}
          whileTap={{ scale: 0.97 }}
        >
          Start Learning
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
        </motion.a>
      </div>

      {/* Features Bar */}
      <Features />
    </section>
  );
}
