"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayCircle, BookOpen, ListChecks, Award, AlertCircle, RotateCw } from "lucide-react";
import Link from "next/link";
import styles from "./school/SchoolOverview.module.css";
import { fetchMyCourses, type StudentCourseSummary } from "../../../lib/coursesApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

export default function LearningOverview() {
  const [courses, setCourses] = useState<StudentCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: profile } = useSessionProfile();

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchMyCourses();
      setCourses(result ?? []);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "We couldn't load your courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const currentCourse = courses.find((course) => course.status === "in_progress") ?? courses[0];
  const inProgress = courses.filter((course) => course.status === "in_progress").length;
  const completed = courses.filter((course) => course.status === "completed").length;
  const completedLessons = courses.reduce((total, course) => total + course.completedLessonCount, 0);

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";
  const studentName = profile?.full_name ? profile.full_name.split(" ")[0] : "Driver";

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.hubHeaderLeft}>
          <h1 className={styles.hubTitle} suppressHydrationWarning>
            {timeGreeting}, {studentName}!
          </h1>
          <p className={styles.hubSubtitle}>
            Your enrolled courses, interactive modules, and lesson progress.
          </p>
        </div>
      </header>

      {error ? (
        <section className={styles.sectionCard} style={{ textAlign: "center", padding: "36px 20px" }} role="alert">
          <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", marginBottom: 12 }}>
            <AlertCircle size={28} />
          </div>
          <h2 className={styles.sectionTitle} style={{ color: "var(--text-primary)", fontSize: "18px" }}>
            Unable to Load Courses
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "13.5px", maxWidth: 440, marginInline: "auto" }}>
            {error}
          </p>
          <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => void loadCourses()}
              className={styles.actionBtn}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <RotateCw size={15} /> Try Again
            </button>
          </div>
        </section>
      ) : currentCourse ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <span style={{ fontSize: "12px", color: "var(--accent-subtle-text)", fontWeight: 600 }}>
                {currentCourse.status === "completed" ? "Last Completed Course" : "Continue Learning"}
              </span>
              <h2 className={styles.sectionTitle} style={{ marginTop: 4 }}>{currentCourse.title}</h2>
              <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "13.5px" }}>
                {currentCourse.completedLessonCount} of {currentCourse.lessonCount} lessons completed
              </p>
            </div>
            <Link href={`/dashboard/courses/${encodeURIComponent(currentCourse.id)}`} className={styles.actionBtn}>
              <PlayCircle size={18} /> {currentCourse.status === "completed" ? "Review Course" : "Resume Course"}
            </Link>
          </div>
          <div className={styles.progressWrap} style={{ marginTop: 12 }}>
            <div className={styles.progressBarTrack} style={{ height: 10 }}>
              <div className={styles.progressBarFill} style={{ width: `${currentCourse.progressPercent}%` }} />
            </div>
            <span>{currentCourse.progressPercent}%</span>
          </div>
        </section>
      ) : (
        <section className={styles.sectionCard} style={{ textAlign: "center", padding: "40px" }}>
          <h2 className={styles.sectionTitle}>{loading ? "Loading your courses…" : "No courses assigned yet"}</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: "13.5px" }}>
            Courses assigned to your account will appear here.
          </p>
          <Link href="/dashboard/courses" className={styles.textLink} style={{ marginTop: 12 }}>
            Browse all courses →
          </Link>
        </section>
      )}

      <div className={styles.metricsGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <article className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricTitle}>Courses in Progress</span>
            <div className={styles.metricIconWrap}><BookOpen size={18} /></div>
          </div>
          <div className={styles.metricValue}>{loading ? "—" : inProgress}</div>
          <p className={styles.metricDetail}>Assigned and active</p>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricTitle}>Lessons Completed</span>
            <div className={styles.metricIconWrap}><ListChecks size={18} /></div>
          </div>
          <div className={styles.metricValue}>{loading ? "—" : completedLessons}</div>
          <p className={styles.metricDetail}>Across all courses</p>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricTitle}>Courses Completed</span>
            <div className={styles.metricIconWrap}><Award size={18} /></div>
          </div>
          <div className={styles.metricValue}>{loading ? "—" : completed}</div>
          <p className={styles.metricDetail}>Fully completed</p>
        </article>
      </div>
    </div>
  );
}

