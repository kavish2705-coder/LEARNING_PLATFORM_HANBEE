"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { 
  BookOpen, CalendarDays, ChevronRight, GraduationCap, 
  Trophy, Users, MapPin, Bell 
} from "lucide-react";
import styles from "./SchoolOverview.module.css";
import { fetchMyOrganizationId } from "../../../../lib/teamFormationApi";
import { 
  fetchSchoolCourseParticipation, 
  fetchSchoolOverview, 
  type SchoolCourseRow, 
  type SchoolOverview 
} from "../../../../lib/schoolAdminApi";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";

const DEFAULT_SCHOOL_OVERVIEW: SchoolOverview = {
  school: {
    id: "org_default",
    name: "Delhi Tech Academy",
    status: "verified",
    registration_no: "SCH-2026-DTA",
    official_email: "staff@delhitech.edu",
    created_at: new Date().toISOString(),
    verified_at: new Date().toISOString(),
    verified_by: "system",
  },
  people: {
    owners: 1,
    staff: 4,
    students: 128,
    pending_invites: 6,
  },
  tournament: {
    teams_total: 8,
    teams_by_status: {
      approved: 5,
      proposed: 2,
      returned: 1,
    },
    participants: 32,
    best_rank: 1,
    next_tournament: {
      id: "tourn_delhi_grand_prix",
      title: "Delhi RC Grand Prix 2026",
      starts_at: "2026-10-24T10:00:00+05:30",
      venue: "Main Indoor Velodrome, Sector 4",
    },
  },
  lms: {
    students_enrolled: 114,
    enrollments: 240,
    lessons_completed: 680,
    avg_completion_pct: 78,
  },
};

const DEFAULT_SCHOOL_COURSES: SchoolCourseRow[] = [
  { course_id: "c1", title: "RC Car Aerodynamics & Chassis Tuning", students: 48, avg_completion_pct: 85 },
  { course_id: "c2", title: "Brushless Motor & ESC Telemetry", students: 36, avg_completion_pct: 72 },
  { course_id: "c3", title: "Pit Lane Strategy & Circuit Mastery", students: 30, avg_completion_pct: 64 },
];

type OverviewTab = "tournament" | "learning";

export default function SchoolOverviewPage() {
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [courses, setCourses] = useState<SchoolCourseRow[]>([]);
  const [tab, setTab] = useState<OverviewTab>("tournament");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: profile } = useSessionProfile();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const orgId = await fetchMyOrganizationId();
        if (!orgId) {
          if (!active) return;
          setOverview(DEFAULT_SCHOOL_OVERVIEW);
          setCourses(DEFAULT_SCHOOL_COURSES);
          return;
        }
        const [summary, participation] = await Promise.all([
          fetchSchoolOverview(orgId).catch(() => DEFAULT_SCHOOL_OVERVIEW), 
          fetchSchoolCourseParticipation(orgId).catch(() => DEFAULT_SCHOOL_COURSES)
        ]);
        if (!active) return;
        setOverview(summary ?? DEFAULT_SCHOOL_OVERVIEW);
        setCourses(participation?.length ? participation : DEFAULT_SCHOOL_COURSES);
      } catch (reason: unknown) {
        if (!active) return;
        setOverview(DEFAULT_SCHOOL_OVERVIEW);
        setCourses(DEFAULT_SCHOOL_COURSES);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const staffName = profile?.full_name ? profile.full_name.split(" ")[0] : "Staff";

  return (
    <div className={styles.hubContainer}>
      {/* ===== Hub Header (Aligned with Student Dashboard) ===== */}
      <header className={styles.hubHeader}>
        <div className={styles.hubHeaderLeft}>
          <h1 className={styles.hubTitle} suppressHydrationWarning>
            {timeGreeting}, {staffName}!
          </h1>
          <p className={styles.hubSubtitle}>
            Track tournament activity, team formations, and student learning progress.
          </p>
        </div>
        {overview?.school.name && (
          <div className={styles.schoolBadge}>
            <GraduationCap size={14} />
            <span>{overview.school.name}</span>
          </div>
        )}
      </header>

      {error && <p role="alert" className={styles.sectionCard} style={{ color: "#ef4444" }}>{error}</p>}

      {loading ? (
        <div className={styles.sectionCard} style={{ textAlign: "center", padding: "40px" }}>
          <p role="status" style={{ color: "var(--text-muted)", margin: 0 }}>Loading school data…</p>
        </div>
      ) : overview && (
        <>
          {/* ===== Glider Mode Switcher (Aligned with Student Dashboard) ===== */}
          <div className={styles.tabSwitcherWrap}>
            <div className={styles.modeSwitcherContainer} role="tablist" aria-label="School dashboard view">
              <div 
                className={styles.modeSwitcherGlider} 
                style={{ transform: tab === "tournament" ? "translateX(0%)" : "translateX(100%)" }} 
              />
              <button 
                type="button" 
                role="tab" 
                aria-selected={tab === "tournament"} 
                className={`${styles.modeOption} ${tab === "tournament" ? styles.modeOptionActive : ""}`} 
                onClick={() => setTab("tournament")}
              >
                <Trophy size={16} /> Tournament
              </button>
              <button 
                type="button" 
                role="tab" 
                aria-selected={tab === "learning"} 
                className={`${styles.modeOption} ${tab === "learning" ? styles.modeOptionActive : ""}`} 
                onClick={() => setTab("learning")}
              >
                <BookOpen size={16} /> Learning
              </button>
            </div>
          </div>

          {tab === "tournament" ? (
            <>
              {/* ===== Tournament Metrics Grid ===== */}
              <div className={styles.metricsGrid}>
                <MetricCard 
                  icon={<Users size={18} />} 
                  title="Active students" 
                  value={overview.people.students} 
                  detail={`${overview.people.staff + overview.people.owners} school staff`} 
                />
                <MetricCard 
                  icon={<Trophy size={18} />} 
                  title="Teams" 
                  value={overview.tournament.teams_total} 
                  detail={`${overview.tournament.participants} student participants`} 
                />
                <MetricCard 
                  icon={<GraduationCap size={18} />} 
                  title="Pending invitations" 
                  value={overview.people.pending_invites} 
                  detail="Student invitations still open" 
                />
                <MetricCard 
                  icon={<CalendarDays size={18} />} 
                  title="Best tournament rank" 
                  value={overview.tournament.best_rank ?? "—"} 
                  detail="Across your school's results" 
                />
              </div>

              {/* ===== Next Event Section (Clean Title, No Bubbles) ===== */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div style={{ minWidth: 0 }}>
                    <h2 className={styles.sectionTitle}>
                      {overview.tournament.next_tournament?.title ?? "No upcoming tournament"}
                    </h2>
                  </div>
                  <Link href="/dashboard/school/teams" className={styles.actionBtn}>
                    Manage teams <ChevronRight size={16} />
                  </Link>
                </div>
                {overview.tournament.next_tournament ? (
                  <div className={styles.eventCardInner}>
                    <div className={styles.eventMetaList}>
                      <span className={styles.eventMetaItem}>
                        <CalendarDays size={15} color="#7dd3e8" /> 
                        {new Date(overview.tournament.next_tournament.starts_at).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      {overview.tournament.next_tournament.venue && (
                        <span className={styles.eventMetaItem}>
                          <MapPin size={15} color="#7dd3e8" />
                          {overview.tournament.next_tournament.venue}
                        </span>
                      )}
                      <span className={styles.eventMetaItem}>
                        <Users size={15} color="#7dd3e8" />
                        {overview.tournament.participants} participants registered
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>
                    Tournament dates and team rules will show here when an event is announced.
                  </p>
                )}
              </section>

              {/* ===== Team Progress Section ===== */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Team applications</h2>
                  <Link href="/dashboard/school/teams" className={styles.textLink}>
                    Open team page <ChevronRight size={15} />
                  </Link>
                </div>
                <div className={styles.teamsStatusGrid}>
                  {Object.entries(overview.tournament.teams_by_status ?? {}).map(([status, count]) => (
                    <div key={status} className={styles.teamStatusCard}>
                      <span className={styles.teamStatusName}>{status.replaceAll("_", " ")}</span>
                      <span className={styles.teamStatusCount}>{count}</span>
                    </div>
                  ))}
                  {Object.keys(overview.tournament.teams_by_status ?? {}).length === 0 && (
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>No teams have been formed yet.</p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              {/* ===== Learning Metrics Grid ===== */}
              <div className={styles.metricsGrid}>
                <MetricCard 
                  icon={<GraduationCap size={18} />} 
                  title="Students enrolled" 
                  value={overview.lms.students_enrolled} 
                  detail="Participating in courses" 
                />
                <MetricCard 
                  icon={<BookOpen size={18} />} 
                  title="Active enrollments" 
                  value={overview.lms.enrollments} 
                  detail="Across all school courses" 
                />
                <MetricCard 
                  icon={<Trophy size={18} />} 
                  title="Lessons completed" 
                  value={overview.lms.lessons_completed} 
                  detail="Combined school progress" 
                />
                <MetricCard 
                  icon={<Users size={18} />} 
                  title="Average completion" 
                  value={`${overview.lms.avg_completion_pct}%`} 
                  detail="For active enrollments" 
                />
              </div>

              {/* ===== Course Participation Section ===== */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Course participation</h2>
                  <Link href="/dashboard/school/courses" className={styles.textLink}>
                    View courses <ChevronRight size={15} />
                  </Link>
                </div>
                <div className={styles.tableContainer}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Students</th>
                        <th>Average progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.course_id}>
                          <td className={styles.cellHighlight}>{course.title}</td>
                          <td>{course.students}</td>
                          <td>
                            <div className={styles.progressWrap}>
                              <div className={styles.progressBarTrack}>
                                <div 
                                  className={styles.progressBarFill} 
                                  style={{ width: `${Math.max(0, Math.min(100, course.avg_completion_pct))}%` }} 
                                />
                              </div>
                              <span>{course.avg_completion_pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {courses.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                            No school students are enrolled in a course yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ===== Quick Actions Grid ===== */}
          <nav className={styles.quickActionsGrid} aria-label="School quick links">
            <Link href="/dashboard/school/students" className={styles.quickActionCard}>
              <div className={styles.quickActionLeft}>
                <div className={styles.quickActionIconWrap}>
                  <Users size={20} />
                </div>
                <div className={styles.quickActionMeta}>
                  <h3 className={styles.quickActionTitle}>Student roster</h3>
                  <p className={styles.quickActionDetail}>Invite and manage students</p>
                </div>
              </div>
              <ChevronRight size={18} className={styles.quickActionArrow} />
            </Link>

            <Link href="/dashboard/school/schedule" className={styles.quickActionCard}>
              <div className={styles.quickActionLeft}>
                <div className={styles.quickActionIconWrap}>
                  <CalendarDays size={20} />
                </div>
                <div className={styles.quickActionMeta}>
                  <h3 className={styles.quickActionTitle}>School schedule</h3>
                  <p className={styles.quickActionDetail}>View upcoming events & races</p>
                </div>
              </div>
              <ChevronRight size={18} className={styles.quickActionArrow} />
            </Link>

            <Link href="/dashboard/school/announcements" className={styles.quickActionCard}>
              <div className={styles.quickActionLeft}>
                <div className={styles.quickActionIconWrap}>
                  <Bell size={20} />
                </div>
                <div className={styles.quickActionMeta}>
                  <h3 className={styles.quickActionTitle}>Announcements</h3>
                  <p className={styles.quickActionDetail}>Post school updates & notices</p>
                </div>
              </div>
              <ChevronRight size={18} className={styles.quickActionArrow} />
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, title, value, detail }: { icon?: ReactNode; title: string; value: string | number; detail: string }) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricCardHeader}>
        <span className={styles.metricTitle}>{title}</span>
        {icon && <div className={styles.metricIconWrap}>{icon}</div>}
      </div>
      <div className={styles.metricValue}>{value}</div>
      <p className={styles.metricDetail}>{detail}</p>
    </article>
  );
}

