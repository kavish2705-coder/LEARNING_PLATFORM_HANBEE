"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import styles from "./Navbar.module.css";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/#courses" },
  { label: "For Educators", href: "/#educators" },
  { label: "About", href: "/#about" },
];

export default function Navbar() {
  const [activeLink, setActiveLink] = useState("Home");
  const { scrollY } = useScroll();

  // Smooth, spring-cushioned transition:
  // - 0px to 40px: 100% transparent inside the hero
  // - 40px to 380px: gradual, silky-smooth fade into frosted glass as user crosses the hero
  const rawBackdropOpacity = useTransform(scrollY, [40, 360], [0, 1]);
  const backdropOpacity = useSpring(rawBackdropOpacity, {
    stiffness: 120,
    damping: 24,
    mass: 0.25,
  });

  // Subtle luxury compression: 86px at top -> 72px when scrolled
  const rawHeight = useTransform(scrollY, [40, 360], [86, 72]);
  const navHeight = useSpring(rawHeight, {
    stiffness: 120,
    damping: 24,
    mass: 0.25,
  });

  return (
    <motion.nav
      className={styles.navbar}
      style={{ height: navHeight }}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Hardware-composited frosted glass backdrop:
          Using spring-driven opacity on a dedicated GPU layer avoids
          browser blur recalculation jank and delivers 120fps buttery smoothness */}
      <motion.div
        className={styles.navBackdrop}
        style={{ opacity: backdropOpacity }}
      />

      <div className={styles.navContent}>
        {/* Logo */}
        <motion.a
          href="/"
          className={styles.logo}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Image
            src="/brand/hanbee-logo-white.png"
            alt="HANBEE"
            width={154}
            height={14}
            priority
            className={styles.logoImg}
          />
        </motion.a>

        {/* Center Links */}
        <ul className={styles.navLinks}>
          {navLinks.map((link, index) => {
            const isActive = activeLink === link.label;
            return (
              <motion.li
                key={link.label}
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 * (index + 1), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.a
                  href={link.href}
                  onClick={() => setActiveLink(link.label)}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                  whileHover={{ scale: 1.03, opacity: 0.8 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      className={styles.underline}
                      layoutId="navUnderline"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.a>
              </motion.li>
            );
          })}
        </ul>

        {/* Right Section */}
        <div className={styles.navRight}>
          {/* Sign In */}
          <motion.a
            href="/login"
            className={styles.signIn}
            whileHover={{ scale: 1.05, opacity: 0.8 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Sign In
          </motion.a>

          {/* Get Started Button */}
          <motion.a
            href="/login"
            className={styles.getStartedBtn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Get Started
            <svg
              width="16"
              height="16"
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
      </div>
    </motion.nav>
  );
}
