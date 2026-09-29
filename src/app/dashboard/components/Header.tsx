"use client";

import { Search, Bell, ChevronDown } from "lucide-react";
import styles from "../layout.module.css";
import { useRole, Role } from "../../RoleContext";

export default function Header() {
  const { role, setRole } = useRole();
  
  const userNames = {
    student: "Alex Rivera",
    teacher: "James Okafor",
    manager: "Marcus Reyes"
  };

  const userSubtitles = {
    student: "Team Apex",
    teacher: "Lead Instructor",
    manager: "Facility Director"
  };

  const getInitial = (name: string) => name.charAt(0);

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.greeting}>Good morning,</div>
        <div className={styles.greetingName}>{userNames[role]}</div>
      </div>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search..." 
          className={styles.searchInput}
        />
        <div className={styles.shortcut}>⌘K</div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.date}>Thu, Sep 24</div>
        
        <button className={styles.notificationBtn}>
          <Bell size={20} />
          <div className={styles.notificationBadge} />
        </button>

        <div className={styles.headerUser}>
          <div className={styles.avatar}>{getInitial(userNames[role])}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userNames[role]}</span>
            <span className={styles.userRole}>{userSubtitles[role]}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
