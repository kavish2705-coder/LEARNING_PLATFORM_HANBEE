import { authenticatedSupabaseFetch } from "./supabaseAuth";

async function rpc<T>(functionName: string, args: Record<string, unknown>): Promise<T> {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export interface IndependentInvite {
  id: string;
  token: string;
  full_name: string;
  email: string;
  expires_at: string;
}

export interface IndependentInviteRow {
  invitation_id: string;
  full_name: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  accepted: boolean;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  student_id: string | null;
}

export interface PoolableStudent { student_id: string; full_name: string; }
export interface OpenPoolTeam { team_id: string; team_name: string; captain_name: string | null; member_count: number; team_size: number; }
export interface PoolJoinRequest { request_id: string; team_id: string; team_name: string; student_id: string; student_name: string; created_at: string; }

export function createIndependentInvite(fullName: string, email: string): Promise<IndependentInvite> {
  return rpc<IndependentInvite>("staff_create_independent_invite", {
    p_full_name: fullName.trim(),
    p_email: email.trim(),
  });
}

export interface IndependentStudentLead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  track: string;
  message: string;
  status: "pending" | "converted" | "dismissed";
  created_at: string;
}

// independent_student_leads' RLS already permits staff/manager to select
// directly (0108_independent_student_leads.sql), so this reads straight
// from PostgREST rather than going through an RPC -- only the write side
// (dismiss/convert) needs a SECURITY DEFINER function, since it's a
// role-checked state transition, not a plain read.
export function fetchIndependentStudentLeads(): Promise<IndependentStudentLead[]> {
  return authenticatedSupabaseFetch<IndependentStudentLead[]>(
    "/rest/v1/independent_student_leads?select=id,full_name,email,phone,location,track,message,status,created_at&status=eq.pending&order=created_at.desc",
  );
}

export function dismissIndependentStudentLead(leadId: string): Promise<null> {
  return rpc<null>("dismiss_independent_student_lead", { p_lead: leadId });
}

export function markIndependentStudentLeadConverted(leadId: string): Promise<null> {
  return rpc<null>("mark_independent_student_lead_converted", { p_lead: leadId });
}

export function listIndependentStudentInvites() {
  return rpc<IndependentInviteRow[]>("list_independent_student_invites", {});
}

export function revokeIndependentInvite(invitationId: string) {
  return rpc<boolean>("revoke_invitation", { p_invitation: invitationId });
}

export function startPoolTeam(tournamentId: string, name: string) {
  return rpc<string>("start_pool_team", { p_tournament: tournamentId, p_name: name.trim() });
}

export function listPoolableStudents(tournamentId: string) {
  return rpc<PoolableStudent[]>("list_poolable_students", { p_tournament: tournamentId });
}

export function listOpenPoolTeams(tournamentId: string) {
  return rpc<OpenPoolTeam[]>("list_open_pool_teams", { p_tournament: tournamentId });
}

export function listPoolJoinRequests(tournamentId: string) {
  return rpc<PoolJoinRequest[]>("list_pool_join_requests", { p_tournament: tournamentId });
}

export function requestJoinPoolTeam(teamId: string) {
  return rpc<string>("request_join_team", { p_team: teamId });
}

export function respondToPoolJoinRequest(requestId: string, decision: "accepted" | "declined") {
  return rpc<null>("respond_join_request", { p_request: requestId, p_decision: decision });
}
