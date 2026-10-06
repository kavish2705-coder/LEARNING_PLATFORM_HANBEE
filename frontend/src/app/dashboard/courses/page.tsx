"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import styles from "./courses.module.css";
import Shimmer from "../components/ui/Shimmer";
import { fetchMyCourses } from "../../../lib/coursesApi";

const TABS = ["All Courses", "In Progress", "Completed"] as const;

export default function CoursesPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All Courses");
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ["my-courses"],
    queryFn: fetchMyCourses,
  });

  const list = courses ?? [];
  const filtered = list.filter((course) => {
    if (activeTab === "In Progress") return course.status === "in_progress";
    if (activeTab === "Completed") return course.status === "completed";
    return true;
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Courses & Learning</h1>
        <p className={styles.pageSubtitle}>Track your engineering curriculum progress</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load your courses."}</p>}
      {isLoading && <Shimmer rows={3} />}

      <div className={styles.coursesGrid}>
        {filtered.map((course) => {
          const completed = course.status === "completed";
          return (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.courseImage} style={{ background: `linear-gradient(135deg, ${course.coverAccent || "#0891b2"}, #0b0b0c 85%)` }}>
                <div className={styles.courseOverlay} />
              </div>

              <div className={styles.courseContent}>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>{course.moduleCount} modules</span>
                  {completed && <span className={`${styles.badge} ${styles.badgeCompleted}`}>COMPLETED</span>}
                </div>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <p className={styles.courseInstructor}>
                  {course.sectionNames.length ? course.sectionNames.join(", ") : course.description}
                </p>

                <div className={styles.progressSection}>
                  <div className={styles.progressTop}>
                    <span className={styles.progressLabel}>Progress</span>
                    <span className={styles.progressValue}>{course.progressPercent}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
                  </div>
                </div>

                <Link href={`/dashboard/courses/${course.id}`} className={styles.courseActionBtn}>
                  {completed ? "Review Course" : course.progressPercent > 0 ? "Continue Lesson →" : "Start Course →"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
          No courses found for this filter.
        </div>
      )}
    </div>
  );
}
