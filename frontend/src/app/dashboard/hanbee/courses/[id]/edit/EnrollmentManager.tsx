"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../../../../dashboard.module.css";
import { useConfirm } from "../../../../../../components/ui/useConfirm";
import { authenticatedSupabaseFetch } from "../../../../../../lib/supabaseAuth";

type Section = { id: string; name: string; capacity: number };
type EnrollmentRow = {
  id: string;
  section_id: string;
  status: string;
  student: { id: string; full_name: string; email: string } | null;
};

// There was previously no way for any role to put a student into a course
// section at all -- enrollment rows could only be created with direct
// database access. This is the first real UI for it.
export default function EnrollmentManager({ courseId }: { courseId: string }) {
  const { ask, dialog } = useConfirm();
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, EnrollmentRow[]>>({});
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const rows = await authenticatedSupabaseFetch<Section[]>(
      `/rest/v1/sections?select=id,name,capacity&course_id=eq.${courseId}&order=start_date.asc`,
    );
    setSections(rows);
  }, [courseId]);

  useEffect(() => {
    void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Couldn't load sections."));
  }, [load]);

  const loadEnrollments = useCallback(async (sectionId: string) => {
    const rows = await authenticatedSupabaseFetch<Array<{ id: string; section_id: string; status: string; profiles: { id: string; full_name: string; email: string } | null }>>(
      `/rest/v1/enrollments?select=id,section_id,status,profiles!enrollments_student_id_fkey(id,full_name,email)&section_id=eq.${sectionId}&order=enrolled_date.desc`,
    );
    setEnrollments((current) => ({
      ...current,
      [sectionId]: rows.map((row) => ({ id: row.id, section_id: row.section_id, status: row.status, student: row.profiles })),
    }));
  }, []);

  function toggleSection(sectionId: string) {
    const next = openSectionId === sectionId ? null : sectionId;
    setOpenSectionId(next);
    if (next && !enrollments[next]) {
      void loadEnrollments(next).catch((reason) => setError(reason instanceof Error ? reason.message : "Couldn't load students."));
    }
  }

  async function enroll(event: FormEvent<HTMLFormElement>, sectionId: string) {
    event.preventDefault();
    const email = (emailDraft[sectionId] ?? "").trim().toLowerCase();
    if (!email) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const students = await authenticatedSupabaseFetch<Array<{ id: string; full_name: string }>>(
        `/rest/v1/profiles?select=id,full_name&email=eq.${encodeURIComponent(email)}&role=eq.student`,
      );
      const student = students[0];
      if (!student) throw new Error(`No student account found for ${email}.`);
      await authenticatedSupabaseFetch<unknown>("/rest/v1/enrollments", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ section_id: sectionId, student_id: student.id, status: "active" }),
      });
      setEmailDraft((current) => ({ ...current, [sectionId]: "" }));
      setNotice(`Enrolled ${student.full_name}.`);
      await loadEnrollments(sectionId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't enroll that student.");
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(row: EnrollmentRow) {
    if (!(await ask({ title: "Remove from section?", message: `Remove ${row.student?.full_name ?? "this student"} from this section?` }))) return;
    setBusy(true);
    setError("");
    try {
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/enrollments?id=eq.${row.id}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      await loadEnrollments(row.section_id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't remove that student.");
    } finally {
      setBusy(false);
    }
  }

  if (sections.length === 0) {
    return (
      <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: 6 }}>Students</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>
          This course has no sections yet, so no student can be enrolled. Create a section for it first.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
      {dialog}
      <h2 className={styles.sectionTitle} style={{ marginBottom: 6 }}>Students</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13.5, marginBottom: 16 }}>
        Enroll a registered student by email. They'll see this course under "My Courses" immediately.
      </p>
      {error && <p role="alert" style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#10b981", fontSize: 13, marginBottom: 10 }}>{notice}</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {sections.map((section) => {
          const open = openSectionId === section.id;
          const rows = enrollments[section.id] ?? [];
          return (
            <div key={section.id} style={{ border: "1px solid var(--border-elevated)", borderRadius: 10, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--bg-surface-elevated)",
                  color: "var(--text-main)",
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                <span>{section.name}</span>
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  {open ? "Hide" : "Manage"} · {rows.length ? `${rows.length} enrolled` : "capacity " + section.capacity}
                </span>
              </button>

              {open && (
                <div style={{ padding: 16, display: "grid", gap: 12 }}>
                  <form onSubmit={(event) => void enroll(event, section.id)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={emailDraft[section.id] ?? ""}
                      onChange={(event) => setEmailDraft((current) => ({ ...current, [section.id]: event.target.value }))}
                      disabled={busy}
                      style={{
                        flex: "1 1 220px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-elevated)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        color: "var(--text-main)",
                        fontSize: 13.5,
                      }}
                    />
                    <button type="submit" className={styles.primaryBtn} disabled={busy}>Enroll</button>
                  </form>

                  {rows.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No students enrolled in this section yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {rows.map((row) => (
                        <div key={row.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "8px 10px", background: "var(--bg-card)", borderRadius: 8 }}>
                          <span>
                            {row.student?.full_name ?? "Unknown student"}{" "}
                            <span style={{ color: "var(--text-muted)" }}>· {row.student?.email ?? "—"} · {row.status}</span>
                          </span>
                          <button type="button" className={styles.secondaryActionBtn} disabled={busy} onClick={() => void unenroll(row)}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
