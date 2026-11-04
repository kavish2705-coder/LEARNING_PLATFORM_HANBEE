"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./accessBlocker.module.css";
import { submitQuizAttempt } from "../../../../lib/accessApi";

// One-shot qualifying quiz for the add_course access-request direction.
// Score is sent to submitQuizAttempt and never displayed back to the
// student -- it's input for Hanbee staff's pricing call, not a result
// screen. Question bank is business-analytics/development scoped per the
// client's course track; content, not something derived from the codebase.
const QUESTIONS: { q: string; options: string[]; correct: number }[] = [
  { q: "A company's revenue grew 20% but profit fell. Which metric should you check first?", options: ["Customer satisfaction score", "Operating costs / margins", "Website traffic", "Employee headcount"], correct: 1 },
  { q: "In a funnel of Visit → Signup → Purchase, which stage has the biggest drop usually matters most to fix first?", options: ["The one with the lowest absolute numbers", "The one with the highest percentage drop-off", "The first stage, always", "The last stage, always"], correct: 1 },
  { q: "What does \"version control\" let a team of developers do?", options: ["Deploy apps to app stores", "Track and merge changes to code over time", "Design user interfaces", "Send automated emails"], correct: 1 },
  { q: "A dataset shows average order value went up, but total revenue went down. What's the most likely cause?", options: ["Prices increased", "Number of orders decreased", "Marketing spend increased", "Customer support improved"], correct: 1 },
  { q: "In software development, what is a \"bug\"?", options: ["A new feature request", "An unexpected flaw causing incorrect behavior", "A type of database", "A marketing term"], correct: 1 },
  { q: "Which is a leading indicator rather than a lagging one?", options: ["Last quarter's total sales", "Number of sales calls booked this week", "Annual profit report", "Year-end customer churn"], correct: 1 },
  { q: "What is the main purpose of an API?", options: ["Store files permanently", "Let two different programs communicate with each other", "Design logos", "Encrypt passwords only"], correct: 1 },
  { q: "If a business's costs are fixed but sales drop 10%, what happens to profit margin?", options: ["It stays exactly the same", "It worsens by more than 10%", "It always improves", "It becomes impossible to measure"], correct: 1 },
];

const TIME_LIMIT_SECONDS = 10 * 60;

export default function QualifyingQuiz({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!started || submitted) return;
    const t = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [started, submitted]);

  useEffect(() => {
    if (started && timeLeft === 0 && !submitted) void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, started, submitted]);

  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const score = answers.reduce<number>((n, a, i) => n + (a === QUESTIONS[i].correct ? 1 : 0), 0);
      await submitQuizAttempt(score, QUESTIONS.length);
      setSubmitted(true);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't submit your quiz.");
      submittingRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  if (!started) {
    return (
      <div className={styles.card}>
        <span className={styles.statusBadge}>Qualifying Quiz</span>
        <h2 className={styles.title}>One attempt only</h2>
        <p className={styles.body}>
          {QUESTIONS.length} questions, {TIME_LIMIT_SECONDS / 60} minutes. You can only take this once --
          your answers can&apos;t be changed or retaken after you submit, so make sure you&apos;re ready
          before starting. Your result isn&apos;t shown to you here; the Hanbee team will call you about next steps.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => setStarted(true)}>
            Start the quiz
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.card}>
        <span className={styles.statusBadge}>Submitted</span>
        <h2 className={styles.title}>Thanks -- you&apos;re done</h2>
        <p className={styles.body}>The Hanbee team will call you and your parent shortly to confirm next steps.</p>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className={styles.card} style={{ maxWidth: 640, textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span className={styles.statusBadge} style={{ marginBottom: 0 }}>Qualifying Quiz</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: timeLeft < 60 ? "var(--color-danger, #e5484d)" : "var(--text-muted)" }}>
          {minutes}:{seconds}
        </span>
      </div>

      {QUESTIONS.map((item, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{i + 1}. {item.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {item.options.map((opt, oi) => (
              <label key={oi} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === oi}
                  onChange={() => setAnswers((a) => a.map((v, idx) => (idx === i ? oi : v)))}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions} style={{ justifyContent: "flex-end" }}>
        <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void handleSubmit()}>
          {busy ? "Submitting…" : "Submit quiz"}
        </button>
      </div>
    </div>
  );
}
