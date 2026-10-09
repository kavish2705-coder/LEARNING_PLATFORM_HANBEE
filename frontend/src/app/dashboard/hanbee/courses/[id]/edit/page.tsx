"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../../../dashboard.module.css";
import { Input, Select, Textarea } from "../../../../components/ui/FormField";
import Shimmer from "../../../../components/ui/Shimmer";
import { useConfirm } from "../../../../../../components/ui/useConfirm";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../../../lib/supabaseAuth";

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content_type: "video" | "document" | "text" | "link" | "slides";
  published: boolean;
  body_text: string;
  external_url: string;
  youtube_id: string | null;
  sort_order: number;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};

type Course = { id: string; title: string; description: string };

// Accepts a bare video ID or a full youtube.com/youtu.be URL and returns just the ID.
function extractYoutubeId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  return match ? match[1] : trimmed;
}

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const isValidCourseId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId ?? "");
  const { ask, dialog } = useConfirm();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [lessonDraft, setLessonDraft] = useState<Record<string, { title: string; contentType: Lesson["content_type"]; videoInput: string; notesPath: string; published: boolean }>>({});

  const load = useCallback(async () => {
    const account = await getAccountProfile();
    if (account.role !== "staff" && account.role !== "manager") throw new Error("Only approved Hanbee staff can edit course content.");
    const [courseRows, moduleRows] = await Promise.all([
      authenticatedSupabaseFetch<Course[]>(`/rest/v1/courses?select=id,title,description&id=eq.${courseId}`),
      authenticatedSupabaseFetch<Omit<Module, "lessons">[]>(`/rest/v1/modules?select=id,course_id,title,sort_order&course_id=eq.${courseId}&order=sort_order.asc`),
    ]);
    if (!courseRows[0]) throw new Error("Course not found.");
    const lessonRows = moduleRows.length
      ? await authenticatedSupabaseFetch<Lesson[]>(
          `/rest/v1/lessons?select=id,module_id,title,content_type,published,body_text,external_url,youtube_id,sort_order&module_id=in.(${moduleRows.map((m) => m.id).join(",")})&order=sort_order.asc`,
        )
      : [];
    setCourse(courseRows[0]);
    setModules(moduleRows.map((m) => ({ ...m, lessons: lessonRows.filter((l) => l.module_id === m.id) })));
  }, [courseId]);

  useEffect(() => {
    if (!isValidCourseId) { setLoading(false); return; }
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load this course."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, isValidCourseId]);

  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "That didn't work."); }
    finally { setBusy(false); }
  }

  async function addModule(event: FormEvent) {
    event.preventDefault();
    if (!newModuleTitle.trim()) return;
    // sort_order is computed server-side, under a row lock on the course,
    // so two staff adding to the same course at once can't collide.
    await act(
      () => authenticatedSupabaseFetch("/rest/v1/rpc/add_module", {
        method: "POST",
        body: JSON.stringify({ p_course: courseId, p_title: newModuleTitle.trim() }),
      }),
      "Module added.",
    );
    setNewModuleTitle("");
  }

  async function deleteModule(mod: Module) {
    if (!(await ask({ title: "Delete this module?", message: `"${mod.title}" and all its lessons will be removed.`, confirmLabel: "Delete module", tone: "danger" }))) return;
    await act(() => authenticatedSupabaseFetch(`/rest/v1/modules?id=eq.${mod.id}`, { method: "DELETE" }), "Module deleted.");
  }

  async function moveModule(mod: Module, direction: -1 | 1) {
    // Swapped atomically server-side (reorder_module RPC) so a failed
    // second request can never leave two modules with the same sort_order.
    await act(
      () => authenticatedSupabaseFetch("/rest/v1/rpc/reorder_module", {
        method: "POST",
        body: JSON.stringify({ p_module: mod.id, p_direction: direction === -1 ? "up" : "down" }),
      }),
      "Reordered.",
    );
  }

  function draftFor(moduleId: string) {
    return lessonDraft[moduleId] ?? { title: "", contentType: "video" as const, videoInput: "", notesPath: "", published: true };
  }

  async function addLesson(mod: Module, event: FormEvent) {
    event.preventDefault();
    const draft = draftFor(mod.id);
    if (!draft.title.trim()) return;
    // sort_order is computed server-side, under a row lock on the module,
    // so two staff adding to the same module at once can't collide.
    await act(
      () => authenticatedSupabaseFetch("/rest/v1/rpc/add_lesson", {
        method: "POST",
        body: JSON.stringify({
          p_module: mod.id,
          p_title: draft.title.trim(),
          p_content_type: draft.contentType,
          p_published: draft.published,
          p_youtube_id: draft.contentType === "video" ? extractYoutubeId(draft.videoInput) : null,
          p_external_url: draft.contentType === "document" ? draft.notesPath.trim() : "",
        }),
      }),
      "Lesson added.",
    );
    setLessonDraft((prev) => ({ ...prev, [mod.id]: { title: "", contentType: "video", videoInput: "", notesPath: "", published: true } }));
  }

  async function deleteLesson(lesson: Lesson) {
    if (!(await ask({ title: "Delete this lesson?", message: `"${lesson.title}" will be removed for every student.`, confirmLabel: "Delete lesson", tone: "danger" }))) return;
    await act(() => authenticatedSupabaseFetch(`/rest/v1/lessons?id=eq.${lesson.id}`, { method: "DELETE" }), "Lesson deleted.");
  }

  async function togglePublished(lesson: Lesson) {
    await act(
      () => authenticatedSupabaseFetch(`/rest/v1/lessons?id=eq.${lesson.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ published: !lesson.published }) }),
      lesson.published ? "Lesson unpublished." : "Lesson published.",
    );
  }

  if (!isValidCourseId) return <div className={styles.sectionCard} role="alert"><p>We couldn't find that course.</p></div>;
  if (loading) return <Shimmer rows={4} />;
  if (error && !course) return <div className={styles.sectionCard} role="alert"><p>We couldn't load this course. Please try again.</p></div>;
  if (!course) return null;

  return (
    <div>
      {dialog}
      <div className={styles.pageHeader}>
        <Link href="/dashboard/hanbee/courses" style={{ color: "var(--text-muted)", fontSize: 13 }}>← All courses</Link>
        <h1 className={styles.pageTitle}>{course.title}</h1>
        <p className={styles.pageSubtitle}>Add modules and lessons. Published lessons are visible to enrolled students.</p>
      </div>

      {error && <p role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {notice && <p role="status" style={{ marginBottom: 12 }}>{notice}</p>}

      <form className={styles.sectionCard} onSubmit={addModule} style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end" }}>
        <label style={{ flex: 1 }}>
          New module title
          <Input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="e.g. Flight Controller Basics" maxLength={200} />
        </label>
        <button type="submit" className={styles.actionBtn} disabled={busy || !newModuleTitle.trim()}>Add module</button>
      </form>

      {modules.length === 0 && <div className={styles.sectionCard}>No modules yet. Add one above to get started.</div>}

      <div style={{ display: "grid", gap: 20 }}>
        {[...modules].sort((a, b) => a.sort_order - b.sort_order).map((mod, modIndex, sortedModules) => {
          const draft = draftFor(mod.id);
          return (
            <section key={mod.id} className={styles.sectionCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <h2 className={styles.sectionTitle}>{mod.title}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className={styles.actionBtn} disabled={busy || modIndex === 0} onClick={() => void moveModule(mod, -1)}>↑</button>
                  <button type="button" className={styles.actionBtn} disabled={busy || modIndex === sortedModules.length - 1} onClick={() => void moveModule(mod, 1)}>↓</button>
                  <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void deleteModule(mod)}>Delete module</button>
                </div>
              </div>

              {mod.lessons.length === 0 && <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>No lessons yet.</p>}
              <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                {[...mod.lessons].sort((a, b) => a.sort_order - b.sort_order).map((lesson) => (
                  <div key={lesson.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 10, flexWrap: "wrap" }}>
                    <div>
                      <strong>{lesson.title}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: 10, fontSize: 13 }}>
                        {lesson.content_type}{lesson.content_type === "video" && lesson.youtube_id ? ` · ${lesson.youtube_id}` : ""}{lesson.content_type === "document" && lesson.external_url ? ` · ${lesson.external_url}` : ""} · {lesson.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void togglePublished(lesson)}>{lesson.published ? "Unpublish" : "Publish"}</button>
                      <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void deleteLesson(lesson)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={(e) => void addLesson(mod, e)} style={{ display: "grid", gap: 10, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <label>
                    Lesson title
                    <Input value={draft.title} onChange={(e) => setLessonDraft((prev) => ({ ...prev, [mod.id]: { ...draft, title: e.target.value } }))} placeholder="e.g. Wiring the flight controller" maxLength={200} />
                  </label>
                  <label>
                    Type
                    <Select value={draft.contentType} onChange={(e) => setLessonDraft((prev) => ({ ...prev, [mod.id]: { ...draft, contentType: e.target.value as Lesson["content_type"] } }))}>
                      <option value="video">Video</option>
                      <option value="document">Notes (document)</option>
                    </Select>
                  </label>
                </div>
                {draft.contentType === "video" ? (
                  <label>
                    YouTube URL or video ID
                    <Input value={draft.videoInput} onChange={(e) => setLessonDraft((prev) => ({ ...prev, [mod.id]: { ...draft, videoInput: e.target.value } }))} placeholder="https://www.youtube.com/watch?v=..." />
                  </label>
                ) : (
                  <label>
                    Notes path
                    <Input value={draft.notesPath} onChange={(e) => setLessonDraft((prev) => ({ ...prev, [mod.id]: { ...draft, notesPath: e.target.value } }))} placeholder="/notes/..." />
                  </label>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={draft.published} onChange={(e) => setLessonDraft((prev) => ({ ...prev, [mod.id]: { ...draft, published: e.target.checked } }))} />
                  Publish immediately
                </label>
                <button type="submit" className={styles.actionBtn} disabled={busy || !draft.title.trim()} style={{ justifySelf: "start" }}>Add lesson</button>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
