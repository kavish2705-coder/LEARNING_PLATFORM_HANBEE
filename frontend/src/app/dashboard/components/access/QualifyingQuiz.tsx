"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, Gauge } from "lucide-react";
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
      <div className={`${styles.card} ${styles.quizIntro}`}>
        <div className={styles.quizIcon}><Gauge size={25} /></div>
        <span className={styles.statusBadge}>First of two steps for course access</span>
        <h2 className={styles.title}>A quick check-in before we begin</h2>
        <p className={styles.body}>
          This one-time quiz helps our team understand where to start when we call you. Your score stays private;
          a Hanbee team member will speak with you and your parent about next steps.
        </p>
        <div className={styles.quizStats}>
          <div><span>{QUESTIONS.length}</span><small>questions</small></div>
          <div><span>{TIME_LIMIT_SECONDS / 60} min</span><small>time limit</small></div>
          <div><FileCheck2 size={17} /><small>one attempt</small></div>
        </div>
        <div className={styles.quizNotice}>
          <Clock3 size={16} />
          <span>Once started, answers can&apos;t be changed after submission. Make sure you have a few uninterrupted minutes.</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => setStarted(true)}>
            Begin the quiz <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`${styles.card} ${styles.submittedCard}`}>
        <div className={styles.submittedIcon}><CheckCircle2 size={28} /></div>
        <span className={styles.statusBadge}>Response received</span>
        <h2 className={styles.title}>Thanks -- you&apos;re done</h2>
        <p className={styles.body}>Your answers are with the Hanbee team. They&apos;ll call you and your parent to confirm the next step for course access.</p>
        <div className={styles.nextStep}>
          <span className={styles.nextStepNumber}>02</span>
          <div><strong>Look out for our call</strong><small>We&apos;ll be in touch shortly.</small></div>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const answeredCount = answers.filter((answer) => answer !== null).length;

  return (
    <div className={`${styles.card} ${styles.quizCard}`}>
      <header className={styles.quizHeader}>
        <div>
          <span className={styles.statusBadge}>Qualifying quiz</span>
          <p className={styles.quizProgressText}>{answeredCount} of {QUESTIONS.length} answered</p>
        </div>
        <span className={`${styles.timer} ${timeLeft < 60 ? styles.timerUrgent : ""}`} role="timer" aria-live="polite">
          <Clock3 size={15} />
          {minutes}:{seconds}
        </span>
      </header>
      <progress className={styles.quizProgress} max={QUESTIONS.length} value={answeredCount} aria-label={`${answeredCount} of ${QUESTIONS.length} questions answered`} />

      {QUESTIONS.map((item, i) => (
        <fieldset className={styles.question} key={i}>
          <legend className={styles.questionLegend}>
            <span className={styles.questionNumber}>{String(i + 1).padStart(2, "0")}</span>
            <span>{item.q}</span>
          </legend>
          <div className={styles.options}>
            {item.options.map((opt, oi) => (
              <label key={oi} className={`${styles.answerOption} ${answers[i] === oi ? styles.answerSelected : ""}`}>
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === oi}
                  onChange={() => setAnswers((a) => a.map((v, idx) => (idx === i ? oi : v)))}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.quizFooter}>
        <span>Your result is shared privately with the Hanbee team.</span>
        <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void handleSubmit()}>
          {busy ? "Submitting…" : "Submit quiz"}
        </button>
      </div>
    </div>
  );
}
