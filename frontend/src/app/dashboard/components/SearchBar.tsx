"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, X, ArrowRight, CornerDownLeft, Trophy, BookOpen, 
  Clock, Bell, Settings, Users, MessageSquare, Bot, IdCard, 
  Wrench, Flag, ShieldCheck, Flame, Compass, School, CalendarDays,
  Activity, ClipboardCheck, Sparkles, LayoutDashboard
} from "lucide-react";
import styles from "./SearchBar.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { useMode } from "../ModeContext";

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  href: string;
  category: "PAGES" | "TOURNAMENT & RC" | "COURSES & LEARNING" | "ADMIN & SYSTEM";
  icon: any;
  keywords: string[];
  role?: string[];
}

export default function SearchBar() {
  const router = useRouter();
  const { data: profile } = useSessionProfile();
  const { mode } = useMode();
  
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const role = profile?.role ?? "student";

  // Catalog of searchable routes, pages, and tools
  const searchCatalog: SearchItem[] = useMemo(() => [
    // Student Tournament Items
    {
      id: "hub-overview",
      title: "Tournament Track Hub",
      description: "Live countdown, F1 start lights & circuit overview",
      href: "/dashboard",
      category: "TOURNAMENT & RC",
      icon: LayoutDashboard,
      keywords: ["race", "countdown", "circuit", "track", "lights", "f1", "hub", "tournament", "home"],
      role: ["student"],
    },
    {
      id: "driver-license",
      title: "Student Driver License",
      description: "Holographic pass, car specs, badges & practice RP",
      href: "/dashboard/license",
      category: "TOURNAMENT & RC",
      icon: IdCard,
      keywords: ["license", "pass", "card", "parts", "specs", "motor", "battery", "chassis", "rp", "barcode"],
      role: ["student"],
    },
    {
      id: "leaderboard",
      title: "Live Grid Standings & Leaderboard",
      description: "Championship standings, rival teams & telemetry",
      href: "/dashboard/leaderboard",
      category: "TOURNAMENT & RC",
      icon: Trophy,
      keywords: ["standings", "leaderboard", "grid", "rank", "telemetry", "points", "vortex", "redline", "podium"],
      role: ["student"],
    },
    {
      id: "my-team",
      title: "Race Team & Squad Roster",
      description: "Create squad, invite classmates & review entry",
      href: "/dashboard/team",
      category: "TOURNAMENT & RC",
      icon: Users,
      keywords: ["team", "squad", "classmates", "captain", "roster", "invitations", "register"],
      role: ["student"],
    },
    {
      id: "rc-inspection",
      title: "Pre-Race RC Car Hardware Check",
      description: "6-point inspection (Wheels, Body, Motor, Wiring, Battery)",
      href: "/dashboard",
      category: "TOURNAMENT & RC",
      icon: Wrench,
      keywords: ["check", "inspection", "hardware", "readiness", "gauge", "wheels", "remote", "trim"],
      role: ["student"],
    },
    {
      id: "pit-tasks",
      title: "Pit Tasks & Practice Drills",
      description: "Steering trim calibration, voltage checks & bounties",
      href: "/dashboard",
      category: "TOURNAMENT & RC",
      icon: Sparkles,
      keywords: ["pit", "tasks", "bounties", "drills", "xp", "bonus", "voltage", "steering"],
      role: ["student"],
    },

    // Learning / Courses Items
    {
      id: "my-courses",
      title: "My Courses & Curriculum",
      description: "Active video lessons, modules & coding syllabus",
      href: "/dashboard/courses",
      category: "COURSES & LEARNING",
      icon: BookOpen,
      keywords: ["courses", "lessons", "curriculum", "classes", "design", "java", "learn", "study"],
      role: ["student", "school_staff", "staff", "manager"],
    },
    {
      id: "certificates",
      title: "Certificates & Achievements",
      description: "Course completion passes & verified badges",
      href: "/dashboard/certificate",
      category: "COURSES & LEARNING",
      icon: Trophy,
      keywords: ["certificate", "diploma", "credentials", "badges", "achievements", "trophies"],
      role: ["student"],
    },
    {
      id: "ai-assistant",
      title: "AI Study Assistant",
      description: "Ask tutoring questions and get instant code guidance",
      href: "/dashboard/ai-assistant",
      category: "COURSES & LEARNING",
      icon: Bot,
      keywords: ["ai", "assistant", "bot", "tutor", "help", "questions", "chatgpt", "gemini"],
      role: ["student"],
    },
    {
      id: "live-attendance",
      title: "Live Attendance & Clock In",
      description: "Check attendance percentage and clock-in history",
      href: "/dashboard/attendance",
      category: "COURSES & LEARNING",
      icon: Clock,
      keywords: ["attendance", "clock", "presence", "sessions", "history", "hours"],
      role: ["student", "staff"],
    },

    // Communication & System Items
    {
      id: "announcements",
      title: "Announcements & Bulletins",
      description: "Official notifications, updates and event schedules",
      href: role === "school_staff" ? "/dashboard/school/announcements" : "/dashboard/announcements",
      category: "PAGES",
      icon: Bell,
      keywords: ["announcements", "notifications", "news", "updates", "bulletin", "posts"],
    },
    {
      id: "chat-matrix",
      title: "Team & School Chat",
      description: "Direct messaging, group channels and squad chat",
      href: role === "school_staff" ? "/dashboard/school/chat" : "/dashboard/chat",
      category: "PAGES",
      icon: MessageSquare,
      keywords: ["chat", "messages", "talk", "group", "inbox", "conversation"],
    },
    {
      id: "account-settings",
      title: "Account Settings",
      description: "Manage profile, name, password and notification preferences",
      href: "/dashboard/settings",
      category: "PAGES",
      icon: Settings,
      keywords: ["settings", "profile", "password", "preferences", "account", "theme", "email"],
    },

    // School Staff Management
    {
      id: "school-overview",
      title: "School Administration Overview",
      description: "School roster health, enrolled students and schedule",
      href: "/dashboard/school/overview",
      category: "ADMIN & SYSTEM",
      icon: School,
      keywords: ["school", "overview", "administration", "institution"],
      role: ["school_staff"],
    },
    {
      id: "school-teams",
      title: "School Tournament Teams & Slots",
      description: "Manage school team slots, verify payments & approve rosters",
      href: "/dashboard/school/teams",
      category: "ADMIN & SYSTEM",
      icon: Flag,
      keywords: ["slots", "teams", "approve", "verify", "school teams", "payment"],
      role: ["school_staff"],
    },
    {
      id: "school-students",
      title: "Enrolled Students Directory",
      description: "Invite students via email or join link and view roster",
      href: "/dashboard/school/students",
      category: "ADMIN & SYSTEM",
      icon: Users,
      keywords: ["students", "roster", "invite", "join link", "directory"],
      role: ["school_staff"],
    },
    {
      id: "school-schedule",
      title: "School Schedule & Calendar",
      description: "Timetable, holidays and session calendar",
      href: "/dashboard/school/schedule",
      category: "ADMIN & SYSTEM",
      icon: CalendarDays,
      keywords: ["schedule", "calendar", "timetable", "dates", "events"],
      role: ["school_staff"],
    },

    // Hanbee Staff & Manager
    {
      id: "hanbee-tournaments",
      title: "Tournament Applications Queue",
      description: "Review, approve and verify team applications",
      href: "/dashboard/hanbee/tournament",
      category: "ADMIN & SYSTEM",
      icon: ShieldCheck,
      keywords: ["tournament", "applications", "verify", "queue", "entries"],
      role: ["staff", "manager"],
    },
    {
      id: "hanbee-courses-editor",
      title: "Course Curriculum Editor",
      description: "Create courses, add modules and publish video lessons",
      href: "/dashboard/hanbee/courses",
      category: "ADMIN & SYSTEM",
      icon: BookOpen,
      keywords: ["editor", "create course", "modules", "publish", "lessons"],
      role: ["staff", "manager"],
    },
    {
      id: "manager-schools",
      title: "School Approvals & Verifications",
      description: "Review new school registrations and partnerships",
      href: "/dashboard/manager/schools",
      category: "ADMIN & SYSTEM",
      icon: School,
      keywords: ["verify schools", "pending schools", "approvals", "partners"],
      role: ["manager"],
    },
  ], [role]);

  // Filter items matching role
  const roleAllowedCatalog = useMemo(() => {
    return searchCatalog.filter((item) => {
      if (!item.role) return true;
      return item.role.includes(role);
    });
  }, [searchCatalog, role]);

  // Real-time matched items
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default recommended top quick actions when query is empty
      return roleAllowedCatalog.slice(0, 6);
    }
    return roleAllowedCatalog.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeyword = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCategory || matchKeyword;
    });
  }, [roleAllowedCatalog, query]);

  // Group filtered results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    filteredResults.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(true);
        if (window.innerWidth <= 768) {
          setIsMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          inputRef.current?.focus();
        }
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsMobileModalOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation within the results
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== "Enter") {
      setIsOpen(true);
    }
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

  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    setIsMobileModalOpen(false);
    setQuery("");
    router.push(item.href);
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const isMac = typeof window !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;

  return (
    <>
      {/* Desktop Search Bar */}
      <div className={styles.searchContainer} ref={containerRef}>
        <div className={`${styles.searchBarWrapper} ${isOpen ? styles.searchBarWrapperActive : ""}`}>
          <Search size={16} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search hub, license, team, courses..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            className={styles.searchInput}
            aria-label="Search"
            autoComplete="off"
          />

          {query ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className={styles.shortcutBadge} title="Press Ctrl+K to search">
              {isMac ? "⌘K" : "Ctrl+K"}
            </span>
          )}
        </div>

        {/* Dropdown Results */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={styles.dropdownPanel}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className={styles.resultsScrollArea}>
                {filteredResults.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateTitle}>No results found</div>
                    <div className={styles.emptyStateDesc}>
                      No matches found for &quot;<strong>{query}</strong>&quot;. Try searching for <em>License</em>, <em>Leaderboard</em>, <em>Team</em>, or <em>Courses</em>.
                    </div>
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category} className={styles.categoryGroup}>
                      <div className={styles.categoryHeader}>
                        <span>{category}</span>
                        <span>{items.length}</span>
                      </div>
                      {items.map((item) => {
                        const globalIndex = filteredResults.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.id}
                            className={`${styles.resultItem} ${isSelected ? styles.resultItemActive : ""}`}
                            onClick={() => handleSelectItem(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                          >
                            <div className={styles.resultItemLeft}>
                              <div className={styles.resultIconBox}>
                                <Icon size={16} />
                              </div>
                              <div className={styles.resultMeta}>
                                <div className={styles.resultTitleRow}>
                                  <span className={styles.resultTitle}>{item.title}</span>
                                </div>
                                <div className={styles.resultDesc}>{item.description}</div>
                              </div>
                            </div>
                            <div className={styles.enterAction}>
                              <CornerDownLeft size={13} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer Helper */}
              <div className={styles.dropdownFooter}>
                <div className={styles.footerHint}>
                  <span className={styles.kbdKey}>↑↓</span> Navigate
                  <span className={styles.kbdKey} style={{ marginLeft: 6 }}>↵</span> Open
                </div>
                <div>
                  <span className={styles.kbdKey}>ESC</span> to close
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Search Button (Visible on screens <= 768px) */}
      <button
        type="button"
        className={styles.mobileSearchBtn}
        onClick={() => {
          setIsMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 150);
        }}
        aria-label="Open search"
        title="Search"
      >
        <Search size={18} />
      </button>

      {/* Mobile Search Modal Overlay */}
      <AnimatePresence>
        {isMobileModalOpen && (
          <motion.div
            className={styles.mobileModalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileModalOpen(false)}
          >
            <motion.div
              className={styles.mobileModalContent}
              initial={{ y: -20, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -20, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.mobileHeaderRow}>
                <Search size={18} color="var(--accent-subtle-text)" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  placeholder="Search hub, license, team, courses..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={styles.searchInput}
                  autoFocus
                />
                {query && (
                  <button type="button" className={styles.clearBtn} onClick={() => setQuery("")}>
                    <X size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className={styles.mobileCloseBtn}
                  onClick={() => setIsMobileModalOpen(false)}
                  aria-label="Close search"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={styles.resultsScrollArea}>
                {filteredResults.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateTitle}>No results found</div>
                    <div className={styles.emptyStateDesc}>
                      No matches found for &quot;<strong>{query}</strong>&quot;.
                    </div>
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([category, items]) => (
                    <div key={category} className={styles.categoryGroup}>
                      <div className={styles.categoryHeader}>
                        <span>{category}</span>
                      </div>
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            className={styles.resultItem}
                            onClick={() => handleSelectItem(item)}
                          >
                            <div className={styles.resultItemLeft}>
                              <div className={styles.resultIconBox}>
                                <Icon size={16} />
                              </div>
                              <div className={styles.resultMeta}>
                                <div className={styles.resultTitle}>{item.title}</div>
                                <div className={styles.resultDesc}>{item.description}</div>
                              </div>
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
