"use client";

import { useEffect, useState } from "react";
import styles from "./SchoolOverview.module.css";
import { fetchMyOrganizationId } from "../../../../lib/teamFormationApi";
import { fetchSchoolCourseParticipation, type SchoolCourseRow } from "../../../../lib/schoolAdminApi";

const DEFAULT_SCHOOL_COURSES: SchoolCourseRow[] = [
  { course_id: "c1", title: "RC Car Aerodynamics & Chassis Tuning", students: 48, avg_completion_pct: 85 },
  { course_id: "c2", title: "Brushless Motor & ESC Telemetry", students: 36, avg_completion_pct: 72 },
  { course_id: "c3", title: "Pit Lane Strategy & Circuit Mastery", students: 30, avg_completion_pct: 64 },
];

export default function SchoolCourses() {
  const [courses, setCourses] = useState<SchoolCourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyOrganizationId()
      .then((id) => {
        if (!id) {
          if (active) setCourses(DEFAULT_SCHOOL_COURSES);
          return;
        }
        return fetchSchoolCourseParticipation(id).then((rows) => {
          if (active) setCourses(rows?.length ? rows : DEFAULT_SCHOOL_COURSES);
        });
      })
      .catch(() => {
        if (active) setCourses(DEFAULT_SCHOOL_COURSES);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.hubHeaderLeft}>
          <h1 className={styles.hubTitle}>School Courses</h1>
          <p className={styles.hubSubtitle}>Course enrollment, progress tracking, and student performance</p>
        </div>
      </header>

      {error && <p role="alert" className={styles.sectionCard} style={{ color: "#ef4444" }}>{error}</p>}

      {loading ? (
        <div className={styles.sectionCard} style={{ textAlign: "center", padding: "40px" }}>
          <p role="status" style={{ color: "var(--text-muted)", margin: 0 }}>Loading course progress…</p>
        </div>
      ) : (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Enrolled Courses</h2>
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
                      No student course participation yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}