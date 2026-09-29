"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Clock, Bell, Settings, Trophy, Users, MessageSquare, Bot } from "lucide-react";
import styles from "../layout.module.css";
import ModeSwitcher from "./ModeSwitcher";

import { useMode } from "../ModeContext";

import { useRole } from "../../RoleContext";

const menus = {
  student: {
    tournament: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
      { name: "My Team", href: "/dashboard/team", icon: Users },
      { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
      { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
    learning: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "My Courses", href: "/dashboard/courses", icon: BookOpen },
      { name: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
      { name: "Live Attendance", href: "/dashboard/attendance", icon: Clock },
      { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
      { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ]
  },
  teacher: {
    tournament: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Manage Teams", href: "/dashboard/teams/manage", icon: Users },
      { name: "Update Leaderboard", href: "/dashboard/leaderboard/edit", icon: Trophy },
      { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
      { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
    learning: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Manage Courses", href: "/dashboard/courses/manage", icon: BookOpen },
      { name: "Track Attendance", href: "/dashboard/attendance/track", icon: Clock },
      { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
      { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ]
  },
  manager: {
    tournament: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Tournaments", href: "/dashboard/tournaments/manage", icon: Trophy },
      { name: "Facility Schedule", href: "/dashboard/facility", icon: Clock },
      { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
    learning: [
      { name: "Platform Analytics", href: "/dashboard", icon: LayoutDashboard },
      { name: "Manage Users", href: "/dashboard/users", icon: Users },
      { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ]
  }
};

export default function Sidebar() {
  const pathname = usePathname();
  const { mode } = useMode();
  const { role } = useRole();

  const currentMenu = menus[role][mode];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        HANBEE
      </div>
      
      <ModeSwitcher />

      <nav className={styles.navMenu}>
        {currentMenu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={styles.userProfile}>
        <div className={styles.avatar}>{role === 'student' ? 'A' : role === 'teacher' ? 'J' : 'M'}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{role === 'student' ? 'Alex Rivera' : role === 'teacher' ? 'James Okafor' : 'Marcus Reyes'}</span>
          <span className={styles.userRole}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
        </div>
      </div>
    </aside>
  );
}
