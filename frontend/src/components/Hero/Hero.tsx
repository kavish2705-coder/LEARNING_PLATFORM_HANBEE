"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import styles from "./Hero.module.css";

interface HeroProps {
  onOpenStudentModal?: () => void;
}

export default function Hero({ onOpenStudentModal }: HeroProps) {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 1000], [0, 300]);
  const opacityText = useTransform(scrollY, [0, 400], [1, 0]);

  const containerVariant = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.22,
      },
    },
  };

  const charVariant: any = {
    hidden: { 
      opacity: 0, 
      y: 26, 
      filter: "blur(10px)", 
      scale: 0.96 
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        duration: 0.65,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const line1 = "Learn beyond the obvious.";
  const line2 = "Build beyond the expected.";

  return (
    <section className={styles.hero}>
      {/* Background Video with Parallax & Fallback */}
      <motion.div className={styles.bgVideoWrap} style={{ y: yBg }}>
        <video
          className={styles.bgVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      </motion.div>
      
      {/* Animated Glowing Ambient Warmth */}
      <div className={styles.glowingOrb} />

      {/* Gradient Overlay for text readability */}
      <div className={styles.overlay} />

      {/* Hero Content */}
      <motion.div className={styles.content} style={{ opacity: opacityText }}>
        {/* Tagline */}
        <motion.div
          className={styles.tagline}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.taglineDot} />
          <span>LEARN · GROW · BELONG</span>
        </motion.div>

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

        {/* CTA Button Group */}
        <div className={styles.ctaGroup}>
          <motion.a
            href="/login"
            className={styles.ctaButton}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.03 }}
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

          {onOpenStudentModal ? (
            <motion.button
              type="button"
              onClick={onOpenStudentModal}
              className={styles.secondaryCtaButton}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>Independent Student</span>
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
            </motion.button>
          ) : (
            <motion.a
              href="/login?role=Student"
              className={styles.secondaryCtaButton}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>Independent Student</span>
            </motion.a>
          )}
        </div>

        {/* Secondary path text link */}
        <motion.button
          type="button"
          onClick={onOpenStudentModal || (() => { window.location.href = "/login?role=Student"; })}
          className={styles.independentLink}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Not part of a school? Join as an independent student →
        </motion.button>
      </motion.div>
    </section>
  );
}
