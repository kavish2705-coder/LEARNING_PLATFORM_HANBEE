"use client";

import Link from "next/link";
import { Search, Menu, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../layout.module.css";
import NotificationBell from "./NotificationBell";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  school_staff: "School Staff",
  staff: "Hanbee Staff",
  manager: "Manager",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

export default function Header({ toggleMobileMenu }: { toggleMobileMenu?: () => void }) {
  const { data: profile } = useSessionProfile();
  const { xp, isGaining, lastGained } = useUserXp();
  const name = profile?.full_name ?? "";
  const initial = name.charAt(0).toUpperCase() || "H";
  const today = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.mobileMenuBtn} onClick={toggleMobileMenu} aria-label="Toggle Menu">
          <Menu size={24} />
        </button>
        <div className={styles.greetingWrapper}>
          <div className={styles.greeting}>{greeting()}</div>
          <div className={styles.greetingName}>{name}</div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input type="text" placeholder="Search..." className={styles.searchInput} aria-label="Search" />
      </div>

      <div className={styles.headerRight}>
        {/* Student-only Gamification & Driver License */}
        {profile?.role === "student" && (
          <Link href="/dashboard/license" style={{ textDecoration: "none", position: "relative" }}>
            <motion.div 
              className={styles.headerXpPill} 
              title="View Driver License & XP Progression"
              animate={isGaining ? { scale: [1, 1.15, 1], borderColor: ["#7dd3e8", "#10b981", "#7dd3e8"] } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Zap size={14} className={styles.headerXpIcon} />
              <span className={styles.headerXpVal}>{xp.toLocaleString()} XP</span>
            </motion.div>

            <AnimatePresence>
              {isGaining && lastGained && lastGained.amount > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: 22, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.8 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#10b981",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.5)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  +{lastGained.amount} XP
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        )}
        <div className={styles.date}>{today}</div>
        <NotificationBell />

        <div className={styles.headerUser}>
          <div className={styles.avatar}>{initial}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{name}</span>
            <span className={styles.userRole}>{profile ? ROLE_LABEL[profile.role] ?? profile.role : ""}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

