"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import styles from "./courses.module.css";
import Shimmer from "../components/ui/Shimmer";
import EmptyState from "../components/ui/EmptyState";
import { fetchMyCourses } from "../../../lib/coursesApi";
import AccessBlocker from "../components/access/AccessBlocker";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

const TABS = ["All Courses", "In Progress", "Completed"] as const;

export default function CoursesPage() {
  return (
    <AccessBlocker direction="add_course">
      <CoursesContent />
    </AccessBlocker>
  );
}

function CoursesContent() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All Courses");
  const { data: profile } = useSessionProfile();
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
        <p className={styles.pageSubtitle}>Everything you're building toward, lesson by lesson.</p>
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

      {error && <p role="alert">{error instanceof Error ? error.message : "Couldn't load your courses — try refreshing in a bit."}</p>}
      {isLoading && <Shimmer rows={3} />}

      <div className={styles.coursesGrid}>
        {filtered.map((course) => {
          const completed = course.status === "completed";
          return (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.courseImage} style={{ background: `linear-gradient(135deg, ${course.coverAccent || "var(--color-primary-hover)"}, #0b0b0c 85%)` }}>
                <div className={styles.courseOverlay} />
              </div>

              <div className={styles.courseContent}>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>{course.moduleCount} modules</span>
                  {completed && <span className={`${styles.badge} ${styles.badgeCompleted}`}>Completed</span>}
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
                  {completed ? "Review course" : course.progressPercent > 0 ? "Pick up where you left off" : "Start course"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<BookOpen size={22} />}
          title={profile?.role === "student" && profile.course_access === "active" ? "You have access, but no course is assigned yet" : "Nothing here yet"}
          description={
            profile?.role === "student" && profile.course_access === "active"
              ? "Your course access is active, but no published course section is assigned to your account yet. Contact Hanbee staff and ask them to enroll your account in the right course section."
              : "Try a different tab, or check back once your next course lands."
          }
          actionLabel={profile?.role === "student" && profile.course_access === "active" ? "Contact Hanbee" : undefined}
          actionHref={profile?.role === "student" && profile.course_access === "active" ? "/contact" : undefined}
        />
      )}
    </div>
  );
}
