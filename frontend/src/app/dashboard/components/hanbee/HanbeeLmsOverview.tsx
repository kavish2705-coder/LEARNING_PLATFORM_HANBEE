"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, BookOpen, ClipboardList, GraduationCap, School, Users, ExternalLink, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import styles from "../../dashboard.module.css";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";

type Overview = {
  courses?: Record<string, number>;
  students?: number;
  solo_students?: number;
  enrollments?: number;
  avg_completion_pct?: number;
  course_applications_pending?: number;
  schools?: Record<string, number>;
};

type RecentCourse = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

const number = (value?: number) => new Intl.NumberFormat().format(value ?? 0);

export default function HanbeeLmsOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const profile = await getAccountProfile();
      if (profile.role !== "staff" && profile.role !== "manager") throw new Error("This overview is for approved Hanbee staff.");
      const [data, courseRows] = await Promise.all([
        authenticatedSupabaseFetch<Overview>("/rest/v1/rpc/site_lms_overview", { method: "POST", body: "{}" }),
        authenticatedSupabaseFetch<RecentCourse[]>("/rest/v1/courses?select=id,title,status,created_at&order=created_at.desc&limit=5").catch(() => []),
      ]);
      if (active) {
        setOverview(data);
        setRecentCourses(courseRows || []);
      }
    }
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the learning overview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const courses = overview?.courses ?? {};
  const schools = overview?.schools ?? {};
  const published = courses.published ?? 0;
  const drafts = courses.draft ?? 0;
  const archived = courses.archived ?? 0;
  const pendingApplications = overview?.course_applications_pending ?? 0;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Learning Platform Overview</h1>
        <p className={styles.pageSubtitle}>Real-time monitoring of course engagement, student enrollments, and academic progress</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading learning overview…</p> : (
        <>
          {/* Top 4-Column Stat Grid */}
          <div className={styles.metricsGrid}>
            <Metric 
              icon={<BookOpen size={20} />} 
              label="Published Courses" 
              value={number(published)} 
              detail={`${number(drafts)} drafts · ${number(archived)} archived`}
              trend="Active" 
            />
            <Metric 
              icon={<GraduationCap size={20} />} 
              label="Active Students" 
              value={number(overview?.students)} 
              detail={`${number(overview?.solo_students)} learning independently`}
              trend="+12% this month"
            />
            <Metric 
              icon={<Activity size={20} />} 
              label="Active Enrollments" 
              value={number(overview?.enrollments)} 
              detail={`${number(overview?.avg_completion_pct)}% average completion`}
              trend="Steady"
            />
            <Metric 
              icon={<School size={20} />} 
              label="Partner Schools" 
              value={number(Object.values(schools).reduce((sum, count) => sum + count, 0))} 
              detail={`${number(schools.active)} verified & active`}
              trend="Verified"
            />
          </div>

          {/* Interactive Operational Shortcuts: Needs Your Attention */}
          <section className={styles.sectionCard} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className={styles.sectionTitle}>Needs Your Attention</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: 13 }}>Critical administrative queues requiring staff action.</p>
              </div>
              {pendingApplications > 0 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)", padding: "4px 12px", borderRadius: 999 }}>
                  {pendingApplications} Pending Application{pendingApplications > 1 ? "s" : ""}
                </span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={13} /> Queues Clear
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 18 }}>
              <Link href="/dashboard/hanbee/applications" style={{ textDecoration: "none", color: "inherit" }}>
                <div className={styles.actionCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245, 158, 11, 0.14)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ClipboardList size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-main)" }}>Course Applications</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {pendingApplications > 0 ? `${pendingApplications} pending student review` : "Zero pending submissions"}
                      </div>
                    </div>
                    <ArrowRight size={16} color="var(--accent-subtle-text)" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/hanbee/assessment-reviews" style={{ textDecoration: "none", color: "inherit" }}>
                <div className={styles.actionCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.14)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <GraduationCap size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-main)" }}>Quiz & Assessment Reviews</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Audit student passing grades</div>
                    </div>
                    <ArrowRight size={16} color="var(--accent-subtle-text)" />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/hanbee/courses" style={{ textDecoration: "none", color: "inherit" }}>
                <div className={styles.actionCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(8, 145, 178, 0.14)", color: "#0891b2", border: "1px solid rgba(8, 145, 178, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BookOpen size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-main)" }}>Manage Course Catalog</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Author lessons & publish syllabus</div>
                    </div>
                    <ArrowRight size={16} color="var(--accent-subtle-text)" />
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Structured Course Catalog Preview */}
          <section className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
              <div>
                <h2 className={styles.sectionTitle}>Course Catalog Breakdown</h2>
                <span className={styles.metricLabel}>Curriculum Lifecycle</span>
              </div>
              <Link href="/dashboard/hanbee/courses" className={styles.secondaryActionBtn}>
                <BookOpen size={14} /> Full Catalog Management <ArrowRight size={14} />
              </Link>
            </div>

            {/* Status Breakdown Pills */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--border-elevated)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", color: "#10b981", fontWeight: 700 }}>Published</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", marginTop: 4 }}>{published}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Live for enrolled students</div>
              </div>

              <div style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--border-elevated)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", color: "#f59e0b", fontWeight: 700 }}>Drafts</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", marginTop: 4 }}>{drafts}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>In-development modules</div>
              </div>

              <div style={{ background: "var(--bg-surface-elevated)", border: "1px solid var(--border-elevated)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700 }}>Archived</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-main)", marginTop: 4 }}>{archived}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Retired or seasonal courses</div>
              </div>
            </div>

            {/* Recent Courses Preview Table */}
            {recentCourses.length > 0 && (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Recent Course Title</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCourses.map((course) => (
                      <tr key={course.id}>
                        <td className={styles.cellHighlight}>{course.title}</td>
                        <td>
                          <span style={{ 
                            fontSize: 11, 
                            fontFamily: "monospace", 
                            fontWeight: 700, 
                            textTransform: "uppercase", 
                            padding: "3px 8px", 
                            borderRadius: 6,
                            background: course.status === "published" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                            color: course.status === "published" ? "#10b981" : "#f59e0b",
                            border: `1px solid ${course.status === "published" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`
                          }}>
                            {course.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {new Date(course.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Link href={`/dashboard/courses/${encodeURIComponent(course.id)}`} style={{ fontSize: 12, color: "var(--accent-subtle-text)", textDecoration: "none", fontWeight: 600 }}>
                              Preview
                            </Link>
                            <span style={{ color: "var(--border-subtle)" }}>·</span>
                            <Link href={`/dashboard/hanbee/courses/${encodeURIComponent(course.id)}/edit`} style={{ fontSize: 12, color: "var(--text-main)", textDecoration: "none" }}>
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, detail, trend }: { icon?: ReactNode; label: string; value: string; detail?: string; trend?: string }) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricCardHeader}>
        <span className={styles.metricLabel}>{label}</span>
        {icon && (
          <span style={{ color: "var(--accent-subtle-text)", background: "var(--accent-subtle-bg)", padding: 6, borderRadius: 8, display: "flex" }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <div className={styles.metricValue} style={{ fontSize: "28px", fontWeight: 800 }}>{value}</div>
        {trend && (
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#10b981", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 6px", borderRadius: 6, fontWeight: 700 }}>
            {trend}
          </span>
        )}
      </div>
      {detail && <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 12 }}>{detail}</p>}
    </article>
  );
}
