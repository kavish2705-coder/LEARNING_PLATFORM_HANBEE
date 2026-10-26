"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, X, CornerDownLeft, Trophy, BookOpen, 
  Clock, Bell, Settings, Users, MessageSquare, Bot, IdCard, 
  Flag, School, CalendarDays, Activity, ClipboardCheck, LayoutDashboard
} from "lucide-react";
import styles from "./SearchBar.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  keywords: string[];
  roles?: string[];
}

export default function SearchBar() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();
  const role = profile?.role ?? "student";

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Search catalog of platform features
  const searchCatalog: SearchItem[] = useMemo(() => [
    {
      id: "hub-overview",
      title: "Tournament Track Hub",
      description: "Live countdown, circuit overview & team standings",
      href: "/dashboard",
      icon: LayoutDashboard,
      keywords: ["race", "track", "circuit", "countdown", "hub", "tournament", "home"],
      roles: ["student", "staff", "manager"],
    },
    {
      id: "driver-license",
      title: "Student Driver License",
      description: "3D holographic pass, RC toy specs & practice RP",
      href: "/dashboard/license",
      icon: IdCard,
      keywords: ["license", "driver", "pass", "card", "parts", "motor", "battery", "rp", "barcode"],
      roles: ["student", "staff", "manager"],
    },
    {
      id: "leaderboard",
      title: "Live Grid Standings & Leaderboard",
      description: "Championship rankings, points & team telemetry",
      href: "/dashboard/leaderboard",
      icon: Trophy,
      keywords: ["standings", "leaderboard", "rank", "points", "telemetry", "podium", "scores"],
      roles: ["student", "staff", "manager", "school_staff"],
    },
    {
      id: "my-team",
      title: "Race Team & Squad",
      description: "Squad roster, captain, teammates & invites",
      href: "/dashboard/team",
      icon: Users,
      keywords: ["team", "squad", "classmates", "captain", "roster", "invitations"],
      roles: ["student", "staff", "manager", "school_staff"],
    },
    {
      id: "my-courses",
      title: "My Courses & Curriculum",
      description: "Active robotics lessons, modules & video syllabus",
      href: "/dashboard/courses",
      icon: BookOpen,
      keywords: ["courses", "lessons", "curriculum", "classes", "learn", "study"],
      roles: ["student", "school_staff", "staff", "manager"],
    },
    {
      id: "certificates",
      title: "Certificates & Achievements",
      description: "Course diplomas, verified passes & badges",
      href: "/dashboard/certificate",
      icon: Trophy,
      keywords: ["certificate", "diploma", "credentials", "badges", "achievements"],
      roles: ["student"],
    },
    {
      id: "ai-assistant",
      title: "AI Study Assistant",
      description: "Instant tutoring answers & code guidance",
      href: "/dashboard/ai-assistant",
      icon: Bot,
      keywords: ["ai", "assistant", "bot", "tutor", "help", "questions"],
      roles: ["student"],
    },
    {
      id: "live-attendance",
      title: "Live Attendance",
      description: "Attendance records & session presence history",
      href: "/dashboard/attendance",
      icon: Clock,
      keywords: ["attendance", "clock", "presence", "sessions", "history"],
      roles: ["student", "staff"],
    },
    {
      id: "announcements",
      title: "Announcements & Bulletins",
      description: "Official notifications, updates & event notices",
      href: role === "school_staff" ? "/dashboard/school/announcements" : "/dashboard/announcements",
      icon: Bell,
      keywords: ["announcements", "notifications", "news", "updates", "bulletin"],
    },
    {
      id: "chat",
      title: "Team & School Chat",
      description: "Direct messaging, team chat & channels",
      href: role === "school_staff" ? "/dashboard/school/chat" : "/dashboard/chat",
      icon: MessageSquare,
      keywords: ["chat", "messages", "talk", "group", "inbox", "conversation"],
    },
    {
      id: "settings",
      title: "Profile & Settings",
      description: "Account details, theme, password & preferences",
      href: "/dashboard/settings",
      icon: Settings,
      keywords: ["settings", "profile", "password", "preferences", "account", "theme", "team"],
    },
    {
      id: "school-overview",
      title: "School Administration",
      description: "School roster health, enrolled students & schedule",
      href: "/dashboard/school/overview",
      icon: School,
      keywords: ["school", "overview", "administration"],
      roles: ["school_staff"],
    },
    {
      id: "school-teams",
      title: "School Tournament Teams",
      description: "Verify team slots & approve rosters",
      href: "/dashboard/school/teams",
      icon: Flag,
      keywords: ["slots", "teams", "approve", "school teams"],
      roles: ["school_staff"],
    },
    {
      id: "school-students",
      title: "Enrolled Students Directory",
      description: "Invite students & view student roster",
      href: "/dashboard/school/students",
      icon: Users,
      keywords: ["students", "roster", "directory"],
      roles: ["school_staff"],
    },
    {
      id: "school-schedule",
      title: "School Schedule",
      description: "Timetable, calendar sessions & dates",
      href: "/dashboard/school/schedule",
      icon: CalendarDays,
      keywords: ["schedule", "calendar", "timetable", "dates"],
      roles: ["school_staff"],
    },
    {
      id: "staff-myspace",
      title: "Staff Space",
      description: "Staff task assignments & learning oversight",
      href: "/dashboard/hanbee/my-space",
      icon: LayoutDashboard,
      keywords: ["staff", "space", "tasks"],
      roles: ["staff"],
    },
    {
      id: "manager-monitor",
      title: "Executive Monitor",
      description: "System metrics, verifications & school health",
      href: "/dashboard/manager/monitor",
      icon: Activity,
      keywords: ["manager", "monitor", "audit"],
      roles: ["manager"],
    },
    {
      id: "manager-verifications",
      title: "Staff Verifications",
      description: "Review & approve pending staff accounts",
      href: "/dashboard/manager/verifications",
      icon: ClipboardCheck,
      keywords: ["verifications", "approve", "staff"],
      roles: ["manager"],
    },
  ], [role]);

  // Filter catalog based on active user role
  const availableItems = useMemo(() => {
    return searchCatalog.filter((item) => !item.roles || item.roles.includes(role));
  }, [searchCatalog, role]);

  // Filter items matching query
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return availableItems.slice(0, 7);
    }
    const q = query.toLowerCase().trim();
    return availableItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchKeywords;
    });
  }, [availableItems, query]);

  // Global keyboard shortcut to open palette (Ctrl+K, Cmd+K, or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelectItem(filteredResults[selectedIndex]);
      }
    }
  };

  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof window !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <>
      {/* 100% Solid, Non-Transparent Header Search Trigger */}
      <div 
        className={styles.searchTrigger}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Open search command palette"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <div className={styles.searchTriggerLeft}>
          <Search size={14} className={styles.searchIcon} />
          <span className={styles.searchPlaceholder}>Search...</span>
        </div>
        <kbd className={styles.kbdBadge} suppressHydrationWarning>{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </div>

      {/* Centered Isolated Command Palette Modal */}
      {isOpen && (
        <div 
          className={styles.paletteBackdrop}
          onClick={() => setIsOpen(false)}
        >
          <div 
            className={styles.paletteCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Input */}
            <div className={styles.paletteHeader}>
              <Search size={16} className={styles.searchIcon} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search pages, tools, telemetry..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className={styles.paletteInput}
                aria-label="Search Hanbee Platform"
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <button 
                  type="button" 
                  className={styles.clearBtn} 
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  title="Clear query"
                >
                  <X size={14} />
                </button>
              ) : (
                <span 
                  className={styles.escBadge} 
                  onClick={() => setIsOpen(false)}
                  title="Close search"
                >
                  ESC
                </span>
              )}
            </div>

            {/* Filtered Results */}
            <div className={styles.paletteResults}>
              {filteredResults.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateTitle}>No results found</div>
                  <div className={styles.emptyStateDesc}>
                    No matches found for &quot;<strong>{query}</strong>&quot;. Try searching for <em>License</em>, <em>Leaderboard</em>, <em>Team</em>, or <em>Courses</em>.
                  </div>
                </div>
              ) : (
                filteredResults.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.resultItem} ${isSelected ? styles.resultItemActive : ""}`}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className={styles.resultLeft}>
                        <div className={styles.resultIconBox}>
                          <Icon size={16} />
                        </div>
                        <div className={styles.resultMeta}>
                          <span className={styles.resultTitle}>{item.title}</span>
                          <span className={styles.resultDesc}>{item.description}</span>
                        </div>
                      </div>
                      <div className={styles.resultEnter}>
                        <CornerDownLeft size={13} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Helper Footer */}
            <div className={styles.paletteFooter}>
              <div className={styles.footerHint}>
                <span className={styles.footerKbd}>↑↓</span> Navigate
                <span className={styles.footerKbd} style={{ marginLeft: 6 }}>↵</span> Select
              </div>
              <div>
                <span className={styles.footerKbd}>ESC</span> to close
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
