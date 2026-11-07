// Course / RC Tournament access gating (supabase/migrations/0123_access_requests.sql).
// Covers both upgrade directions through one shared pipeline: an
// independent student requesting the dashboard they didn't pick at
// signup, reviewed by Hanbee staff/manager via a shared queue.
import { authenticatedSupabaseFetch } from "./supabaseAuth";

export type AccessDirection = "add_course" | "add_tournament";
export type AccessRequestStatus = "requested" | "awaiting_payment" | "active";

export interface AccessRequest {
  id: string;
  student_id: string;
  direction: AccessDirection;
  status: AccessRequestStatus;
  quiz_score: number | null;
  quiz_total: number | null;
  parent_confirmed: boolean;
  student_confirmed: boolean;
  staff_set_amount: number | null;
  handled_by: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface AccessQueueRow {
  id: string;
  student_id: string;
  student_name: string;
  phone: string | null;
  direction: AccessDirection;
  quiz_score: number | null;
  quiz_total: number | null;
  parent_confirmed: boolean;
  student_confirmed: boolean;
  staff_set_amount: number | null;
  created_at: string;
}

async function rpc<T>(functionName: string, args: Record<string, unknown>): Promise<T> {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

// Student: clicking "Interested" on a blocker screen.
export function requestAccess(direction: AccessDirection) {
  return rpc<AccessRequest>("request_access", { p_direction: direction });
}

// my_access_request() is declared to return a single row (not setof), so
// with no match Postgres returns a row of all-NULL fields rather than "no
// row" -- PostgREST serializes that as a truthy {id: null, ...} object, not
// JSON null. Normalize here so every caller can rely on a real null.
export async function fetchMyAccessRequest(direction: AccessDirection): Promise<AccessRequest | null> {
  const row = await rpc<AccessRequest | null>("my_access_request", { p_direction: direction });
  return row && row.id != null ? row : null;
}

// Student: the one-shot qualifying quiz for add_course. Score is sent for
// staff to see later -- never read back here.
export function submitQuizAttempt(score: number, total: number) {
  return rpc<null>("submit_quiz_attempt", { p_score: score, p_total: total });
}

// Staff/manager
export function fetchAccessRequestsQueue() {
  return rpc<AccessQueueRow[]>("access_requests_queue", {});
}

export function approveTournamentAccess(requestId: string) {
  return rpc<null>("approve_tournament_access", { p_request: requestId });
}

export function setCourseAccessConfirmation(requestId: string, parentConfirmed: boolean, studentConfirmed: boolean) {
  return rpc<null>("set_course_access_confirmation", {
    p_request: requestId,
    p_parent_confirmed: parentConfirmed,
    p_student_confirmed: studentConfirmed,
  });
}

export function setCourseAccessAmount(requestId: string, amount: number) {
  return rpc<null>("set_course_access_amount", { p_request: requestId, p_amount: amount });
}
