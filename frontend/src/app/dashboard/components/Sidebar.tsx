"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, BookOpen, Clock, Bell, Settings, Trophy,
  Users, MessageSquare, School, CalendarDays, ClipboardList,
  UserCheck, LogOut, ClipboardCheck, Activity, IdCard, UserPlus, ShieldCheck
} from "lucide-react";
import styles from "../layout.module.css";
import { readStoredSession, signOut, type AccountProfile } from "../../../lib/supabaseAuth";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

const studentTournamentMenu = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Driver License", href: "/dashboard/license", icon: IdCard },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "My Team", href: "/dashboard/team", icon: Users },
  { name: "Announcements", href: "/dashboard/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const schoolMenu = [
  { name: "Overview", href: "/dashboard/school/overview", icon: LayoutDashboard },
  { name: "Students", href: "/dashboard/school/students", icon: Users },
  { name: "Courses", href: "/dashboard/school/courses", icon: BookOpen },
  { name: "Teams", href: "/dashboard/school/teams", icon: Trophy },
  { name: "Schedule", href: "/dashboard/school/schedule", icon: CalendarDays },
  { name: "Announcements", href: "/dashboard/school/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/school/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const staffMenu = [
  { name: "My Space", href: "/dashboard/hanbee/my-space", icon: LayoutDashboard },
  { name: "Tournament Grid", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "Learning overview", href: "/dashboard/hanbee/lms", icon: Activity },
  { name: "Schools", href: "/dashboard/hanbee/schools", icon: School },
  { name: "Courses", href: "/dashboard/hanbee/courses", icon: BookOpen },
  { name: "Tournament entries", href: "/dashboard/hanbee/tournament", icon: Users },
  { name: "Scrutineering", href: "/dashboard/hanbee/scrutineering", icon: ShieldCheck },
  { name: "Independent students", href: "/dashboard/hanbee/independent-students", icon: UserPlus },
  { name: "Applications", href: "/dashboard/hanbee/applications", icon: ClipboardList },
  { name: "Quiz reviews", href: "/dashboard/hanbee/assessment-reviews", icon: ClipboardCheck },
  { name: "Schedule", href: "/dashboard/hanbee/schedule", icon: CalendarDays },
  { name: "Attendance", href: "/dashboard/attendance", icon: Clock },
  { name: "Announcements", href: "/dashboard/hanbee/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/hanbee/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const managerMenu = [
  { name: "Overview", href: "/dashboard/manager/monitor", icon: LayoutDashboard },
  { name: "Tournament Grid", href: "/dashboard/leaderboard", icon: Trophy },
  { name: "Learning overview", href: "/dashboard/hanbee/lms", icon: Activity },
  { name: "Verifications", href: "/dashboard/manager/verifications", icon: UserCheck },
  { name: "Schools", href: "/dashboard/manager/schools", icon: School },
  { name: "Courses", href: "/dashboard/hanbee/courses", icon: BookOpen },
  { name: "Course applications", href: "/dashboard/hanbee/applications", icon: ClipboardList },
  { name: "Quiz reviews", href: "/dashboard/hanbee/assessment-reviews", icon: ClipboardCheck },
  { name: "Tournament entries", href: "/dashboard/hanbee/tournament", icon: Users },
  { name: "Scrutineering", href: "/dashboard/hanbee/scrutineering", icon: ShieldCheck },
  { name: "Independent students", href: "/dashboard/hanbee/independent-students", icon: UserPlus },
  { name: "Hanbee staff", href: "/dashboard/manager/hanbee-staff", icon: Users },
  { name: "Tasks", href: "/dashboard/manager/tasks", icon: ClipboardList },
  { name: "Schedule", href: "/dashboard/hanbee/schedule", icon: CalendarDays },
  { name: "Announcements", href: "/dashboard/manager/announcements", icon: Bell },
  { name: "Chat", href: "/dashboard/manager/chat", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function labelRole(role: AccountProfile["role"]) {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Sidebar({ 
  isMobileMenuOpen = false, 
  setIsMobileMenuOpen 
}: { 
  isMobileMenuOpen?: boolean; 
  setIsMobileMenuOpen?: (val: boolean) => void; 
}) {
  const pathname = usePathname();
  const { data: profile } = useSessionProfile();

  const activeRole = profile?.role ?? "student";
        
  // Learning (Courses/Certificates/AI Assistant/Attendance) isn't ready for
  // real students yet -- see LearningComingSoon.tsx. Rather than advertise
  // nav items that dead-end behind that gate, students only ever get the
  // tournament menu; the mode switcher (which exists to flip into the
  // learning menu) is hidden for the same reason, just below.
  const items = activeRole === "school_staff"
    ? schoolMenu
    : activeRole === "staff"
      ? staffMenu
      : activeRole === "manager"
        ? managerMenu
        : studentTournamentMenu;

  const displayName = profile?.full_name ?? "";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();

  async function handleSignOut() {
    try {
      await signOut(readStoredSession());
    } catch {
      window.localStorage.removeItem("hanbee-auth-session");
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <button
          type="button"
          className={styles.sidebarOverlay}
          onClick={() => setIsMobileMenuOpen?.(false)}
          aria-label="Close navigation menu"
        />
      )}
      
      <aside id="dashboard-sidebar" className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.logo}>
          <span className={styles.logoMark} role="img" aria-label="Hanbee" />
        </div>
        
        {/* ModeSwitcher hidden for students until Learning is ready -- see note above items. */}

        <nav className={styles.navMenu}>
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                onClick={() => setIsMobileMenuOpen?.(false)}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className={styles.userProfile}>
          <div className={styles.avatar}>{initials || "H"}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>{profile ? labelRole(profile.role) : ""}</span>
          </div>
        </div>
        
        <button 
          type="button" 
          className={styles.navLink} 
          onClick={() => void handleSignOut()} 
          style={{ marginTop: 10, border: 0, width: "100%", cursor: "pointer", textAlign: "left", background: "transparent", color: "inherit", fontFamily: "inherit", fontSize: "inherit" }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>
    </>
  );
}
