"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Search, TrendingUp } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input } from "../ui/FormField";
import Shimmer from "../ui/Shimmer";
import EmptyState from "../ui/EmptyState";
import { fetchMyOrganizationId } from "../../../../lib/teamFormationApi";
import { fetchSchoolCourseParticipation, type SchoolCourseRow } from "../../../../lib/schoolAdminApi";

export default function SchoolCourses() {
  const [courses, setCourses] = useState<SchoolCourseRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyOrganizationId()
      .then((id) => {
        if (!id) throw new Error("Your account is not linked to an active school.");
        return fetchSchoolCourseParticipation(id);
      })
      .then((rows) => { if (active) setCourses(rows); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load course participation."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => {
    const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
    const avgCompletion = courses.length === 0
      ? 0
      : Math.round(courses.reduce((sum, c) => sum + c.avg_completion_pct, 0) / courses.length);
    return { totalStudents, avgCompletion };
  }, [courses]);

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : courses;
    return [...filtered].sort((a, b) => b.avg_completion_pct - a.avg_completion_pct);
  }, [courses, search]);

  return (
    <div>
      <header className={styles.pageHeader}>
        <div className={styles.metricLabel}>School portal</div>
        <h1 className={styles.pageTitle}>School Courses</h1>
        <p className={styles.pageSubtitle}>Read-only course enrollment and progress for your students</p>
      </header>

      {error && <p role="alert" className={styles.sectionCard}>{error}</p>}

      {loading ? (
        <Shimmer rows={4} />
      ) : (
        <div className={styles.splitLayout}>
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Course participation</h2>
              {courses.length > 0 && (
                <div style={{ position: "relative", minWidth: 220 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…" style={{ paddingLeft: 32 }} />
                </div>
              )}
            </div>

            {courses.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={22} />}
                title="No course activity yet"
                description="Once your students start their first lesson, each course's enrollment and progress will show up here."
                actionLabel="Invite students"
                actionHref="/dashboard/school/students"
              />
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Students</th>
                      <th>Average progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCourses.map((course) => (
                      <tr key={course.course_id}>
                        <td className={styles.cellHighlight}>{course.title}</td>
                        <td>{course.students}</td>
                        <td><Progress value={course.avg_completion_pct} /></td>
                        <td>
                          {course.avg_completion_pct < 40 ? (
                            <span className={`${styles.badge} ${styles.badgeAttention}`}>Needs a nudge</span>
                          ) : course.avg_completion_pct >= 70 ? (
                            <span className={`${styles.badge} ${styles.badgeHealthy}`}>On track</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>In progress</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visibleCourses.length === 0 && (
                      <tr><td colSpan={4}>No courses match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className={styles.sideRail}>
            <div className={styles.railSummaryCard}>
              <span className={styles.metricLabel}>At a glance</span>
              <div className={styles.railStat}>
                <span className={styles.railStatLabel}><BookOpen size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Courses with activity</span>
                <span className={styles.railStatValue}>{courses.length}</span>
              </div>
              <div className={styles.railStat}>
                <span className={styles.railStatLabel}><GraduationCap size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Total enrollments</span>
                <span className={styles.railStatValue}>{totals.totalStudents}</span>
              </div>
              <div className={styles.railStat}>
                <span className={styles.railStatLabel}><TrendingUp size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Average completion</span>
                <span className={styles.railStatValue}>{totals.avgCompletion}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 7, background: "var(--bg-card-hover)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: "var(--accent)" }} />
      </div>
      <span>{value}%</span>
    </div>
  );
}
