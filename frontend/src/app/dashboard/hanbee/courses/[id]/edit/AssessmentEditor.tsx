"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../../../../dashboard.module.css";
import { Input } from "../../../../components/ui/FormField";
import { useConfirm } from "../../../../../../components/ui/useConfirm";
import { authenticatedSupabaseFetch } from "../../../../../../lib/supabaseAuth";

type Assessment = { id: string; title: string };
type Question = { id: string; assessment_id: string; prompt: string; sort_order: number };
type Option = { id: string; question_id: string; label: string; is_correct: boolean; sort_order: number };

export default function AssessmentEditor({ lessonId, createdBy }: { lessonId: string; createdBy: string }) {
  const { ask, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const rows = await authenticatedSupabaseFetch<Assessment[]>(`/rest/v1/assessments?select=id,title&lesson_id=eq.${lessonId}`);
    const current = rows[0] ?? null;
    setAssessment(current);
    if (!current) { setQuestions([]); setOptions([]); return; }
    const q = await authenticatedSupabaseFetch<Question[]>(`/rest/v1/assessment_questions?select=id,assessment_id,prompt,sort_order&assessment_id=eq.${current.id}&order=sort_order.asc`);
    setQuestions(q);
    const o = q.length
      ? await authenticatedSupabaseFetch<Option[]>(`/rest/v1/assessment_options?select=id,question_id,label,is_correct,sort_order&question_id=in.(${q.map((x) => x.id).join(",")})&order=sort_order.asc`)
      : [];
    setOptions(o);
  }, [lessonId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError("");
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "We couldn't load this quiz.")).finally(() => setLoading(false));
  }, [open, load]);

  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "That didn't work."); }
    finally { setBusy(false); }
  }

  async function addQuiz() {
    await act(() => authenticatedSupabaseFetch("/rest/v1/assessments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ lesson_id: lessonId, title: "Lesson check", created_by: createdBy }),
    }));
  }

  async function deleteQuiz() {
    if (!assessment) return;
    if (!(await ask({ title: "Delete this quiz?", message: "All its questions and options will be removed.", confirmLabel: "Delete quiz", tone: "danger" }))) return;
    await act(() => authenticatedSupabaseFetch(`/rest/v1/assessments?id=eq.${assessment.id}`, { method: "DELETE" }));
  }

  async function addQuestion(event: FormEvent) {
    event.preventDefault();
    if (!assessment || !newPrompt.trim()) return;
    const nextOrder = questions.length ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 0;
    await act(() => authenticatedSupabaseFetch("/rest/v1/assessment_questions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ assessment_id: assessment.id, prompt: newPrompt.trim(), sort_order: nextOrder }),
    }));
    setNewPrompt("");
  }

  async function deleteQuestion(q: Question) {
    if (!(await ask({ title: "Delete this question?", message: "Its options will be removed too.", confirmLabel: "Delete question", tone: "danger" }))) return;
    await act(() => authenticatedSupabaseFetch(`/rest/v1/assessment_questions?id=eq.${q.id}`, { method: "DELETE" }));
  }

  async function addOption(q: Question, event: FormEvent) {
    event.preventDefault();
    const label = (newOptionLabel[q.id] ?? "").trim();
    if (!label) return;
    const existing = options.filter((o) => o.question_id === q.id);
    const nextOrder = existing.length ? Math.max(...existing.map((o) => o.sort_order)) + 1 : 0;
    await act(() => authenticatedSupabaseFetch("/rest/v1/assessment_options", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      // First option on a question defaults to correct so a question is
      // never left with zero correct answers; staff picks the real one next.
      body: JSON.stringify({ question_id: q.id, label, is_correct: existing.length === 0, sort_order: nextOrder }),
    }));
    setNewOptionLabel((prev) => ({ ...prev, [q.id]: "" }));
  }

  async function deleteOption(opt: Option) {
    await act(() => authenticatedSupabaseFetch(`/rest/v1/assessment_options?id=eq.${opt.id}`, { method: "DELETE" }));
  }

  async function markCorrect(q: Question, opt: Option) {
    // Single-correct-answer model: unmark every other option on this
    // question, then mark the chosen one. submit_assessment() grades by
    // matching the student's answer id to exactly one is_correct option.
    await act(async () => {
      const siblings = options.filter((o) => o.question_id === q.id && o.id !== opt.id && o.is_correct);
      await Promise.all(siblings.map((o) =>
        authenticatedSupabaseFetch(`/rest/v1/assessment_options?id=eq.${o.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_correct: false }) }),
      ));
      await authenticatedSupabaseFetch(`/rest/v1/assessment_options?id=eq.${opt.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_correct: true }) });
    });
  }

  return (
    <div style={{ marginTop: 10 }}>
      {dialog}
      <button type="button" className={styles.actionBtn} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide quiz" : "Quiz"}
      </button>

      {open && (
        <div style={{ marginTop: 10, padding: 14, background: "var(--bg-input)", borderRadius: 10 }}>
          {loading && <p style={{ color: "var(--text-muted)" }}>Loading…</p>}
          {error && <p role="alert">{error}</p>}

          {!loading && !assessment && (
            <>
              <p style={{ color: "var(--text-muted)", marginBottom: 10 }}>No quiz on this lesson yet.</p>
              <button type="button" className={styles.actionBtn} disabled={busy || !createdBy} onClick={() => void addQuiz()}>Add quiz</button>
            </>
          )}

          {!loading && assessment && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <strong>{assessment.title}</strong>
                <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void deleteQuiz()}>Delete quiz</button>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>{i + 1}. {q.prompt}</strong>
                      <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void deleteQuestion(q)}>Delete</button>
                    </div>
                    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                      {options.filter((o) => o.question_id === q.id).map((opt) => (
                        <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="radio" name={`correct-${q.id}`} checked={opt.is_correct} disabled={busy} onChange={() => void markCorrect(q, opt)} />
                          <span style={{ flex: 1 }}>{opt.label}</span>
                          <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void deleteOption(opt)} style={{ padding: "4px 10px", fontSize: 12 }}>Remove</button>
                        </label>
                      ))}
                    </div>
                    <form onSubmit={(e) => void addOption(q, e)} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <Input
                        value={newOptionLabel[q.id] ?? ""}
                        onChange={(e) => setNewOptionLabel((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Add an answer option"
                        maxLength={300}
                      />
                      <button type="submit" className={styles.actionBtn} disabled={busy}>Add option</button>
                    </form>
                    {options.filter((o) => o.question_id === q.id).length > 0 && !options.some((o) => o.question_id === q.id && o.is_correct) && (
                      <p role="alert" style={{ fontSize: 13, marginTop: 6 }}>Pick which option is correct - students can't be graded without one.</p>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={addQuestion} style={{ display: "flex", gap: 8, marginTop: 16, borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
                <Input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} placeholder="New question" maxLength={500} />
                <button type="submit" className={styles.actionBtn} disabled={busy || !newPrompt.trim()}>Add question</button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
