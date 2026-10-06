"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Play, CheckCircle, FileText } from "lucide-react";
import Link from "next/link";
import styles from "./lesson.module.css";
import Shimmer from "../../components/ui/Shimmer";
import Modal from "../../../../components/ui/Modal";
import { completeLesson, fetchCourseContent, type CourseLesson } from "../../../../lib/coursesApi";

type Tab = "video" | "notes";

export default function LessonViewer() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [busy, setBusy] = useState(false);
  const notesFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState<{ target: string; pending: string[] } | null>(null);
  const navigateRef = useRef<(targetIndex: number) => void>(() => undefined);

  const { data: course, isLoading, error } = useQuery({
    queryKey: ["course-content", courseId],
    queryFn: () => fetchCourseContent(courseId),
    enabled: Boolean(courseId),
  });

  const lessons = useMemo(
    () => (course?.modules ?? []).flatMap((module) => module.lessons.map((lesson) => ({ lesson, moduleTitle: module.title }))),
    [course],
  );
  const firstOpen = lessons.find((entry) => !entry.lesson.completed) ?? lessons[0];
  const current = lessons.find((entry) => entry.lesson.id === (selectedId ?? firstOpen?.lesson.id));
  const index = current ? lessons.indexOf(current) : -1;
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;

  const hasNotes = Boolean(current?.lesson.externalUrl?.startsWith("/notes/"));
  const hasVideo = Boolean(current?.lesson.youtubeId);
  const activeTab: Tab = tab ?? (hasVideo ? "video" : "notes");

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

  function pendingFor(entry: { lesson: CourseLesson }) {
    const items: string[] = [];
    if (entry.lesson.youtubeId && !entry.lesson.completed) items.push("Watch this lesson's video");
    if (!entry.lesson.completed) items.push('Press "Mark complete" for this lesson');
    return items;
  }

  function goTo(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= lessons.length || index < 0) return;
    if (targetIndex > index && current && !current.lesson.completed) {
      setBlocked({ target: lessons[targetIndex].lesson.title, pending: pendingFor(current) });
      return;
    }
    open(lessons[targetIndex].lesson.id);
  }
  navigateRef.current = goTo;

  function attachNotesLinks(frame: HTMLIFrameElement | null) {
    const doc = frame?.contentDocument;
    if (!doc || !frame) return;
    doc.addEventListener("click", (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const file = link.getAttribute("href")?.split("/").pop() ?? "";
      if (!file.endsWith(".html") || file === "index.html") return;
      const targetIndex = lessons.findIndex((entry) => entry.lesson.externalUrl.endsWith("/" + file));
      if (targetIndex < 0) return;
      event.preventDefault();
      navigateRef.current(targetIndex);
    }, true);
  }

  function open(id: string) {
    setBlocked(null);
    setSelectedId(id);
    setTab(null);
    setMessage("");
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
            <div className={styles.segmented} role="tablist" aria-label="Lesson view">
              <button type="button" role="tab" aria-selected={activeTab === "video"} className={`${styles.segment} ${activeTab === "video" ? styles.segmentActive : ""}`} onClick={() => setTab("video")}>
                <Play size={14} /> Video
              </button>
              <button type="button" role="tab" aria-selected={activeTab === "notes"} className={`${styles.segment} ${activeTab === "notes" ? styles.segmentActive : ""}`} onClick={() => setTab("notes")} disabled={!hasNotes}>
                <FileText size={14} /> Notes
              </button>
            </div>

            <div className={`${styles.panel} ${activeTab === "video" ? styles.panelActive : ""}`} aria-hidden={activeTab !== "video"}>
              {hasVideo ? (
                <div className={styles.videoPlayerContainer}>
                  <iframe
                    title={current.lesson.title}
                    src={`https://www.youtube.com/embed/${current.lesson.youtubeId}`}
                    className={styles.videoFrame}
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className={styles.videoPlayerContainer}>
                  <div className={styles.videoPlaceholder}>
                    <Play size={36} fill="currentColor" />
                    <p>Video lesson coming soon</p>
                  </div>
                </div>
              )}
            </div>

            <div className={`${styles.panel} ${activeTab === "notes" ? styles.panelActive : ""}`} aria-hidden={activeTab !== "notes"}>
              {hasNotes ? (
                <iframe
                  ref={notesFrameRef}
                  onLoad={(event) => attachNotesLinks(event.currentTarget)}
                  key={current.lesson.id}
                  title={`${current.lesson.title} notes`}
                  src={current.lesson.externalUrl}
                  className={styles.notesFrame}
                />
              ) : (
                <div className={styles.videoPlayerContainer}><div className={styles.videoPlaceholder}><p>No notes for this lesson yet.</p></div></div>
              )}
            </div>

            <div className={styles.lessonActions}>
              {previous ? <button type="button" className={styles.navButton} onClick={() => open(previous.lesson.id)}>← Previous</button> : <span />}
              <button
                type="button"
                className={styles.actionButton}
                disabled={busy || current.lesson.completed}
                onClick={() => void markComplete(current.lesson)}
              >
                {current.lesson.completed ? "Completed" : busy ? "Saving…" : "Mark complete"}
              </button>
              {next ? <button type="button" className={styles.navButton} onClick={() => goTo(index + 1)}>Next →</button> : <span />}
            </div>
            {message && <p role="status" className={styles.statusLine}>{message}</p>}
          </div>

          <aside className={styles.sidebarMenu}>
            <h3 className={styles.sidebarTitle}>Course Syllabus</h3>
            {(course.modules ?? []).map((module) => (
              <div key={module.id} className={styles.unit}>
                <p className={styles.unitTitle}>{module.title}</p>
                <ul className={styles.syllabusList}>
                  {module.lessons.map((lesson) => {
                    const active = lesson.id === current.lesson.id;
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => open(lesson.id)}
                          className={`${styles.syllabusButton} ${active ? styles.syllabusItemActive : lesson.completed ? styles.syllabusItemCompleted : ""}`}
                        >
                          {lesson.completed ? <CheckCircle size={14} /> : <span className={styles.bullet} />}
                          <span>{lesson.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>
        </div>
      )}

      <Modal
        open={blocked !== null}
        title="Finish this lesson first"
        onClose={() => setBlocked(null)}
        actions={<button type="button" className={styles.actionButton} onClick={() => setBlocked(null)}>OK</button>}
      >
        <p>To continue to <strong>{blocked?.target}</strong>, complete these first:</p>
        <ul>
          {blocked?.pending.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Modal>
    </div>
  );
}
