"use client";

import { Search } from "lucide-react";
import styles from "../layout.module.css";
import NotificationBell from "./NotificationBell";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

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

export default function Header() {
  const { data: profile } = useSessionProfile();
  const name = profile?.full_name ?? "";
  const initial = name.charAt(0).toUpperCase() || "H";
  const today = new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.greeting}>{greeting()}</div>
        <div className={styles.greetingName}>{name}</div>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input type="text" placeholder="Search..." className={styles.searchInput} aria-label="Search" />
      </div>

      <div className={styles.headerRight}>
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
