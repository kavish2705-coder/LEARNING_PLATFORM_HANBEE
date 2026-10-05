"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, BookOpen, Building2, CircleAlert, Clock3, Flag, Users } from "lucide-react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";
import { fetchSchoolDirectory, type SchoolDirectoryRow } from "../../../../lib/schoolAdminApi";

type TournamentStats = { tournaments?: Record<string, number>; teams?: Record<string, number>; schools_with_teams?: number; solo_teams?: number; participants?: number; teams_awaiting_decision?: number };
type LmsStats = { courses?: Record<string, number>; students?: number; solo_students?: number; enrollments?: number; avg_completion_pct?: number; course_applications_pending?: number; schools?: Record<string, number> };
type StaffStats = { staff_id: string; full_name: string; approved: boolean; account_status: string; hours_last_7_days: number; days_worked_last_30: number; open_tasks: number; done_tasks: number; last_clock_in: string | null };
async function rpc<T>(name: string) { return authenticatedSupabaseFetch<T>("/rest/v1/rpc/" + name, { method: "POST", body: "{}" }); }

export default function ManagerDashboard() {
  const [tournament, setTournament] = useState<TournamentStats | null>(null);
  const [lms, setLms] = useState<LmsStats | null>(null);
  const [schools, setSchools] = useState<SchoolDirectoryRow[]>([]);
  const [staff, setStaff] = useState<StaffStats[]>([]);
  const [staffApplications, setStaffApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return <div>
    <header className={styles.pageHeader} style={{ marginBottom: "24px" }}>
      <div>
        <h1 className={styles.pageTitle}>Platform monitor</h1>
        <p className={styles.pageSubtitle}>Live view of school activity, learning, tournaments, and Hanbee staff.</p>
      </div>
      <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
        <AttentionLink href="/dashboard/manager/verifications" label="School registrations" count={pendingSchools} />
        <AttentionLink href="/dashboard/manager/verifications" label="Staff applications" count={staffApplications} />
        <AttentionLink href="/dashboard/hanbee/applications" label="Course applications" count={lms?.course_applications_pending ?? 0} />
      </div>
    </header>
    {error && <p role="alert" className={styles.sectionCard}>{error}</p>}
    {loading ? <div className={styles.sectionCard} role="status">Loading platform activity…</div> : <>

      {/* Summary Info Bar - Dense */}
      <div className={styles.sectionCard} style={{ display: "flex", gap: "32px", padding: "16px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Building2 size={20} style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Registered schools</div>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>{schools.length}</div>
          </div>
        </div>
        <div style={{ width: "1px", background: "var(--border-subtle)" }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Users size={20} style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active students</div>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>{lms?.students ?? 0}</div>
          </div>
        </div>
        <div style={{ width: "1px", background: "var(--border-subtle)" }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BookOpen size={20} style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Published courses</div>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>{activeCourses}</div>
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid} style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.tableTitle}>Staff Snapshot</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <input type="text" placeholder="Filter staff..." className={styles.filterInput} style={{ background: "var(--bg-input)", border: "var(--border-subtle)", padding: "6px 12px", borderRadius: "6px", color: "var(--text-main)", fontSize: "13px" }} />
                <Link href="/dashboard/manager/hanbee-staff" className={styles.actionBtn} style={{ textDecoration: "none", fontSize: "13px" }}>View all</Link>
              </div>
            </div>
            <table className={styles.dataTable}>
              <thead><tr><th>Staff member</th><th>Hours (7d)</th><th>Days (30d)</th><th>Open Tasks</th><th>Status</th><th>Last clock-in</th></tr></thead>
              <tbody>
                {orderedStaff.map((person) => <tr key={person.staff_id}>
                  <td style={{ color: "var(--text-main)", fontWeight: "500" }}>{person.full_name}</td>
                  <td>{person.hours_last_7_days}</td>
                  <td>{person.days_worked_last_30}</td>
                  <td>{person.open_tasks}</td>
                  <td>
                    <span className={styles.badge + ' ' + (person.last_clock_in ? styles.badgeCompleted : styles.badgeUpcoming)}>
                      {person.last_clock_in ? "Active" : "Offline"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{person.last_clock_in ? new Date(person.last_clock_in).toLocaleString() : "—"}</td>
                </tr>)}
                {orderedStaff.length === 0 && <tr><td colSpan={6}>No staff activity is available.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className={styles.tableTitle}>Tournament Registrations</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <select className={styles.filterInput} style={{ background: "var(--bg-input)", border: "var(--border-subtle)", padding: "6px 12px", borderRadius: "6px", color: "var(--text-main)", fontSize: "13px" }}>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
                <Link href="/dashboard/hanbee/tournament" className={styles.actionBtn} style={{ textDecoration: "none", fontSize: "13px" }}>Manage teams</Link>
              </div>
            </div>
            <table className={styles.dataTable}>
              <thead>
                <tr><th>Status</th><th>Count</th><th>Progress</th></tr>
              </thead>
              <tbody>
                {Object.entries(tournament?.teams ?? {}).map(([status, count]) => {
                  const total = tournament?.participants ?? 1;
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
                })}
                {Object.keys(tournament?.teams ?? {}).length === 0 && <tr><td colSpan={3}>No tournament teams are registered.</td></tr>}
              </tbody>
            </table>
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
