"use client";

import { useEffect, useState } from "react";
import { PlayCircle, BookOpen, ListChecks, Award } from "lucide-react";
import Link from "next/link";
import styles from "../dashboard.module.css";
import { fetchMyCourses, type StudentCourseSummary } from "../../../lib/coursesApi";

export default function LearningOverview() {
  const [courses, setCourses] = useState<StudentCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyCourses()
      .then((result) => { if (active) setCourses(result); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your courses.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const currentCourse = courses.find((course) => course.status === "in_progress") ?? courses[0];
  const inProgress = courses.filter((course) => course.status === "in_progress").length;
  const completed = courses.filter((course) => course.status === "completed").length;
  const completedLessons = courses.reduce((total, course) => total + course.completedLessonCount, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Learning Overview</h1>
        <p className={styles.pageSubtitle}>Your courses and lesson progress</p>
      </div>

      {currentCourse ? (
        <div className={`${styles.sectionCard} ${styles.learningHero}`}>
          <div className={styles.learningHeroContent}>
            <span className={styles.metricLabel}>{currentCourse.status === "completed" ? "Completed Course" : "Continue Learning"}</span>
            <h2 className={styles.learningHeroTitle}>{currentCourse.title}</h2>
            <p className={styles.bodyMuted}>
              {currentCourse.completedLessonCount} of {currentCourse.lessonCount} lessons completed
            </p>
            <div className={styles.progressRow}>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${currentCourse.progressPercent}%` }} />
              </div>
              <span className={styles.progressValue}>{currentCourse.progressPercent}%</span>
            </div>
          </div>
          <Link href={`/dashboard/courses/${encodeURIComponent(currentCourse.id)}`} className={styles.primaryBtn}>
            <PlayCircle size={18} /> {currentCourse.status === "completed" ? "Review Course" : "Resume Course"}
          </Link>
        </div>
      ) : (
        <div className={`${styles.sectionCard} ${styles.emptyOverview}`}>
          <h2 className={styles.emptyOverviewTitle}>{loading ? "Loading your courses…" : "No courses yet"}</h2>
          <p className={styles.bodyMuted}>{error || "Courses assigned to your account will appear here."}</p>
          <Link href="/dashboard/courses" className={styles.tertiaryAction}>Browse my courses</Link>
        </div>
      )}

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricTitle}>Courses in Progress</span><span className={styles.metricIconBadge}><BookOpen size={18} aria-hidden="true" /></span></div>
          <div className={styles.metricValue}>{loading ? "—" : inProgress}</div>
          <div className={styles.metricSubtext}>Assigned and active</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricTitle}>Lessons Completed</span><span className={styles.metricIconBadge}><ListChecks size={18} aria-hidden="true" /></span></div>
          <div className={styles.metricValue}>{loading ? "—" : completedLessons}</div>
          <div className={styles.metricSubtext}>Across your courses</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricTitle}>Courses Completed</span><span className={styles.metricIconBadge}><Award size={18} aria-hidden="true" /></span></div>
          <div className={styles.metricValue}>{loading ? "—" : completed}</div>
          <div className={styles.metricSubtext}>Fully completed courses</div>
        </div>
      </div>
    </div>
  );
}
