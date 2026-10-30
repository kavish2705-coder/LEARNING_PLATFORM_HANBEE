"use client";

import { useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import styles from "./Navbar.module.css";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Courses", href: "#courses" },
  { label: "For Educators", href: "#educators" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [activeLink, setActiveLink] = useState("Home");
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 24);
  });

  // Smooth, gradual transition: completely transparent in the hero,
  // gradually becoming solid opaque with blur and border as user scrolls down
  const backgroundColor = useTransform(
    scrollY,
    [10, 160],
    ["rgba(18, 18, 26, 0)", "rgba(18, 18, 26, 0.96)"]
  );

  const borderBottomColor = useTransform(
    scrollY,
    [10, 160],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.08)"]
  );

  const boxShadow = useTransform(
    scrollY,
    [10, 160],
    ["0 0 0 rgba(0, 0, 0, 0)", "0 10px 30px rgba(0, 0, 0, 0.4)"]
  );

  const blurPx = useTransform(scrollY, [10, 160], [0, 20]);
  const backdropFilter = useTransform(blurPx, (v) => `blur(${v}px)`);
  const webkitBackdropFilter = useTransform(blurPx, (v) => `blur(${v}px)`);

  return (
    <motion.nav
      className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""}`}
      style={{
        backgroundColor,
        borderBottomColor,
        boxShadow,
        backdropFilter,
        WebkitBackdropFilter: webkitBackdropFilter,
      }}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.navContent}>
        {/* Logo */}
        <motion.a
          href="#"
          className={styles.logo}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          HANBEE
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
