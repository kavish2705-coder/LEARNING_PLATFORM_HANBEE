"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../dashboard.module.css";
import { Input, Textarea } from "../../components/ui/FormField";
import Shimmer from "../../components/ui/Shimmer";
import { authenticatedSupabaseFetch, getAccountProfile, type AccountProfile } from "../../../../lib/supabaseAuth";

import { BookOpen, Edit3, PlusCircle, ExternalLink, Archive, CheckCircle, Clock } from "lucide-react";

type Course = { id: string; title: string; description: string; status: "draft" | "published" | "archived"; cover_accent: string; created_at: string };
export default function HanbeeCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = profile?.role === "staff" || profile?.role === "manager";

  const load = useCallback(async () => {
    const account = await getAccountProfile();
    if (account.role !== "staff" && account.role !== "manager") throw new Error("Only approved Hanbee staff can manage the course catalog.");
    const rows = await authenticatedSupabaseFetch<Course[]>("/rest/v1/courses?select=id,title,description,status,cover_accent,created_at&order=created_at.desc");
    setProfile(account);
    setCourses(rows);
  }, []);
  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load courses."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/courses", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ title: title.trim(), description: description.trim(), owner_id: profile.id, status: "draft" }) });
      setTitle(""); setDescription(""); setMessage("Draft course created."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't create the course."); }
    finally { setSaving(false); }
  }

  async function changeStatus(course: Course) {
    const next = course.status === "draft" ? "published" : course.status === "published" ? "archived" : "draft";
    setSaving(true); setError(""); setMessage("");
    try {
      const query = new URLSearchParams({ id: `eq.${course.id}` });
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/courses?${query.toString()}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: next }) });
      setMessage(`${course.title} is now ${next}.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't update the course."); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Course Catalog Management</h1>
        <p className={styles.pageSubtitle}>Author, curate, and publish curriculum modules for registered students</p>
      </div>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status" style={{ color: "var(--color-success)", fontWeight: 600, marginBottom: 16 }}>{message}</p>}

      {canManage && (
        <form className={styles.sectionCard} onSubmit={createCourse} style={{ marginBottom: 24, border: "1px solid var(--border-elevated)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <PlusCircle size={20} color="var(--accent-subtle-text)" />
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Create New Course</h2>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="course-title-input" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>
                Course Title <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <Input 
                id="course-title-input"
                placeholder="e.g. Advanced RC Chassis Dynamics & Suspension Tuning"
                value={title} 
                onChange={(event) => setTitle(event.target.value)} 
                required 
                maxLength={200} 
              />
            </div>

            <div>
              <label htmlFor="course-desc-input" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>
                Course Description & Learning Outcomes
              </label>
              <Textarea 
                id="course-desc-input"
                placeholder="Provide a detailed overview of skills taught, required hardware, and learning objectives..."
                value={description} 
                onChange={(event) => setDescription(event.target.value)} 
                rows={3} 
                maxLength={5000} 
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button 
              type="submit" 
              disabled={saving || !title.trim()} 
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                cursor: saving || !title.trim() ? "not-allowed" : "pointer",
                opacity: saving || !title.trim() ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PlusCircle size={16} />
              {saving ? "Creating Course…" : "Create Draft Course"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Shimmer variant="cards" count={4} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {courses.map((course) => (
            <article key={course.id} className={styles.sectionCard} style={{ border: "1px solid var(--border-elevated)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 280, maxWidth: "750px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                    <h2 
                      className={styles.sectionTitle} 
                      style={{ 
                        margin: 0, 
                        overflow: "hidden", 
                        textOverflow: "ellipsis", 
                        whiteSpace: "nowrap", 
                        maxWidth: "520px" 
                      }}
                      title={course.title}
                    >
                      {course.title}
                    </h2>
                    <span style={{
                      fontSize: 12.5,
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      textTransform: "capitalize",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: course.status === "published" ? "rgba(16, 185, 129, 0.12)" : course.status === "draft" ? "rgba(245, 158, 11, 0.12)" : "rgba(100, 116, 139, 0.12)",
                      color: course.status === "published" ? "var(--color-success)" : course.status === "draft" ? "var(--color-warning)" : "var(--text-muted)",
                      border: `1px solid ${course.status === "published" ? "rgba(16, 185, 129, 0.35)" : course.status === "draft" ? "rgba(245, 158, 11, 0.35)" : "rgba(100, 116, 139, 0.35)"}`
                    }}>
                      {course.status}
                    </span>
                  </div>

                  <p 
                    style={{ 
                      color: "var(--text-muted)", 
                      fontSize: 14, 
                      lineHeight: 1.55, 
                      margin: "8px 0",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word"
                    }}
                  >
                    {course.description || "No course description provided."}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                    <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Streamlined Action Buttons */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {canManage && (
                    <Link 
                      href={`/dashboard/hanbee/courses/${encodeURIComponent(course.id)}/edit`} 
                      style={{
                        background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                        color: "#ffffff",
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)"
                      }}
                    >
                      <Edit3 size={14} /> Edit Content
                    </Link>
                  )}

                  <Link 
                    href={`/dashboard/courses/${encodeURIComponent(course.id)}`} 
                    className={styles.secondaryActionBtn}
                  >
                    <ExternalLink size={14} /> Open Course
                  </Link>

                  {canManage && (
                    <button 
                      type="button" 
                      className={styles.secondaryActionBtn} 
                      disabled={saving} 
                      onClick={() => void changeStatus(course)}
                    >
                      {course.status === "draft" ? "Publish" : course.status === "published" ? "Archive" : "Restore Draft"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {courses.length === 0 && (
            <div className={styles.sectionCard} style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              No courses have been created yet. Use the form above to add your first course module.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
