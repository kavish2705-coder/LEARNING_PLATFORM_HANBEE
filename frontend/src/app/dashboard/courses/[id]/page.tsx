"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Play, CheckCircle } from "lucide-react";
import Link from "next/link";
import styles from "./lesson.module.css";
import Shimmer from "../../components/ui/Shimmer";
import { completeLesson, fetchCourseContent, type CourseLesson } from "../../../../lib/coursesApi";

export default function LessonViewer() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const { data: course, isLoading, error } = useQuery({
    queryKey: ["course-content", courseId],
    queryFn: () => fetchCourseContent(courseId),
    enabled: Boolean(courseId),
  });

  const lessons = useMemo(() => (course?.modules ?? []).flatMap((module) => module.lessons.map((lesson) => ({ lesson, moduleTitle: module.title }))), [course]);
  const firstOpen = lessons.find((entry) => !entry.lesson.completed) ?? lessons[0];
  const current = lessons.find((entry) => entry.lesson.id === (selectedId ?? firstOpen?.lesson.id));
  const index = current ? lessons.indexOf(current) : -1;
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;

  async function markComplete(lesson: CourseLesson) {
    setBusy(true);
    setMessage("");
    try {
      await completeLesson(lesson.id, courseId, course?.title ?? "");
      await queryClient.invalidateQueries({ queryKey: ["course-content", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      setMessage("Lesson marked complete.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "We couldn't save your progress.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <Shimmer rows={4} />;
  if (error) return <p role="alert">{error instanceof Error ? error.message : "We couldn't load this course."}</p>;
  if (!course) return null;

  return (
    <div className={styles.lessonContainer}>
      <Link href="/dashboard/courses" className={styles.backButton}>
        <ChevronLeft size={16} /> Back to Courses
      </Link>

      <div className={styles.lessonHeader}>
        <div>
          <h1 className={styles.lessonTitle}>{current?.lesson.title ?? course.title}</h1>
          <p className={styles.lessonSubtitle}>{course.title}{current ? ` · ${current.moduleTitle}` : ""}</p>
        </div>
        <div className={styles.progressPill}>
          <span>{course.progressPercent}% Completed</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${course.progressPercent}%` }} />
          </div>
        </div>
      </div>

      {!current && <p>This course has no lessons yet.</p>}

      {current && (
        <div className={styles.contentGrid}>
          <div className={styles.mainContent}>
            {current.lesson.youtubeId ? (
              <div className={styles.videoPlayerContainer}>
                <iframe
                  title={current.lesson.title}
                  src={`https://www.youtube.com/embed/${current.lesson.youtubeId}`}
                  style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
                  allowFullScreen
                />
              </div>
            ) : (
              <div className={styles.videoPlaceholder}>
                <Play size={32} fill="currentColor" />
              </div>
            )}

            <div className={styles.tabPanel}>
              {current.lesson.bodyText && <div className={styles.markdownContent} style={{ whiteSpace: "pre-wrap" }}>{current.lesson.bodyText}</div>}
              {current.lesson.externalUrl && (
                <p style={{ marginTop: 16 }}>
                  <a href={current.lesson.externalUrl} target="_blank" rel="noopener noreferrer">Open lesson resource ↗</a>
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {previous && <button type="button" onClick={() => setSelectedId(previous.lesson.id)}>← Previous</button>}
              <button
                type="button"
                className={styles.actionButton}
                disabled={busy || current.lesson.completed}
                onClick={() => void markComplete(current.lesson)}
              >
                {current.lesson.completed ? "Completed" : busy ? "Saving…" : "Mark complete"}
              </button>
              {next && <button type="button" onClick={() => setSelectedId(next.lesson.id)}>Next →</button>}
            </div>
            {message && <p role="status" style={{ marginTop: 10 }}>{message}</p>}
          </div>

          <div className={styles.sidebarMenu}>
            <h3 className={styles.sidebarTitle}>Course Syllabus</h3>
            {(course.modules ?? []).map((module) => (
              <div key={module.id}>
                <p style={{ margin: "10px 0 4px", fontWeight: 600 }}>{module.title}</p>
                <ul className={styles.syllabusList}>
                  {module.lessons.map((lesson) => {
                    const active = lesson.id === current.lesson.id;
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(lesson.id)}
                          className={active ? styles.syllabusItemActive : lesson.completed ? styles.syllabusItemCompleted : styles.syllabusItemLocked}
                          style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", textAlign: "left", display: "flex", gap: 6 }}
                        >
                          {lesson.completed ? <CheckCircle size={16} /> : null} {lesson.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
