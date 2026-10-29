"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../dashboard.module.css";
import { Input, Select } from "../ui/FormField";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { listTournamentRaceResults, listTournamentResults, listTournaments, listVerifiedTournamentTeams, removeTournamentResult, saveTournamentRaceResult, saveTournamentResult, type TournamentRaceResult, type TournamentRecord, type TournamentResult, type VerifiedTournamentTeam } from "../../../../lib/tournamentAdminApi";
import { useConfirm } from "../../../../components/ui/useConfirm";

export default function TournamentResults() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [teams, setTeams] = useState<VerifiedTournamentTeam[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [raceResults, setRaceResults] = useState<TournamentRaceResult[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [raceName, setRaceName] = useState("");
  const [raceTeamId, setRaceTeamId] = useState("");
  const [lapTimes, setLapTimes] = useState("");
  const [raceFinished, setRaceFinished] = useState(true);
  const [rank, setRank] = useState("1");
  const [points, setPoints] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Only Hanbee staff and managers can manage results.");
    const [events, verifiedTeams, savedResults, savedRaceResults] = await Promise.all([
      listTournaments(),
      listVerifiedTournamentTeams(),
      listTournamentResults(),
      listTournamentRaceResults(),
    ]);
    setTournaments(events);
    setTeams(verifiedTeams);
    setResults(savedResults);
    setRaceResults(savedRaceResults);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournament results."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const tournamentById = useMemo(() => new Map(tournaments.map((item) => [item.id, item])), [tournaments]);
  const teamById = useMemo(() => new Map(teams.map((item) => [item.id, item])), [teams]);

  function edit(result: TournamentResult) {
    setSelectedTeamId(result.team_id);
    setRank(String(result.rank));
    setPoints(String(result.points));
    setNotes(result.notes);
    setNotice("");
  }

  const { ask, dialog } = useConfirm();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = teamById.get(selectedTeamId);
    const rankValue = Number(rank);
    const pointsValue = Number(points);
    if (!team || !Number.isInteger(rankValue) || rankValue < 1 || !Number.isFinite(pointsValue) || pointsValue < 0) {
      setError("Choose a verified team and enter a positive rank and non-negative points.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await saveTournamentResult({ tournamentId: team.tournament_id, teamId: team.id, rank: rankValue, points: pointsValue, notes: notes.trim() });
      setNotice(`Result saved for ${team.name}.`);
      setSelectedTeamId(""); setRank("1"); setPoints("0"); setNotes("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't save the result."); }
    finally { setBusy(false); }
  }

  async function submitRace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = teamById.get(raceTeamId);
    const lapValues = lapTimes.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean);
    const lapTimesMs = lapValues.map((value) => Math.round(Number(value) * 1000));
    if (!team || !raceName.trim() || (raceFinished && lapTimesMs.length === 0)
      || lapTimesMs.length > 100 || lapTimesMs.some((value) => !Number.isInteger(value) || value <= 0)) {
      setError("Choose a verified team, enter a race name, and provide positive lap times in seconds. A completed race needs at least one lap.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      await saveTournamentRaceResult({
        tournamentId: team.tournament_id,
        raceName: raceName.trim(),
        teamId: team.id,
        lapTimesMs,
        finished: raceFinished,
      });
      setNotice(`Race result saved for ${team.name}. A completed racer’s time is calculated from the recorded lap times.`);
      setRaceName(""); setRaceTeamId(""); setLapTimes(""); setRaceFinished(true);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save the race result.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(result: TournamentResult) {
    const team = teamById.get(result.team_id);
    if (!team || !(await ask({ title: "Delete this result?", message: `The result for ${team.name} will be removed.`, confirmLabel: "Delete", tone: "danger" }))) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await removeTournamentResult({ tournamentId: result.tournament_id, teamId: result.team_id });
      setNotice(`Result removed for ${team.name}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't remove the result."); }
    finally { setBusy(false); }
  }

  return <section>{dialog}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 20 }}>
      <h2 className={styles.tableTitle}>Tournament results</h2>
      <p style={{ color: "var(--text-muted)", marginTop: 4, marginBottom: 16 }}>Publish rankings for verified teams; students see them on the leaderboard.</p>
      <h3 className={styles.tableTitle} style={{ fontSize: 15 }}>Set team result</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 14 }}>
        <label>Verified team<Select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} required><option value="">Choose team</option>{teams.map((team) => <option key={team.id} value={team.id}>{tournamentById.get(team.tournament_id)?.title ?? "Tournament"} · {team.name}</option>)}</Select></label>
        <label>Rank<Input type="number" min="1" step="1" value={rank} onChange={(event) => setRank(event.target.value)} required /></label>
        <label>Points<Input type="number" min="0" step="any" value={points} onChange={(event) => setPoints(event.target.value)} required /></label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>Notes<Input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} /></label>
      <button type="submit" className={styles.primaryBtn} disabled={busy || teams.length === 0} style={{ marginTop: 14 }}>{busy ? "Saving…" : "Save result"}</button>
      {teams.length === 0 && <p style={{ marginTop: 8, color: "var(--text-muted)" }}>No verified teams are available for results.</p>}
    </form>
    {loading ? <p role="status" className={styles.sectionCard}>Loading results…</p> : <div className={styles.sectionCard}>
      <h3 className={styles.tableTitle}>Published rankings</h3>
      {results.length === 0 ? (
        <p style={{ marginTop: 12, color: "var(--text-muted)" }}>No results have been published yet.</p>
      ) : (
        <div className={styles.tableContainer} style={{ marginTop: 12 }}><table className={styles.dataTable}><thead><tr><th>Tournament</th><th>Team</th><th>Rank</th><th>Points</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
          {results.map((result) => <tr key={result.id}>
            <td>{tournamentById.get(result.tournament_id)?.title ?? "Tournament"}</td><td>{teamById.get(result.team_id)?.name ?? "Team"}</td><td>{result.rank}</td><td>{result.points}</td><td>{result.notes}</td>
            <td style={{ display: "flex", gap: 8 }}>
              <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: 12 }} disabled={busy} onClick={() => edit(result)}>Edit</button>
              <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: 12 }} disabled={busy} onClick={() => void remove(result)}>Delete</button>
            </td>
          </tr>)}
        </tbody></table></div>
      )}
    </div>}
    <form className={styles.sectionCard} onSubmit={submitRace} style={{ marginTop: 20, marginBottom: 20 }}>
      <h3 className={styles.tableTitle}>Record race / heat result</h3>
      <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
        Enter each participant under the same race name. Completed time is the sum of lap times; the fastest finisher wins. Enter lap times in seconds, separated by commas.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
        <label>Verified team<Select value={raceTeamId} onChange={(event) => setRaceTeamId(event.target.value)} required>
          <option value="">Choose team</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{tournamentById.get(team.tournament_id)?.title ?? "Tournament"} · {team.name}</option>)}
        </Select></label>
        <label>Race / heat name<Input list="tournament-race-names" value={raceName} onChange={(event) => setRaceName(event.target.value)} maxLength={100} placeholder="e.g. Heat 1" required />
          <datalist id="tournament-race-names">
            {[...new Set(raceResults.map((result) => result.race_name))].map((name) => <option key={name} value={name} />)}
          </datalist>
        </label>
        <label>Race status<Select value={raceFinished ? "finished" : "dnf"} onChange={(event) => setRaceFinished(event.target.value === "finished")}>
          <option value="finished">Finished</option>
          <option value="dnf">Did not finish</option>
        </Select></label>
      </div>
      <label style={{ display: "block", marginTop: 12 }}>Lap times (seconds)
        <Input value={lapTimes} onChange={(event) => setLapTimes(event.target.value)} placeholder="e.g. 12.84, 13.02, 12.67" inputMode="decimal" />
      </label>
      <button type="submit" className={styles.primaryBtn} disabled={busy || teams.length === 0} style={{ marginTop: 14 }}>{busy ? "Saving…" : "Save race result"}</button>
      {teams.length === 0 && <p style={{ marginTop: 8, color: "var(--text-muted)" }}>No verified teams are available for race results.</p>}
    </form>
    <div className={styles.sectionCard}>
      <h3 className={styles.tableTitle}>Recorded race results</h3>
      {raceResults.length === 0 ? (
        <p style={{ marginTop: 12, color: "var(--text-muted)" }}>No race results have been recorded yet.</p>
      ) : (
        <div className={styles.tableContainer} style={{ marginTop: 12 }}><table className={styles.dataTable}><thead><tr><th>Tournament</th><th>Race / heat</th><th>Team</th><th>Status</th><th>Race time</th><th>Average lap</th><th>Laps</th></tr></thead><tbody>
          {raceResults.map((result) => <tr key={`${result.race_id}-${result.team_id}`}>
            <td>{result.tournament_title}</td><td>{result.race_name}</td><td>{result.team_name}</td>
            <td>{result.finished ? "Finished" : "Did not finish"}</td>
            <td>{result.finish_time_ms === null ? "—" : `${(result.finish_time_ms / 1000).toFixed(2)}s`}</td>
            <td>{result.average_lap_time_ms === null ? "—" : `${(result.average_lap_time_ms / 1000).toFixed(2)}s`}</td>
            <td>{result.lap_count}</td>
          </tr>)}
        </tbody></table></div>
      )}
    </div>
  </section>;
}
