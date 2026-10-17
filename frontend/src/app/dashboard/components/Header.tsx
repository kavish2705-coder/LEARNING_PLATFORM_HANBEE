"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../layout.module.css";
import NotificationBell from "./NotificationBell";
import SearchBar from "./SearchBar";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useUserXp } from "../../../lib/hooks/useUserXp";
import { useMode } from "../ModeContext";

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  school_staff: "School Staff",
  staff: "Hanbee Staff",
  manager: "Manager",
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/license": "Driver License",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/team": "My Team",
  "/dashboard/announcements": "Announcements",
  "/dashboard/chat": "Chat",
  "/dashboard/settings": "Profile & Settings",
  "/dashboard/courses": "My Courses",
  "/dashboard/certificate": "Certificates",
  "/dashboard/ai-assistant": "AI Assistant",
  "/dashboard/attendance": "Live Attendance",
  "/dashboard/school/overview": "School Overview",
  "/dashboard/school/students": "Students",
  "/dashboard/school/courses": "Courses",
  "/dashboard/school/teams": "Teams",
  "/dashboard/school/schedule": "Schedule",
  "/dashboard/school/announcements": "Announcements",
  "/dashboard/school/chat": "Chat",
  "/dashboard/hanbee/my-space": "My Space",
  "/dashboard/hanbee/lms": "Learning Overview",
  "/dashboard/hanbee/schools": "Schools",
  "/dashboard/hanbee/courses": "Courses",
  "/dashboard/hanbee/tournament": "Tournament Entries",
  "/dashboard/hanbee/applications": "Applications",
  "/dashboard/hanbee/assessment-reviews": "Quiz Reviews",
  "/dashboard/hanbee/schedule": "Schedule",
  "/dashboard/hanbee/announcements": "Announcements",
  "/dashboard/hanbee/chat": "Chat",
  "/dashboard/manager/monitor": "Monitor",
  "/dashboard/manager/verifications": "Verifications",
  "/dashboard/manager/schools": "Schools",
  "/dashboard/manager/courses": "Courses",
  "/dashboard/manager/hanbee-staff": "Hanbee Staff",
  "/dashboard/manager/tasks": "Tasks",
  "/dashboard/manager/schedule": "Schedule",
  "/dashboard/manager/announcements": "Announcements",
  "/dashboard/manager/chat": "Chat",
};

export default function Header({ toggleMobileMenu }: { toggleMobileMenu?: () => void }) {
  const pathname = usePathname();
  const { mode } = useMode();
  const { data: profile } = useSessionProfile();
  const { xp, isGaining, lastGained } = useUserXp();
  const name = profile?.full_name ?? "";
  const initial = name.charAt(0).toUpperCase() || (profile?.role ? profile.role.charAt(0).toUpperCase() : "H");
  const today = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const getPageTitle = () => {
    if (pathname === "/dashboard") {
      if (profile?.role === "student") {
        return mode === "tournament" ? "Track Hub" : "Learning Hub";
      }
      return "Overview";
    }
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    const segment = pathname.split("/").filter(Boolean).pop();
    if (!segment) return "Overview";
    return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.mobileMenuBtn} onClick={toggleMobileMenu} aria-label="Toggle Menu">
          <Menu size={24} />
        </button>

        {/* Dynamic Context Breadcrumbs */}
        <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
          {pathname === "/dashboard" ? (
            <span className={styles.breadcrumbRootStatic}>Dashboard</span>
          ) : (
            <Link href="/dashboard" className={styles.breadcrumbRootLink} title="Back to Dashboard">
              Dashboard
            </Link>
          )}
          <ChevronRight size={13} className={styles.breadcrumbSep} />
          <span className={styles.breadcrumbCurrent}>{getPageTitle()}</span>
        </nav>

        {/* Global Quick Search with Ctrl+K shortcut */}
        <SearchBar />
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
        <div className={styles.date} suppressHydrationWarning>{today}</div>
        <NotificationBell />

        {/* Profile Avatar Button */}
        <div className={styles.headerUser}>
          <Link 
            href="/dashboard/settings" 
            className={styles.headerUserBtn} 
            title={name ? `${name} • View Profile & Settings` : "View Profile & Settings"}
            aria-label="View Profile and Settings"
          >
            <div className={styles.avatar}>{initial}</div>
          </Link>
        </div>
      </div>
    </header>
  );
}
