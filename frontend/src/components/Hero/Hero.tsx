"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import styles from "./Hero.module.css";

interface HeroProps {
  onOpenStudentModal?: () => void;
}

export default function Hero({ onOpenStudentModal }: HeroProps) {
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const yBg = useTransform(scrollY, [0, 800], [0, 140]);
  const opacityText = useTransform(scrollY, [0, 420], [1, 0]);

  const line1Words = ["Learn", "beyond", "the", "obvious."];
  const line2Words = ["Build", "beyond", "the", "expected."];

  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      {/* Background Video with Smooth Parallax */}
      <motion.div
        className={styles.bgVideoWrap}
        style={{ y: reduceMotion ? 0 : yBg }}
      >
        {reduceMotion ? (
          <img
            className={styles.bgVideo}
            src="/hanbee-cars.jpg"
            alt=""
            aria-hidden="true"
          />
        ) : (
          <video
            className={styles.bgVideo}
            autoPlay
            muted
            playsInline
            preload="metadata"
            poster="/hanbee-cars.jpg"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>
      
      {/* Gradient Overlay for text readability */}
      <div className={styles.overlay} />

      {/* Hero Content */}
      <motion.div className={styles.content} style={{ opacity: opacityText }}>
        {/* Tagline */}
        <motion.div
          className={styles.tagline}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.taglineDot} />
          <span>LEARN · GROW · BELONG</span>
        </motion.div>

        {/* Main Heading - Buttery Smooth Word Cascade without heavy GPU blur lag */}
        <h1 id="hero-heading" className={styles.heading}>
          <span className={styles.headingLine}>
            {line1Words.map((word, index) => (
              <motion.span
                key={`l1-${index}`}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.16 + index * 0.035,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ display: "inline-block", marginRight: "0.26em" }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          <span className={styles.headingLine}>
            {line2Words.map((word, index) => (
              <motion.span
                key={`l2-${index}`}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.30 + index * 0.035,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ display: "inline-block", marginRight: "0.26em" }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Animated SVG accent underline */}
        <svg
          className={styles.heroUnderline}
          viewBox="0 0 420 14"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <motion.path
            d="M2 9 C 90 2, 180 13, 260 6 S 360 12, 418 5"
            stroke="var(--landing-accent, #e58a2b)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.9, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        {/* Subtitle */}
        <motion.p
          className={styles.subtitle}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.44, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          Write the code. Build the car. Race it for real — at the Hanbee RC Cup.
        </motion.p>

        {/* CTA Button Group */}
        <div className={styles.ctaGroup}>
          <motion.a
            href="/login?mode=signup"
            className={styles.ctaButton}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={reduceMotion ? undefined : { scale: 1.03 }}
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
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
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
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
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={reduceMotion ? undefined : { scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <span>Independent Student</span>
            </motion.a>
          )}
        </div>
      </motion.div>
    </section>
  );
}


