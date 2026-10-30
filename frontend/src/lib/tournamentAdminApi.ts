import { authenticatedSupabaseFetch } from "./supabaseAuth";

export type TournamentStatus = "upcoming" | "live" | "completed";

export interface TournamentRecord {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  status: TournamentStatus;
  team_size: number;
}

export interface VerifiedTournamentTeam {
  id: string;
  tournament_id: string;
  name: string;
  org_id: string | null;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  team_id: string;
  rank: number;
  points: number;
  notes: string;
}

export interface StudentLeaderboardRow {
  team_id: string;
  team_name: string;
  school_name: string | null;
  org_id: string | null;
  rank: number | null;
  points: number;
  notes: string;
  field_size: number;
  matches_participated: number;
  wins: number;
  top_three_finishes: number;
  average_lap_time_ms: number | null;
  is_current_user: boolean;
}

export interface TournamentRaceResult {
  tournament_id: string;
  tournament_title: string;
  race_id: string;
  race_name: string;
  team_id: string;
  team_name: string;
  finished: boolean;
  finish_time_ms: number | null;
  lap_count: number;
  average_lap_time_ms: number | null;
}

async function rpc<T>(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export function listTournaments() {
  return authenticatedSupabaseFetch<TournamentRecord[]>(
    "/rest/v1/tournaments?select=id,title,description,starts_at,ends_at,venue,status,team_size&order=starts_at.desc",
  );
}

// Single source of truth for "which tournament does a staff screen open on
// by default" -- previously My Space, Leaderboard, and Scrutineering each
// picked differently (live-first, completed-first, upcoming-first), so a
// staff member could click from one live-tournament screen into another
// screen silently showing a different tournament. live beats upcoming beats
// completed beats whatever's first.
export function pickActiveTournament<T extends Pick<TournamentRecord, "id" | "status">>(
  tournaments: T[] | null | undefined,
): T | null {
  const list = tournaments ?? [];
  return (
    list.find((item) => item.status === "live") ??
    list.find((item) => item.status === "upcoming") ??
    list.find((item) => item.status === "completed") ??
    list[0] ??
    null
  );
}

export function createTournament(input: Omit<TournamentRecord, "id" | "status" | "team_size">) {
  return rpc<string>("create_tournament", {
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_venue: input.venue,
  });
}

export function updateTournament(input: TournamentRecord) {
  return rpc<null>("update_tournament", {
    p_id: input.id,
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_venue: input.venue,
    p_status: input.status,
  });
}

export function listVerifiedTournamentTeams() {
  return authenticatedSupabaseFetch<VerifiedTournamentTeam[]>(
    "/rest/v1/tournament_teams?select=id,tournament_id,name,org_id&status=eq.verified&order=name.asc",
  );
}

export function listTournamentResults() {
  return authenticatedSupabaseFetch<TournamentResult[]>(
    "/rest/v1/tournament_results?select=id,tournament_id,team_id,rank,points,notes&order=rank.asc",
  );
}

export function saveTournamentResult(input: { tournamentId: string; teamId: string; rank: number; points: number; notes: string }) {
  return rpc<string>("set_result", {
    p_tournament: input.tournamentId,
    p_team: input.teamId,
    p_rank: input.rank,
    p_points: input.points,
    p_notes: input.notes,
  });
}

export function removeTournamentResult(input: { tournamentId: string; teamId: string }) {
  return rpc<null>("delete_result", { p_tournament: input.tournamentId, p_team: input.teamId });
}

export function getLeaderboard(tournamentId: string) {
  return rpc<{ team_id: string; team_name: string; school_name: string | null; rank: number; points: number; notes: string }[]>(
    "get_leaderboard",
    { p_tournament: tournamentId },
  );
}

export function getStudentLeaderboard(tournamentId: string) {
  return rpc<StudentLeaderboardRow[]>("get_student_leaderboard", { p_tournament: tournamentId });
}

export interface TournamentTeamRosterRow {
  team_id: string;
  student_id: string;
  full_name: string | null;
}

export function listTournamentTeamRoster(tournamentId: string) {
  return authenticatedSupabaseFetch<TournamentTeamRosterRow[]>(
    `/rest/v1/tournament_team_members?select=team_id,student_id,profiles!tournament_team_members_student_id_fkey(full_name)&tournament_id=eq.${tournamentId}`,
  ).then((rows) =>
    (rows as unknown as { team_id: string; student_id: string; profiles: { full_name: string | null } | null }[]).map((row) => ({
      team_id: row.team_id,
      student_id: row.student_id,
      full_name: row.profiles?.full_name ?? null,
    })),
  );
}

export function listTournamentRaceResults() {
  return rpc<TournamentRaceResult[]>("list_tournament_race_results", {});
}

export function saveTournamentRaceResult(input: {
  tournamentId: string;
  raceName: string;
  teamId: string;
  lapTimesMs: number[];
  finished: boolean;
}) {
  return rpc<string>("record_tournament_race_result", {
    p_tournament: input.tournamentId,
    p_race_name: input.raceName,
    p_team: input.teamId,
    p_lap_times_ms: input.lapTimesMs,
    p_finished: input.finished,
  });
}
