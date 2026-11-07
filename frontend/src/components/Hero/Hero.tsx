"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import styles from "./Hero.module.css";

interface HeroProps {
  onOpenStudentModal?: () => void;
}

export default function Hero({ onOpenStudentModal }: HeroProps) {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 800], [0, 140]);
  const opacityText = useTransform(scrollY, [0, 420], [1, 0]);

  const line1Words = ["Don't", "just", "learn."];
  const line2Words = ["Build", "something", "real."];

  return (
    <section className={styles.hero}>
      {/* Background Video with Smooth Parallax */}
      <motion.div
        className={styles.bgVideoWrap}
        style={{ y: yBg }}
      >
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
      
      {/* Gradient Overlay for text readability */}
      <div className={styles.overlay} />

      {/* Hero Content */}
      <motion.div className={styles.content} style={{ opacity: opacityText }}>
        {/* Eyebrow Tagline */}
        <motion.div
          className={styles.tagline}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.taglineDot} />
          <span className={styles.taglineText}>A trusted coding and robotics program for school students</span>
        </motion.div>

        {/* Main Heading */}
        <h1 className={styles.heading}>
          <span className={styles.headingLine}>
            {line1Words.map((word, index) => (
              <motion.span
                key={`l1-${index}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.16 + index * 0.04,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ display: "inline-block", marginRight: "0.28em" }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          <span className={styles.headingLine}>
            {line2Words.map((word, index) => (
              <motion.span
                key={`l2-${index}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.30 + index * 0.04,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ display: "inline-block", marginRight: "0.28em" }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          Master the fundamentals on our interactive LMS, then take it from raw components to the starting grid: code, build, and race your team&apos;s custom robotic car across the Hanbee championship—because real engineering happens on the track.
        </motion.p>

        {/* CTA Button Group */}
        <div className={styles.ctaGroup}>
          <motion.a
            href="#how-it-works"
            className={styles.ctaButton}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Explore the season</span>
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
        </div>
      </motion.div>
    </section>
  );
}
