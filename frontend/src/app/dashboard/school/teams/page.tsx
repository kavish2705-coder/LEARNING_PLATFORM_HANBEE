"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input } from "../../components/ui/FormField";
import Shimmer from "../../components/ui/Shimmer";
import EmptyState from "../../components/ui/EmptyState";
import {
  approveTeamApplication,
  fetchMyOrganizationId,
  fetchSchoolTeamOverview,
  fetchTeamSlotStatus,
  fetchUpcomingTournament,
  returnTeamForChanges,
  setSchoolTeamSlots,
  type SchoolTeamOverview,
  type TeamSlotStatus,
  type UpcomingTournament,
} from "../../../../lib/teamFormationApi";

export default function SchoolTeams() {
  const [organizationId, setOrganizationId] = useState("");
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [teams, setTeams] = useState<SchoolTeamOverview[]>([]);
  const [slots, setSlots] = useState<TeamSlotStatus | null>(null);
  const [slotInput, setSlotInput] = useState("1");
  const [paymentConfirmed, setPaymentConfirmed] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const orgId = await fetchMyOrganizationId();
      setOrganizationId(orgId ?? "");
      const nextTournament = await fetchUpcomingTournament();
      setTournament(nextTournament);
      if (!orgId || !nextTournament) {
        setTeams([]);
        setSlots(null);
        return;
      }
      const [nextTeams, nextSlots] = await Promise.all([
        fetchSchoolTeamOverview(nextTournament.id, orgId),
        fetchTeamSlotStatus(nextTournament.id, orgId),
      ]);
      setTeams(nextTeams);
      setSlots(nextSlots);
      setSlotInput(String(nextSlots?.max_teams ?? 1));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load school teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The update was refused.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className={styles.pageHeader}>
        <div className={styles.metricLabel}>SCHOOL PORTAL</div>
        <h1 className={styles.pageTitle}>Teams</h1>
        <p className={styles.pageSubtitle}>
          {tournament ? `${tournament.title} · ${tournament.team_size} players per school team` : "No upcoming tournament is open for team formation."}
        </p>
      </header>

      {error && <p role="alert" className={styles.sectionCard}>{error}</p>}
      {notice && <p role="status" className={styles.sectionCard}>{notice}</p>}

      {loading ? (
        <Shimmer rows={4} />
      ) : !organizationId ? (
        <p role="alert" className={styles.sectionCard}>No active school is linked to this account.</p>
      ) : (
        <div className={styles.splitLayout}>
          <div>
            {tournament && teams.length === 0 && (
              <section className={styles.sectionCard}>
                <EmptyState
                  icon={<Trophy size={22} />}
                  title="No teams proposed yet"
                  description="Teams appear here once a student captain registers one for the next tournament and it's ready for your review."
                />
              </section>
            )}

            <div style={{ display: "grid", gap: 16 }}>
              {teams.map((team) => (
                <article
                  key={team.team_id}
                  className={`${styles.statusRailCard} ${
                    team.status === "verified" ? styles.statusRailSuccess :
                    team.status === "rejected" ? styles.statusRailDanger :
                    styles.statusRailWarning
                  }`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h2 className={styles.sectionTitle}>{team.name}</h2>
                        <span className={`${styles.badge} ${
                          team.status === "verified" ? styles.badgeApproved :
                          team.status === "rejected" ? styles.badgeChanges :
                          styles.badgeProposed
                        }`}>
                          {team.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p style={{ color: "var(--text-muted)", marginTop: 6 }}>
                        Captain: {team.captain_name ?? "Unknown"} · {team.member_count}/{team.team_size} players
                      </p>
                    </div>
                    {team.submitted_at && <time dateTime={team.submitted_at} style={{ color: "var(--text-muted)" }}>{new Date(team.submitted_at).toLocaleDateString()}</time>}
                  </div>
                  {team.staff_note && <p style={{ marginTop: 10, color: "var(--text-muted)" }}>Previous note: {team.staff_note}</p>}

                  {team.status === "proposed" && (
                    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(paymentConfirmed[team.team_id])}
                          onChange={(event) => setPaymentConfirmed((current) => ({ ...current, [team.team_id]: event.target.checked }))}
                        />
                        Payment declaration received from the team
                      </label>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          className={styles.primaryBtn}
                          disabled={busy || !paymentConfirmed[team.team_id]}
                          onClick={() => void runAction(() => approveTeamApplication(team.team_id, true), "Team approved and sent to Hanbee for review.")}
                        >
                          Approve team
                        </button>
                        <Input
                          aria-label={`Changes requested for ${team.name}`}
                          placeholder="Note for the captain"
                          maxLength={300}
                          value={notes[team.team_id] ?? ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [team.team_id]: event.target.value }))}
                          disabled={busy}
                          style={{ flex: 1, minWidth: 180 }}
                        />
                        <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => void runAction(() => returnTeamForChanges(team.team_id, notes[team.team_id] ?? ""), "Team returned to its captain for changes.")}>Request changes</button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {!loading && error && <button type="button" className={styles.secondaryAction} onClick={() => void load()} style={{ marginTop: 16 }}>Try again</button>}
          </div>

          {tournament && (
            <div className={styles.sideRail}>
              <div className={styles.railSummaryCard}>
                <span className={styles.metricLabel}>AT A GLANCE</span>
                <div className={styles.railStat}>
                  <span className={styles.railStatLabel}>Slots used</span>
                  <span className={styles.railStatValue}>{slots?.used ?? 0} / {slots?.max_teams ?? "—"}</span>
                </div>
                <div className={styles.railStat}>
                  <span className={styles.railStatLabel}>Team size</span>
                  <span className={styles.railStatValue}>{tournament.team_size}</span>
                </div>
                <div className={styles.railStat}>
                  <span className={styles.railStatLabel}>Teams proposed</span>
                  <span className={styles.railStatValue}>{teams.length}</span>
                </div>
              </div>

              <div className={styles.railSummaryCard}>
                <span className={styles.metricLabel}>TEAM SLOTS</span>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const count = Number(slotInput);
                    if (Number.isInteger(count) && count >= 1 && count <= 20) {
                      void runAction(() => setSchoolTeamSlots(tournament.id, organizationId, count), "Team slots updated.");
                    }
                  }}
                  style={{ display: "grid", gap: 10, marginTop: 14 }}
                >
                  <label htmlFor="team-slots" style={{ fontSize: 13, color: "var(--text-muted)" }}>Maximum teams</label>
                  <Input id="team-slots" type="number" min={1} max={20} value={slotInput} onChange={(event) => setSlotInput(event.target.value)} required disabled={busy} />
                  <button type="submit" className={styles.primaryBtn} disabled={busy}>{busy ? "Saving…" : "Save slots"}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
