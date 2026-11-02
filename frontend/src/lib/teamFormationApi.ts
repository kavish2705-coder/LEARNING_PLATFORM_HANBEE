import { authenticatedSupabaseFetch, readStoredSession } from "./supabaseAuth";

export type TeamStatus = "draft" | "proposed" | "applied" | "payment_declared" | "verified" | "rejected" | "withdrawn";

export interface TeamFormationMember {
  student_id: string;
  name: string;
  is_captain: boolean;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  team_name: string;
  invited_by: string | null;
  members: number;
}

export interface MyTeamFormation {
  school_id: string | null;
  slots: { max_teams: number | null; used: number; remaining: number | null; team_size: number | null } | null;
  my_team: null | {
    id: string;
    name: string;
    status: TeamStatus;
    is_captain: boolean;
    staff_note: string;
    chat_id: string | null;
    members: TeamFormationMember[];
    pending_invites: Array<{ id: string; student_id: string; name: string }>;
  };
  invitations: TeamInvitation[];
  eligible_classmates: Array<{ student_id: string; name: string }>;
}

export interface SchoolTeamOverview {
  team_id: string;
  name: string;
  status: TeamStatus;
  captain_name: string | null;
  member_count: number;
  team_size: number;
  pending_invites: number;
  submitted_at: string | null;
  staff_note: string;
  chat_id: string | null;
}

export interface TeamStatistics {
  team: { id: string; name: string; status: TeamStatus; team_size: number; members_count: number };
  tournament: { id: string; title: string; starts_at: string; venue: string; status: string };
  result: null | { rank: number; points: number; notes: string };
  members: Array<TeamFormationMember & {
    lessons_completed: number;
    lessons_total: number;
    completion_pct: number;
    sessions: number;
    attendance_pct: number | null;
  }>;
}

export interface UpcomingTournament {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  team_size: number;
}

export interface TeamSlotStatus {
  max_teams: number | null;
  used: number;
  remaining: number | null;
  team_size: number | null;
}

export interface TournamentApplication {
  team_id: string;
  tournament_id: string;
  tournament_title: string;
  team_name: string;
  org_id: string | null;
  school_name: string | null;
  captain_name: string | null;
  member_count: number;
  status: string;
  payment_declared: boolean;
  payment_reference: string | null;
  submitted_at: string | null;
}

export interface TeamRosterMember {
  student_id: string;
  full_name: string | null;
  org_id_at_join: string | null;
  joined_at: string;
}

async function rpc<T>(functionName: string, args: Record<string, unknown>): Promise<T> {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function fetchUpcomingTournament(): Promise<UpcomingTournament | null> {
  const rows = await fetchUpcomingTournaments();
  return rows[0] ?? null;
}

// Every tournament-entry RPC (create_solo_team, start_pool_team,
// student_start_team, apply_team, ...) is already scoped by p_tournament,
// so a student being on a team for one tournament never blocks them from
// entering a different one -- the old single-tournament limit() here was
// purely a frontend assumption, not a backend one. Used by the My Team
// page's tournament picker; every other caller of fetchUpcomingTournament
// only ever needed "the next one" and is unaffected by this addition.
export async function fetchUpcomingTournaments(): Promise<UpcomingTournament[]> {
  const params = new URLSearchParams({
    select: "id,title,starts_at,venue,team_size",
    status: "eq.upcoming",
    starts_at: `gte.${new Date().toISOString()}`,
    order: "starts_at.asc",
  });
  return authenticatedSupabaseFetch<UpcomingTournament[]>(`/rest/v1/tournaments?${params}`);
}

export async function fetchMyOrganizationId(): Promise<string | null> {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const params = new URLSearchParams({
    select: "org_id",
    user_id: `eq.${session.user.id}`,
    status: "eq.active",
    limit: "1",
  });
  const rows = await authenticatedSupabaseFetch<Array<{ org_id: string }>>(
    `/rest/v1/organization_members?${params}`,
  );
  return rows[0]?.org_id ?? null;
}

export function joinSchool(joinToken: string) {
  return rpc<{ result: string; school: string }>("join_school", { p_join_token: joinToken.trim() });
}

export async function fetchMySoloStatus() {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  const rows = await authenticatedSupabaseFetch<Array<{ is_solo: boolean }>>(
    `/rest/v1/profiles?select=is_solo&id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
  );
  return rows[0]?.is_solo ?? false;
}

export function createSoloTournamentEntry(tournamentId: string) {
  return rpc<string>("create_solo_team", { p_tournament: tournamentId });
}

export function applyStudentTeam(teamId: string, paymentDeclared: boolean, paymentReference?: string) {
  return rpc<null>("apply_team", { p_team: teamId, p_payment_declared: paymentDeclared, p_payment_reference: paymentReference?.trim() || null });
}

// Staff-only escape hatch: some entries (pool teams, older entries) never
// go through the self-service QR+reference flow at all, so staff need a
// way to record payment themselves before they can verify. Only valid
// while the entry is still 'applied' (not yet declared) -- see
// 0113_staff_mark_payment_received.sql.
export function markPaymentReceived(teamId: string, reference?: string) {
  return rpc<null>("staff_mark_payment_received", { p_team: teamId, p_reference: reference?.trim() || null });
}

export interface PaymentSettings {
  qr_image_url: string;
  upi_id: string;
  instructions: string;
}

// payment_settings is a public-to-authenticated singleton row (see
// 0110_payment_qr_and_reference.sql) -- not an RPC, same precedent as
// other simple staff-editable config reads in this codebase.
export function fetchPaymentSettings(): Promise<PaymentSettings> {
  return authenticatedSupabaseFetch<PaymentSettings[]>(
    "/rest/v1/payment_settings?select=qr_image_url,upi_id,instructions&limit=1",
  ).then((rows) => rows[0] ?? { qr_image_url: "", upi_id: "", instructions: "" });
}

// Staff/manager only (payment_settings' own RLS enforces this server-side
// regardless). qr_image_url is a plain public URL since the bucket is
// public -- unlike lesson-attachments, there's nothing sensitive in a QR
// code image, so no signed-URL step is needed.
export async function updatePaymentSettings(fields: Partial<PaymentSettings>): Promise<void> {
  await authenticatedSupabaseFetch<unknown>("/rest/v1/payment_settings?id=eq.true", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(fields),
  });
}

export async function uploadPaymentQr(file: File): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) throw new Error("Supabase URL is not configured.");
  const storagePath = `qr-${Date.now()}-${file.name}`;
  await authenticatedSupabaseFetch<unknown>(`/storage/v1/object/payment-assets/${storagePath}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  return `${supabaseUrl}/storage/v1/object/public/payment-assets/${storagePath}`;
}

export function fetchTournamentApplicationQueue() {
  return rpc<TournamentApplication[]>("tournament_application_queue", {});
}

export function decideTournamentApplication(teamId: string, decision: "verified" | "rejected", note?: string) {
  return rpc<null>("decide_team", { p_team: teamId, p_decision: decision, p_note: note?.trim() || null });
}

export function getTeamRoster(teamId: string) {
  return rpc<TeamRosterMember[]>("get_team_roster", { p_team: teamId });
}

export type ScrutineeringStatus = "pending" | "passed" | "failed";
export type ScrutineeringItemResult = "pass" | "fail" | "not_checked";

export interface ScrutineeringQueueRow {
  team_id: string;
  team_name: string;
  school_name: string | null;
  captain_name: string | null;
  payment_status: TeamStatus;
  scrutineering_status: ScrutineeringStatus;
  eligible: boolean;
  checked_by_name: string | null;
  checked_at: string | null;
  notes: string | null;
}

export interface ScrutineeringChecklistItem {
  key: string;
  label?: string;
  result: ScrutineeringItemResult;
  note?: string | null;
}

export interface ScrutineeringInspection {
  status: ScrutineeringStatus;
  items: ScrutineeringChecklistItem[];
  notes: string | null;
  checked_at?: string | null;
  updated_at: string | null;
}

export interface ScrutineeringHistoryEntry {
  status: ScrutineeringStatus;
  notes: string | null;
  items: ScrutineeringChecklistItem[];
  checked_by_name: string | null;
  checked_at: string;
}

export interface TeamEligibility {
  payment_verified: boolean;
  scrutineering_status: ScrutineeringStatus;
  eligible: boolean;
}

export interface StudentRegistrationChecklistItem {
  key: string;
  result: ScrutineeringItemResult;
  note: string | null;
}

export interface StudentRegistrationHistoryEntry {
  status: ScrutineeringStatus;
  notes: string | null;
  items: StudentRegistrationChecklistItem[];
  checked_at: string;
}

export interface StudentRaceResult {
  race_name: string;
  finished: boolean;
  finish_time_ms: number | null;
  lap_count: number;
  average_lap_time_ms: number | null;
}

export type StudentTeamRegistrationStatus = {
  tournament: { id: string; title: string; status: string };
  team: {
    id: string;
    name: string;
    status: TeamStatus;
    payment_verified: boolean;
    review_note: string | null;
    decided_at: string | null;
  };
  scrutineering: {
    status: ScrutineeringStatus;
    notes: string | null;
    checked_at: string | null;
    items: StudentRegistrationChecklistItem[];
    history: StudentRegistrationHistoryEntry[];
  };
  eligible: boolean;
  result: null | { rank: number; points: number; notes: string };
  race_results: StudentRaceResult[];
} | {
  tournament: { id: string; title: string; status: string };
  team: null;
  scrutineering: null;
  eligible: false;
  result: null;
  race_results: StudentRaceResult[];
};

export function fetchScrutineeringQueue(tournamentId: string) {
  return rpc<ScrutineeringQueueRow[]>("list_scrutineering_queue", { p_tournament: tournamentId });
}

export function getScrutineeringInspection(teamId: string) {
  return rpc<ScrutineeringInspection>("get_scrutineering_inspection", { p_team: teamId });
}

export function fetchScrutineeringHistory(teamId: string) {
  return rpc<ScrutineeringHistoryEntry[]>("get_scrutineering_history", { p_team: teamId });
}

export function submitScrutineeringInspection(
  teamId: string,
  status: ScrutineeringStatus,
  items: ScrutineeringChecklistItem[],
  notes: string | null,
  expectedUpdatedAt: string | null,
) {
  return rpc<TeamEligibility>("submit_scrutineering_inspection", {
    p_team: teamId,
    p_status: status,
    p_items: items.map((item) => ({ key: item.key, result: item.result, note: item.note ?? null })),
    p_notes: notes,
    p_expected_updated_at: expectedUpdatedAt,
  });
}

export function fetchTeamEligibility(teamId: string) {
  return rpc<TeamEligibility>("team_eligibility", { p_team: teamId });
}

export function fetchMyTeamRegistrationStatus(tournamentId: string) {
  return rpc<StudentTeamRegistrationStatus>("get_my_team_registration_status", { p_tournament: tournamentId });
}

export function fetchMyTeamFormation(tournamentId: string) {
  return rpc<MyTeamFormation>("my_team_formation", { p_tournament: tournamentId });
}

export function fetchSchoolTeamOverview(tournamentId: string, organizationId: string) {
  return rpc<SchoolTeamOverview[]>("team_formation_overview", {
    p_tournament: tournamentId,
    p_org: organizationId,
  });
}

export function fetchTeamSlotStatus(tournamentId: string, organizationId?: string) {
  return rpc<TeamSlotStatus>("team_slot_status", {
    p_tournament: tournamentId,
    p_org: organizationId ?? null,
  });
}

export function fetchTeamStatistics(teamId: string) {
  return rpc<TeamStatistics>("team_statistics", { p_team: teamId });
}

export function startStudentTeam(tournamentId: string, name: string, division: string) {
  return rpc<string>("student_start_team", { p_tournament: tournamentId, p_name: name, p_division: division });
}

export function inviteStudentToTeam(teamId: string, studentId: string) {
  return rpc<string>("invite_to_team", { p_team: teamId, p_student: studentId });
}

export function answerTeamInvitation(invitationId: string, accept: boolean) {
  return rpc<null>("respond_team_invitation", { p_invitation: invitationId, p_accept: accept });
}

export function cancelTeamInvitation(invitationId: string) {
  return rpc<null>("cancel_team_invitation", { p_invitation: invitationId });
}

export function leaveStudentTeam(teamId: string) {
  return rpc<null>("leave_team", { p_team: teamId });
}

export function submitStudentTeam(teamId: string) {
  return rpc<null>("submit_team", { p_team: teamId });
}

export function returnTeamForChanges(teamId: string, note: string) {
  return rpc<null>("return_team", { p_team: teamId, p_note: note });
}

export function approveTeamApplication(teamId: string, paymentDeclared: boolean) {
  return rpc<null>("apply_team", { p_team: teamId, p_payment_declared: paymentDeclared });
}

export function setSchoolTeamSlots(tournamentId: string, organizationId: string, maxTeams: number) {
  return rpc<null>("set_team_slots", {
    p_tournament: tournamentId,
    p_org: organizationId,
    p_max: maxTeams,
  });
}

export interface MySchoolInfo {
  org_id: string;
  name: string;
  status: string;
  member_role: string;
  member_status: string;
}

// my_school() never throws for "no school" -- it's a plain select with no
// role check, so a student with no organization_members row just gets an
// empty result set. A previous version of this function swallowed every
// error (network, auth, 500) into the same null as "no school," which made
// a real failure indistinguishable from a legitimate empty state. Letting
// a genuine error propagate lets callers surface it instead of silently
// showing "no school" for a reason that has nothing to do with schools.
export async function fetchMySchool(): Promise<MySchoolInfo | null> {
  const rows = await authenticatedSupabaseFetch<MySchoolInfo[]>("/rest/v1/rpc/my_school");
  return rows[0] ?? null;
}
