"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock, Trophy, BookOpen } from "lucide-react";
import styles from "./accessBlocker.module.css";
import Shimmer from "../ui/Shimmer";
import QualifyingQuiz from "./QualifyingQuiz";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";
import {
  requestAccess, fetchMyAccessRequest, type AccessDirection, type AccessRequest,
} from "../../../../lib/accessApi";
import RazorpayCheckout from "../payments/RazorpayCheckout";

const COPY: Record<AccessDirection, { icon: ReactNode; title: string; body: string }> = {
  add_course: {
    icon: <BookOpen size={24} />,
    title: "Want the Course bundle too?",
    body: "This unlocks the full Course dashboard alongside your RC Tournament access. There's a short qualifying quiz, then our team will call you and your parent to confirm before any price is set.",
  },
  add_tournament: {
    icon: <Trophy size={24} />,
    title: "Want RC Tournament access too?",
    body: "This unlocks the RC Tournament dashboard -- team formation, Driver License, entries -- alongside your Course access. Our team will call to confirm before you're approved.",
  },
};

// Wraps a page/section that's locked behind the course/RC-tournament
// access-request pipeline (supabase/migrations/0123_access_requests.sql).
// Renders children once the relevant access flag is 'active'; otherwise
// shows the blocker screen matching whatever stage the request is at.
export default function AccessBlocker({ direction, children }: { direction: AccessDirection; children: ReactNode }) {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useSessionProfile();
  const [request, setRequest] = useState<AccessRequest | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const flag = direction === "add_course" ? profile?.course_access : profile?.tournament_access;
  const isIndependentStudent = profile?.role === "student" && !!profile?.is_solo;

  useEffect(() => {
    if (!isIndependentStudent || flag === "active") return;
    fetchMyAccessRequest(direction).then(setRequest).catch(() => setRequest(null));
  }, [isIndependentStudent, flag, direction]);

  if (profileLoading || (isIndependentStudent && flag !== "active" && request === undefined)) {
    return <div className={styles.wrap}><Shimmer rows={4} /></div>;
  }

  const isOrgStudent = profile?.role === "student" && !profile?.is_solo;

  // Staff/manager/school_staff, or anyone who already has this access --
  // never blocked. Org-linked students always have RC Tournament access by
  // default, so they pass that direction too -- but Course is an
  // independent-student-only offering (org students join a school for RC
  // Tournament specifically), so they get a plain notice instead of ever
  // reaching real course content, even if they hit this URL directly.
  if (flag === "active" || (isOrgStudent && direction === "add_tournament") || (profile && profile.role !== "student")) {
    return <>{children}</>;
  }

  if (isOrgStudent && direction === "add_course") {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h2 className={styles.title}>Not available for school students</h2>
          <p className={styles.body}>Courses are offered to independent students directly, not through a school. Talk to your school staff if you have questions.</p>
        </div>
      </div>
    );
  }

  async function handleInterested() {
    setBusy(true);
    setError("");
    try {
      setRequest(await requestAccess(direction));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That didn't go through -- try again.");
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[direction];

  // Undecided: the two-button choice. "Not Interested" writes nothing --
  // the flag stays 'none' and this same screen shows again next visit.
  if (!request) {
    return (
      <div className={styles.wrap}>
        <div className={`${styles.card} ${styles.choiceCard}`}>
          <span className={styles.eyebrow}>Choose your learning track</span>
          <div className={styles.icon}>{copy.icon}</div>
          <h2 className={styles.title}>{copy.title}</h2>
          <p className={styles.body}>{copy.body}</p>
          <div className={styles.steps} aria-label="What happens next">
            <div className={styles.step}><span>01</span><strong>Tell us you&apos;re interested</strong></div>
            <div className={styles.step}><span>02</span><strong>We confirm the right fit</strong></div>
            <div className={styles.step}><span>03</span><strong>Unlock your dashboard</strong></div>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => router.push("/dashboard")}>
              Not Interested
            </button>
            <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void handleInterested()}>
              {busy ? "Sending request…" : "Interested"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // add_course, requested, quiz not yet taken.
  if (direction === "add_course" && request.status === "requested" && request.quiz_score == null) {
    return (
      <div className={styles.wrap}>
        <QualifyingQuiz onDone={() => fetchMyAccessRequest(direction).then(setRequest)} />
      </div>
    );
  }

  // Requested (quiz done for add_course, or straight in for add_tournament)
  // -- waiting on the staff phone call.
  if (request.status === "requested") {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <span className={styles.statusBadge}>Awaiting confirmation</span>
          <div className={styles.icon}><Lock size={24} /></div>
          <h2 className={styles.title}>Our team will call you</h2>
          <p className={styles.body}>
            {direction === "add_course"
              ? "Thanks -- we've got your quiz. Hanbee staff will call you and your parent to confirm before setting a price."
              : "Hanbee staff will reach out to confirm your details before approving RC Tournament access."}
          </p>
        </div>
      </div>
    );
  }

  // Awaiting payment -- only reachable for add_course; add_tournament goes
  // straight from 'requested' to 'active' via staff approval, no payment.
  if (request.status === "awaiting_payment") {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <span className={styles.statusBadge}>Course access confirmed</span>
          <h2 className={styles.title}>Unlock your Course dashboard</h2>
          <p className={styles.body}>Hanbee staff confirmed your request and price. Complete this one-time Razorpay payment to unlock your learning dashboard.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div>
            <RazorpayCheckout
              purpose="course_access"
              description="Hanbee course access"
              onPaymentComplete={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
