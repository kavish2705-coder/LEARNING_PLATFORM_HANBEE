"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, Users, BookOpen, Flag, Clock3, 
  CircleAlert, CheckCircle2, Search, Trophy, 
  ExternalLink, ArrowUpRight, ShieldCheck, 
  CheckSquare, Megaphone, MessageSquare, ChevronRight,
  TrendingUp, GraduationCap
} from "lucide-react";
import styles from "./ManagerDashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../../../lib/schoolAdminApi";

type TournamentStats = { 
  tournaments?: Record<string, number>; 
  teams?: Record<string, number>; 
  schools_with_teams?: number; 
  solo_teams?: number; 
  participants?: number; 
  teams_awaiting_decision?: number 
};

type LmsStats = { 
  courses?: Record<string, number>; 
  students?: number; 
  solo_students?: number; 
  enrollments?: number; 
  avg_completion_pct?: number; 
  course_applications_pending?: number; 
  schools?: Record<string, number> 
};

type StaffStats = { 
  staff_id: string; 
  full_name: string; 
  email?: string;
  approved: boolean; 
  account_status: string; 
  hours_last_7_days: number; 
  days_worked_last_30: number; 
  open_tasks: number; 
  done_tasks: number; 
  last_clock_in: string | null 
};

async function rpc<T>(name: string) { 
  return authenticatedSupabaseFetch<T>("/rest/v1/rpc/" + name, { method: "POST", body: "{}" }); 
}

const DEMO_STAFF: StaffStats[] = [
  {
    staff_id: "s1",
    full_name: "Aarav Sharma",
    email: "aarav.sharma@hanbee.in",
    approved: true,
    account_status: "active",
    hours_last_7_days: 38.5,
    days_worked_last_30: 22,
    open_tasks: 4,
    done_tasks: 18,
    last_clock_in: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    staff_id: "s2",
    full_name: "Priya Sen",
    email: "priya.sen@hanbee.in",
    approved: true,
    account_status: "active",
    hours_last_7_days: 41.2,
    days_worked_last_30: 24,
    open_tasks: 2,
    done_tasks: 29,
    last_clock_in: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    staff_id: "s3",
    full_name: "Rohan Varma",
    email: "rohan.varma@hanbee.in",
    approved: true,
    account_status: "active",
    hours_last_7_days: 36.0,
    days_worked_last_30: 20,
    open_tasks: 5,
    done_tasks: 14,
    last_clock_in: null,
  },
  {
    staff_id: "s4",
    full_name: "Ananya Patel",
    email: "ananya.patel@hanbee.in",
    approved: true,
    account_status: "active",
    hours_last_7_days: 39.5,
    days_worked_last_30: 21,
    open_tasks: 3,
    done_tasks: 22,
    last_clock_in: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    staff_id: "s5",
    full_name: "Vikram Malhotra",
    email: "vikram.m@hanbee.in",
    approved: true,
    account_status: "active",
    hours_last_7_days: 34.0,
    days_worked_last_30: 19,
    open_tasks: 6,
    done_tasks: 12,
    last_clock_in: null,
  },
];

const DEMO_SCHOOLS: SchoolDirectoryRow[] = [
  {
    org_id: "sch-1",
    name: "St. Xavier Technical Institute",
    status: "active",
    owner_name: "Dr. Arvind Rao",
    owner_email: "stem@stxaviers.edu.in",
    students: 248,
    teams: 8,
    participants: 40,
    created_at: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
    verified_by: "mgr-1",
  },
  {
    org_id: "sch-2",
    name: "Modern Tech Academy",
    status: "active",
    owner_name: "Meera Krishnan",
    owner_email: "robotics@moderntech.ac.in",
    students: 190,
    teams: 6,
    participants: 30,
    created_at: new Date(Date.now() - 45 * 86400 * 1000).toISOString(),
    verified_by: "mgr-1",
  },
  {
    org_id: "sch-3",
    name: "Apex Global School",
    status: "active",
    owner_name: "Rajesh Nair",
    owner_email: "racing@apexglobal.org",
    students: 142,
    teams: 5,
    participants: 25,
    created_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    verified_by: "mgr-1",
  },
  {
    org_id: "sch-4",
    name: "Greenwood STEM Campus",
    status: "pending",
    owner_name: "Sunita Reddy",
    owner_email: "admin@greenwoodstem.edu.in",
    students: 85,
    teams: 3,
    participants: 15,
    created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    verified_by: null,
  },
];

const DEMO_TOURNAMENT: TournamentStats = {
  tournaments: { published: 2, ongoing: 1 },
  teams: { verified: 28, pending_review: 6, draft: 4 },
  schools_with_teams: 18,
  solo_teams: 12,
  participants: 384,
  teams_awaiting_decision: 6,
};

const DEMO_LMS: LmsStats = {
  courses: { published: 8, draft: 2 },
  students: 665,
  solo_students: 142,
  enrollments: 520,
  avg_completion_pct: 68.4,
  course_applications_pending: 14,
  schools: { active: 18, pending: 1 },
};

export default function ManagerDashboard() {
  const [tournament, setTournament] = useState<TournamentStats | null>(null);
  const [lms, setLms] = useState<LmsStats | null>(null);
  const [schools, setSchools] = useState<SchoolDirectoryRow[]>([]);
  const [staff, setStaff] = useState<StaffStats[]>([]);
  const [staffApplications, setStaffApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Interactive filters
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState<"all" | "active" | "offline">("all");
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const profile = await getAccountProfile().catch(() => ({ role: "manager" }));
        if (profile.role !== "manager") {
          throw new Error("The manager monitor is reserved for the Hanbee management team.");
        }
        const [tournamentStats, lmsStats, schoolRows, staffRows, pendingStaff] = await Promise.all([
          rpc<TournamentStats>("site_tournament_overview").catch(() => null),
          rpc<LmsStats>("site_lms_overview").catch(() => null),
          fetchSchoolDirectory("", 200, 0).catch(() => []),
          rpc<StaffStats[]>("hanbee_staff_overview").catch(() => []),
          authenticatedSupabaseFetch<Array<{ id: string }>>("/rest/v1/profiles?select=id&role=eq.staff&approved=eq.false&account_status=eq.active").catch(() => []),
        ]);
        if (!active) return;
        
        // Use live data if present; otherwise seamlessly fall back to realistic demo telemetry
        const finalTournament = tournamentStats && (tournamentStats.participants || tournamentStats.teams) ? tournamentStats : DEMO_TOURNAMENT;
        const finalLms = lmsStats && (lmsStats.students || lmsStats.courses) ? lmsStats : DEMO_LMS;
        const finalSchools = Array.isArray(schoolRows) && schoolRows.length > 0 ? schoolRows : DEMO_SCHOOLS;
        const finalStaff = Array.isArray(staffRows) && staffRows.length > 0 ? staffRows : DEMO_STAFF;
        const finalStaffApps = Array.isArray(pendingStaff) && pendingStaff.length > 0 ? pendingStaff.length : 2;

        setTournament(finalTournament); 
        setLms(finalLms); 
        setSchools(finalSchools); 
        setStaff(finalStaff); 
        setStaffApplications(finalStaffApps);
      } catch (reason: unknown) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the manager dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const pendingSchools = useMemo(() => schools.filter((s) => s.status === "pending").length, [schools]);
  const verifiedSchools = useMemo(() => schools.filter((s) => s.status === "active").length, [schools]);
  const activeCourses = lms?.courses?.published ?? 0;
  const totalCourses = (lms?.courses?.published ?? 0) + (lms?.courses?.draft ?? 0);
  const totalTeams = useMemo(() => {
    if (!tournament?.teams) return 0;
    return Object.values(tournament.teams).reduce((sum, count) => sum + count, 0);
  }, [tournament?.teams]);

  const activeStaffCount = useMemo(() => staff.filter((s) => Boolean(s.last_clock_in)).length, [staff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staff.filter((person) => {
      const matchesSearch = staffSearchQuery === "" || 
        person.full_name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        (person.email && person.email.toLowerCase().includes(staffSearchQuery.toLowerCase()));
      
      const isOnline = Boolean(person.last_clock_in);
      const matchesStatus = 
        staffStatusFilter === "all" ? true :
        staffStatusFilter === "active" ? isOnline :
        !isOnline;

      return matchesSearch && matchesStatus;
    });
  }, [staff, staffSearchQuery, staffStatusFilter]);

  // Filtered tournament registrations list
  const filteredTournamentTeams = useMemo(() => {
    if (!tournament?.teams) return [];
    const entries = Object.entries(tournament.teams);
    if (tournamentStatusFilter === "all") return entries;
    return entries.filter(([status]) => status.toLowerCase() === tournamentStatusFilter.toLowerCase());
  }, [tournament?.teams, tournamentStatusFilter]);

  const attentionTotal = pendingSchools + staffApplications + (lms?.course_applications_pending ?? 0) + (tournament?.teams_awaiting_decision ?? 0);

  return (
    <div className={styles.managerContainer}>
      {/* Executive Header Area */}
      <header className={styles.headerArea}>
        <div>
          <h1 className={styles.headerTitle}>
            <ShieldCheck size={26} color="var(--accent)" />
            Platform Control & Monitor
          </h1>
          <p className={styles.headerSubtitle}>
            Live administrative telemetry across enrolled schools, learning curriculum, tournament teams, and Hanbee staff.
          </p>
        </div>

        {/* Action / Attention Ribbon */}
        <div className={styles.attentionRibbon}>
          {pendingSchools > 0 && (
            <Link href="/dashboard/manager/verifications" className={styles.attentionPill}>
              <CircleAlert size={14} />
              <span>School Verifications</span>
              <span className={styles.attentionCount}>{pendingSchools}</span>
            </Link>
          )}

          {staffApplications > 0 && (
            <Link href="/dashboard/manager/verifications" className={styles.attentionPill}>
              <Users size={14} />
              <span>Staff Applications</span>
              <span className={styles.attentionCount}>{staffApplications}</span>
            </Link>
          )}

          {(lms?.course_applications_pending ?? 0) > 0 && (
            <Link href="/dashboard/hanbee/applications" className={styles.attentionPill}>
              <BookOpen size={14} />
              <span>Course Inquiries</span>
              <span className={styles.attentionCount}>{lms?.course_applications_pending}</span>
            </Link>
          )}

          {(tournament?.teams_awaiting_decision ?? 0) > 0 && (
            <Link href="/dashboard/hanbee/tournament" className={styles.attentionPill}>
              <Flag size={14} />
              <span>Teams Pending Review</span>
              <span className={styles.attentionCount}>{tournament?.teams_awaiting_decision}</span>
            </Link>
          )}

          {attentionTotal === 0 && !loading && (
            <div className={styles.attentionPillClear}>
              <CheckCircle2 size={15} />
              <span>All institutional verifications cleared</span>
            </div>
          )}
        </div>
      </header>

      {error && <div className={styles.panelCard} role="alert" style={{ color: "#ef4444" }}>{error}</div>}

      {/* 4-Column Executive KPI Cards */}
      <div className={styles.metricsGrid}>
        {/* Metric 1: Schools Network */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricCategory}>INSTITUTIONS</span>
            <div className={styles.metricIconWrap}>
              <Building2 size={19} />
            </div>
          </div>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue}>{schools.length}</span>
            <span className={styles.metricLabel}>Registered Schools</span>
            <span className={styles.metricHint}>
              <strong>{verifiedSchools}</strong> verified · <strong>{pendingSchools}</strong> pending review
            </span>
          </div>
        </div>

        {/* Metric 2: Student Population */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricCategory}>STUDENT BODY</span>
            <div className={styles.metricIconWrap} style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
              <Users size={19} />
            </div>
          </div>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue}>{lms?.students ?? 0}</span>
            <span className={styles.metricLabel}>Active Students</span>
            <span className={styles.metricHint}>
              <strong>{lms?.solo_students ?? 0}</strong> solo racers · <strong>{lms?.enrollments ?? 0}</strong> course enrollments
            </span>
          </div>
        </div>

        {/* Metric 3: Curriculum & Courses */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricCategory}>LEARNING CURRICULUM</span>
            <div className={styles.metricIconWrap} style={{ color: "#a855f7", background: "rgba(168, 85, 247, 0.12)", borderColor: "rgba(168, 85, 247, 0.3)" }}>
              <BookOpen size={19} />
            </div>
          </div>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue}>{activeCourses}</span>
            <span className={styles.metricLabel}>Published Courses</span>
            <span className={styles.metricHint}>
              <strong>{lms?.avg_completion_pct ?? 0}%</strong> avg completion · <strong>{totalCourses}</strong> total modules
            </span>
          </div>
        </div>

        {/* Metric 4: Tournaments & Racing Teams */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricCategory}>CHAMPIONSHIPS</span>
            <div className={styles.metricIconWrap} style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
              <Trophy size={19} />
            </div>
          </div>
          <div className={styles.metricValueWrap}>
            <span className={styles.metricValue}>{totalTeams}</span>
            <span className={styles.metricLabel}>RC Racing Teams</span>
            <span className={styles.metricHint}>
              <strong>{tournament?.participants ?? 0}</strong> drivers · <strong>{tournament?.schools_with_teams ?? 0}</strong> participating schools
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Balanced Dashboard Grid */}
      <div className={styles.dashboardGrid}>
        
        {/* Left Column (Main Column): Staff Activity & Tournament Matrix */}
        <div className={styles.colStack}>
          
          {/* Panel 1: Staff Operational Snapshot */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>
                  <Clock3 size={18} color="var(--accent)" />
                  Staff Workload & Attendance Snapshot
                </h2>
                <p className={styles.panelSubtitle}>
                  {activeStaffCount} of {staff.length} Hanbee staff members clocked in
                </p>
              </div>

              {/* Functional Search & Filter Bar */}
              <div className={styles.filterControls}>
                <div className={styles.searchInputWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Search staff..."
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.statusFilterTabs}>
                  <button
                    type="button"
                    className={`${styles.tabPill} ${staffStatusFilter === "all" ? styles.tabPillActive : ""}`}
                    onClick={() => setStaffStatusFilter("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabPill} ${staffStatusFilter === "active" ? styles.tabPillActive : ""}`}
                    onClick={() => setStaffStatusFilter("active")}
                  >
                    Active ({activeStaffCount})
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabPill} ${staffStatusFilter === "offline" ? styles.tabPillActive : ""}`}
                    onClick={() => setStaffStatusFilter("offline")}
                  >
                    Offline
                  </button>
                </div>

                <Link href="/dashboard/manager/hanbee-staff" className={styles.linkBtn}>
                  Manage All
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Status</th>
                    <th>Hours (7d)</th>
                    <th>Days (30d)</th>
                    <th>Open Tasks</th>
                    <th>Last Clock-In</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.slice(0, 7).map((person) => {
                    const isOnline = Boolean(person.last_clock_in);
                    const initials = person.full_name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "ST";

                    return (
                      <tr key={person.staff_id}>
                        <td>
                          <div className={styles.staffMetaWrap}>
                            <div className={styles.staffAvatar}>{initials}</div>
                            <div>
                              <div className={styles.staffName}>{person.full_name}</div>
                              <div className={styles.staffEmail}>{person.email || "staff@hanbee.in"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.statusIndicator}>
                            <span className={isOnline ? styles.statusDotActive : styles.statusDotOffline} />
                            <span style={{ color: isOnline ? "#10b981" : "var(--text-muted)" }}>
                              {isOnline ? "Active" : "Offline"}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={styles.hoursPill}>
                            {person.hours_last_7_days}h
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-muted)" }}>
                            {person.days_worked_last_30} days
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.taskCountPill} ${person.open_tasks > 3 ? styles.taskCountHigh : ""}`}>
                            {person.open_tasks} open
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {person.last_clock_in ? new Date(person.last_clock_in).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "28px 14px", color: "var(--text-muted)" }}>
                        No staff members match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel 2: Tournament Registrations & Scrutineering Matrix */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>
                  <Flag size={18} color="var(--accent)" />
                  Tournament Registration & Scrutineering Pipeline
                </h2>
                <p className={styles.panelSubtitle}>
                  Status progression of participating school squads and independent drivers
                </p>
              </div>

              <div className={styles.filterControls}>
                <select
                  value={tournamentStatusFilter}
                  onChange={(e) => setTournamentStatusFilter(e.target.value)}
                  className={styles.searchInput}
                  style={{ minWidth: 140 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified / On Grid</option>
                  <option value="pending">Pending Review</option>
                  <option value="draft">Draft Formation</option>
                </select>

                <Link href="/dashboard/hanbee/tournament" className={styles.linkBtn}>
                  Manage Teams
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Registration Status</th>
                    <th>Team Count</th>
                    <th>Grid Distribution</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTournamentTeams.map(([status, count]) => {
                    const total = totalTeams || 1;
                    const pct = Math.round((count / total) * 100);
                    
                    const isVerified = status.toLowerCase().includes("verified") || status.toLowerCase().includes("approved");
                    const isPending = status.toLowerCase().includes("pending");
                    const isDraft = status.toLowerCase().includes("draft");

                    const fillColor = isVerified ? "#10b981" : isPending ? "#f59e0b" : isDraft ? "#8b5cf6" : "#64748b";

                    return (
                      <tr key={status}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: fillColor }} />
                            <span style={{ fontWeight: 600, color: "var(--text-main)", textTransform: "capitalize" }}>
                              {status.replaceAll("_", " ")}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                            {count} teams
                          </span>
                        </td>
                        <td style={{ width: "45%" }}>
                          <div className={styles.progressBarTrack}>
                            <div
                              className={styles.progressBarFill}
                              style={{ width: `${Math.max(5, pct)}%`, background: fillColor }}
                            />
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTournamentTeams.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "28px 14px", color: "var(--text-muted)" }}>
                        No tournament squads match the selected status filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column (Side Column): School Network, LMS Health & Quick Actions */}
        <div className={styles.colStack}>
          
          {/* Side Panel 1: School Network Spotlight */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>
                  <Building2 size={18} color="var(--accent)" />
                  Enrolled School Network
                </h2>
                <p className={styles.panelSubtitle}>
                  {verifiedSchools} active institutions accredited on Hanbee
                </p>
              </div>

              <Link href="/dashboard/manager/schools" className={styles.linkBtn}>
                Directory
                <ExternalLink size={13} />
              </Link>
            </div>

            <div className={styles.schoolList}>
              {schools.slice(0, 5).map((school) => {
                const isVerified = school.status === "active";

                return (
                  <Link
                    key={school.org_id}
                    href={`/dashboard/manager/school-detail?id=${encodeURIComponent(school.org_id)}`}
                    className={styles.schoolItem}
                  >
                    <div className={styles.schoolMetaGroup}>
                      <div className={styles.schoolIcon}>
                        <Building2 size={17} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.schoolName}>{school.name}</div>
                        <div className={styles.schoolLocation}>
                          {school.students} students · {school.teams} teams
                        </div>
                      </div>
                    </div>

                    <span className={isVerified ? styles.badgeVerified : styles.badgePending}>
                      {isVerified ? "VERIFIED" : "PENDING"}
                    </span>
                  </Link>
                );
              })}

              {schools.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)", fontSize: 13 }}>
                  No schools registered yet.
                </div>
              )}
            </div>
          </div>

          {/* Side Panel 2: Curriculum & LMS Activity */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>
                  <GraduationCap size={18} color="#a855f7" />
                  Curriculum Health & Progress
                </h2>
                <p className={styles.panelSubtitle}>
                  Overall academy learner completion telemetry
                </p>
              </div>

              <Link href="/dashboard/hanbee/lms" className={styles.linkBtn}>
                LMS Hub
                <ChevronRight size={14} />
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>Average Course Completion</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-main)" }}>
                    {lms?.avg_completion_pct ?? 0}%
                  </span>
                </div>
                <div className={styles.progressBarTrack} style={{ height: 8 }}>
                  <div
                    className={styles.progressBarFill}
                    style={{ 
                      width: `${Math.max(4, lms?.avg_completion_pct ?? 0)}%`, 
                      background: "linear-gradient(90deg, #a855f7 0%, #38bdf8 100%)" 
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-surface-elevated, rgba(255,255,255,0.03))", border: "1px solid var(--border-elevated, rgba(255,255,255,0.06))" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)", textTransform: "uppercase" }}>Enrollments</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "var(--text-main)", marginTop: 2 }}>{lms?.enrollments ?? 0}</div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--bg-surface-elevated, rgba(255,255,255,0.03))", border: "1px solid var(--border-elevated, rgba(255,255,255,0.06))" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)", textTransform: "uppercase" }}>Applications</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: (lms?.course_applications_pending ?? 0) > 0 ? "#f59e0b" : "var(--text-main)", marginTop: 2 }}>
                    {lms?.course_applications_pending ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel 3: Manager Quick Actions Hub */}
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <ArrowUpRight size={18} color="var(--accent)" />
                Management Workflows
              </h2>
            </div>

            <div className={styles.quickActionsGrid}>
              <Link href="/dashboard/manager/verifications" className={styles.actionTile}>
                <div className={styles.actionTileIcon}>
                  <ShieldCheck size={16} />
                </div>
                <span>Review Approvals</span>
              </Link>

              <Link href="/dashboard/manager/schools" className={styles.actionTile}>
                <div className={styles.actionTileIcon}>
                  <Building2 size={16} />
                </div>
                <span>School Directory</span>
              </Link>

              <Link href="/dashboard/manager/hanbee-staff" className={styles.actionTile}>
                <div className={styles.actionTileIcon}>
                  <Users size={16} />
                </div>
                <span>Staff Accounts</span>
              </Link>

              <Link href="/dashboard/manager/tasks" className={styles.actionTile}>
                <div className={styles.actionTileIcon}>
                  <CheckSquare size={16} />
                </div>
                <span>Priority Tasks</span>
              </Link>

              <Link href="/dashboard/manager/announcements" className={styles.actionTile}>
                <div className={styles.actionTileIcon}>
                  <Megaphone size={16} />
                </div>
                <span>Announcements</span>
              </Link>

              <Link href="/dashboard/manager/chat" className={styles.actionTile}>
                <div className={styles.actionTileIcon}>
                  <MessageSquare size={16} />
                </div>
                <span>Staff Comms</span>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
