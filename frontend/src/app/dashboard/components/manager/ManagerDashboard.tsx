"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, BookOpen, Building2, CircleAlert, Clock3, Flag, Users, ShieldCheck } from "lucide-react";
import styles from "../../dashboard.module.css";
import ActionCenter, { type DashboardActionItem } from "../ui/ActionCenter";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../../../lib/schoolAdminApi";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";

type TournamentStats = { tournaments?: Record<string, number>; teams?: Record<string, number>; schools_with_teams?: number; solo_teams?: number; participants?: number; teams_awaiting_decision?: number };
type LmsStats = { courses?: Record<string, number>; students?: number; solo_students?: number; enrollments?: number; avg_completion_pct?: number; course_applications_pending?: number; schools?: Record<string, number> };
type StaffStats = { staff_id: string; full_name: string; approved: boolean; account_status: string; hours_last_7_days: number; days_worked_last_30: number; open_tasks: number; done_tasks: number; last_clock_in: string | null };
async function rpc<T>(name: string) { return authenticatedSupabaseFetch<T>("/rest/v1/rpc/" + name, { method: "POST", body: "{}" }); }

export default function ManagerDashboard() {
  const { data: profile } = useSessionProfile();
  const [tournament, setTournament] = useState<TournamentStats | null>(null);
  const [lms, setLms] = useState<LmsStats | null>(null);
  const [schools, setSchools] = useState<SchoolDirectoryRow[]>([]);
  const [staff, setStaff] = useState<StaffStats[]>([]);
  const [staffApplications, setStaffApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    let active = true;
    async function load() {
      const profile = await getAccountProfile();
      if (profile.role !== "manager") throw new Error("The manager monitor is available to the Hanbee manager.");
      const [tournamentStats, lmsStats, schoolRows, staffRows, pendingStaff] = await Promise.all([
        rpc<TournamentStats>("site_tournament_overview"),
        rpc<LmsStats>("site_lms_overview"),
        fetchSchoolDirectory("", 200, 0),
        rpc<StaffStats[]>("hanbee_staff_overview"),
        authenticatedSupabaseFetch<Array<{ id: string }>>("/rest/v1/profiles?select=id&role=eq.staff&approved=eq.false&account_status=eq.active"),
      ]);
      if (!active) return;
      setTournament(tournamentStats); setLms(lmsStats); setSchools(schoolRows); setStaff(staffRows); setStaffApplications(pendingStaff.length);
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the manager dashboard."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingSchools = schools.filter((school) => school.status === "pending").length;
  const activeCourses = lms?.courses?.published ?? 0;
  const attentionCount = pendingSchools + staffApplications + (lms?.course_applications_pending ?? 0) + (tournament?.teams_awaiting_decision ?? 0);
  const orderedStaff = [...staff].sort((a, b) => (b.last_clock_in ?? "").localeCompare(a.last_clock_in ?? "")).slice(0, 6);

  const firstName = profile?.full_name.trim().split(/\s+/)[0];
  const managerActions: DashboardActionItem[] = [
    {
      id: "school-verifications",
      title: "Review school registrations",
      description: pendingSchools > 0
        ? `${pendingSchools} school registration${pendingSchools === 1 ? "" : "s"} need review.`
        : "No school registrations are waiting for review.",
      href: "/dashboard/manager/verifications",
      icon: <Building2 size={18} />,
      meta: `${pendingSchools} pending`,
    },
    {
      id: "staff-verifications",
      title: "Review staff applications",
      description: staffApplications > 0
        ? `${staffApplications} Hanbee staff application${staffApplications === 1 ? "" : "s"} need review.`
        : "No Hanbee staff applications are waiting for review.",
      href: "/dashboard/manager/verifications",
      icon: <ShieldCheck size={18} />,
      meta: `${staffApplications} pending`,
    },
    {
      id: "course-applications",
      title: "Review course applications",
      description: (lms?.course_applications_pending ?? 0) > 0
        ? `${lms?.course_applications_pending} student course application${lms?.course_applications_pending === 1 ? "" : "s"} need review.`
        : "No student course applications are waiting for review.",
      href: "/dashboard/hanbee/applications",
      icon: <BookOpen size={18} />,
      meta: `${lms?.course_applications_pending ?? 0} pending`,
    },
    {
      id: "tournament-decisions",
      title: "Review tournament entries",
      description: (tournament?.teams_awaiting_decision ?? 0) > 0
        ? `${tournament?.teams_awaiting_decision} tournament entr${tournament?.teams_awaiting_decision === 1 ? "y needs" : "ies need"} a decision.`
        : "No tournament entries are waiting for a decision.",
      href: "/dashboard/hanbee/tournament",
      icon: <Flag size={18} />,
      meta: `${tournament?.teams_awaiting_decision ?? 0} pending`,
    },
  ];

  return <div>
    <header className={`${styles.pageHeader} ${styles.managerPageHeader}`}>
      <div>
        <span className={styles.managerEyebrow}>Manager overview</span>
        <h1 className={`${styles.pageTitle} ${styles.managerPageTitle}`}>
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className={styles.pageSubtitle}>Here’s your platform at a glance across schools, learning, tournaments, and Hanbee staff.</p>
      </div>
      <div className={styles.managerAttentionLinks}>
        <AttentionLink href="/dashboard/manager/verifications" label="School registrations" count={pendingSchools} />
        <AttentionLink href="/dashboard/manager/verifications" label="Staff applications" count={staffApplications} />
        <AttentionLink href="/dashboard/hanbee/applications" label="Course applications" count={lms?.course_applications_pending ?? 0} />
      </div>
    </header>
    {error && <p role="alert" className={styles.sectionCard}>{error}</p>}
    {loading ? <div className={styles.sectionCard} role="status">Loading platform activity…</div> : <>

      {!error && (
        <ActionCenter
          title="Manager action center"
          description="Review real platform work queues and jump directly to the items that need a decision."
          items={managerActions}
        />
      )}

      <div className={styles.managerMetricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Registered schools</span>
            <span className={styles.metricIconBadge}><Building2 size={19} /></span>
          </div>
          <div className={styles.metricValue}>{schools.length}</div>
          <div className={styles.metricSubtext}>Schools on the platform</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Active students</span>
            <span className={styles.metricIconBadge}><Users size={19} /></span>
          </div>
          <div className={styles.metricValue}>{lms?.students ?? 0}</div>
          <div className={styles.metricSubtext}>Students across Hanbee</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Published courses</span>
            <span className={styles.metricIconBadge}><BookOpen size={19} /></span>
          </div>
          <div className={styles.metricValue}>{activeCourses}</div>
          <div className={styles.metricSubtext}>Courses currently available</div>
        </div>
      </div>

      <div className={styles.dashboardGrid} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className={styles.mainColumn}>
          <div className={`${styles.sectionCard} ${styles.managerSectionCard}`}>
            <div className={styles.managerSectionHeader}>
              <div>
                <h2 className={styles.tableTitle}>Staff snapshot</h2>
                <p className={styles.managerSectionSubtitle}>Recent attendance and workload at a glance.</p>
              </div>
              <Link href="/dashboard/manager/hanbee-staff" className={styles.actionBtn} style={{ textDecoration: "none", fontSize: "13px" }}>View all staff</Link>
            </div>
            {orderedStaff.length === 0 ? (
              <p className={styles.managerEmptyState}>No staff activity is available.</p>
            ) : (
              <div className={styles.managerStaffGrid}>
                {orderedStaff.map((person) => {
                  const initials = person.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                  return (
                    <article key={person.staff_id} className={styles.managerStaffCard}>
                      <div className={styles.managerStaffCardHeader}>
                        <div className={styles.managerStaffIdentity}>
                          <span className={styles.managerStaffAvatar}>{initials || "H"}</span>
                          <h3 className={styles.managerStaffName}>{person.full_name}</h3>
                        </div>
                        <span className={styles.badge + " " + (person.last_clock_in ? styles.badgeCompleted : styles.badgeUpcoming)}>
                          {person.last_clock_in ? "Active" : "Offline"}
                        </span>
                      </div>
                      <div className={styles.managerStaffStats}>
                        <div><span>Hours · 7 days</span><strong>{person.hours_last_7_days}</strong></div>
                        <div><span>Days · 30 days</span><strong>{person.days_worked_last_30}</strong></div>
                        <div><span>Open tasks</span><strong>{person.open_tasks}</strong></div>
                      </div>
                      <p className={styles.managerStaffLastSeen}>
                        Last clock-in <time>{person.last_clock_in ? new Date(person.last_clock_in).toLocaleString() : "—"}</time>
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`${styles.sectionCard} ${styles.managerSectionCard}`}>
            <div className={styles.managerSectionHeader}>
              <h2 className={styles.tableTitle}>Tournament Registrations</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  className={styles.filterInput}
                  value={registrationFilter}
                  onChange={(event) => setRegistrationFilter(event.target.value as "all" | "pending" | "approved")}
                  style={{ background: "var(--bg-input)", border: "var(--border-subtle)", padding: "6px 12px", borderRadius: "6px", color: "var(--text-main)", fontSize: "13px" }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
                <Link href="/dashboard/hanbee/tournament" className={styles.actionBtn} style={{ textDecoration: "none", fontSize: "13px" }}>Manage teams</Link>
              </div>
            </div>
            <div className={styles.managerTableWrap}>
            <table className={styles.dataTable}>
              <thead>
                <tr><th>Status</th><th>Count</th><th>Progress</th></tr>
              </thead>
              <tbody>
                {(() => {
                  const allEntries = Object.entries(tournament?.teams ?? {});
                  const filtered = allEntries.filter(([status]) => {
                    if (registrationFilter === "pending") return status === "applied" || status === "payment_declared";
                    if (registrationFilter === "approved") return status === "verified";
                    return true;
                  });
                  if (allEntries.length === 0) return <tr><td colSpan={3}>No tournament teams are registered.</td></tr>;
                  if (filtered.length === 0) return <tr><td colSpan={3}>No registrations match this filter.</td></tr>;
                  const total = tournament?.participants ?? 1;
                  return filtered.map(([status, count]) => {
                    const pct = Math.min((count / total) * 100, 100);
                    return (
                      <tr key={status}>
                        <td style={{ color: "var(--text-main)", textTransform: "capitalize" }}>{status.replaceAll("_", " ")}</td>
                        <td style={{ fontWeight: "600" }}>{count}</td>
                        <td style={{ width: "40%" }}>
                          <div className={styles.sparkline} style={{ marginTop: 0, height: "6px" }}>
                            <div className={styles.bar} style={{ height: "100%", width: `${pct}%`, backgroundColor: "var(--accent)" }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            </div>
          </div>

        </div>
      </div>
    </>}
  </div>;
}

function AttentionLink({ href, label, count }: { href: string; label: string; count: number }) {
  if (count === 0) return null;
  return <Link href={href} className={styles.actionBtn} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", background: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" }}>
    <CircleAlert size={16} />
    <div style={{ fontSize: "13px" }}>
      <strong>{count}</strong> {label}
    </div>
  </Link>;
}
