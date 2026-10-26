"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import styles from "../../components/school/SchoolOverview.module.css";
import EmptyState from "../../../../components/ui/EmptyState";
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

  if (loading) {
    return (
      <div className={styles.hubContainer}>
        <div className={styles.sectionCard} style={{ textAlign: "center", padding: "40px" }}>
          <p role="status" style={{ color: "var(--text-muted)", margin: 0 }}>Loading school teams…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.hubHeaderLeft}>
          <h1 className={styles.hubTitle}>Teams</h1>
          <p className={styles.hubSubtitle}>
            {tournament ? `${tournament.title} · ${tournament.team_size} players per school team` : "No upcoming tournament is open for team formation."}
          </p>
        </div>
      </header>

      {error && <p role="alert" className={styles.sectionCard} style={{ color: "#ef4444" }}>{error}</p>}
      {notice && <p role="status" className={styles.sectionCard} style={{ color: "#10b981" }}>{notice}</p>}

      {organizationId && tournament && (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Team slots</h2>
          </div>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13.5 }}>
            {slots?.used ?? 0} of {slots?.max_teams ?? "no limit set"} slots used · team size {tournament.team_size}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const count = Number(slotInput);
              if (Number.isInteger(count) && count >= 1 && count <= 20) {
                void runAction(() => setSchoolTeamSlots(tournament.id, organizationId, count), "Team slots updated.");
              }
            }}
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}
          >
            <label htmlFor="team-slots" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-main)" }}>Maximum teams</label>
            <input 
              id="team-slots" 
              type="number" 
              min={1} 
              max={20} 
              value={slotInput} 
              onChange={(event) => setSlotInput(event.target.value)} 
              required 
              disabled={busy}
              style={{
                background: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-elevated)",
                borderRadius: 10,
                padding: "8px 14px",
                color: "var(--text-main)",
                fontSize: 14,
                width: 80
              }}
            />
            <button type="submit" className={styles.actionBtn} disabled={busy}>
              {busy ? "Saving…" : "Save slots"}
            </button>
          </form>
        </section>
      )}

      {!organizationId && (
        <p role="alert" className={styles.sectionCard} style={{ color: "#ef4444" }}>
          No active school is linked to this account.
        </p>
      )}
      
      {organizationId && tournament && teams.length === 0 && (
        <EmptyState
          icon={<Users size={32} />}
          title="No teams have been proposed yet"
          description="Students have not formed or submitted any teams for this tournament yet. When squads are formed, they will appear here for staff review and slot approval."
        />
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {teams.map((team) => (
          <article key={team.team_id} className={styles.sectionCard} style={{ padding: "24px 28px" }}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{team.name}</h2>
                <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13.5 }}>
                  Captain: {team.captain_name ?? "Unknown"} · {team.member_count}/{team.team_size} players · <span style={{ textTransform: "capitalize" }}>{team.status.replaceAll("_", " ")}</span>
                </p>
              </div>
              {team.submitted_at && (
                <time dateTime={team.submitted_at} style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                  {new Date(team.submitted_at).toLocaleDateString()}
                </time>
              )}
            </div>
            {team.staff_note && (
              <p style={{ margin: 0, fontSize: 13, color: "var(--accent-subtle-text)", background: "var(--accent-subtle-bg)", padding: "10px 16px", borderRadius: 12, border: "1px solid var(--accent-subtle-border)" }}>
                Previous note: {team.staff_note}
              </p>
            )}

            {team.status === "proposed" && (
              <div style={{ display: "grid", gap: 14, marginTop: 4, paddingTop: 16, borderTop: "1px solid var(--border-elevated)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, color: "var(--text-main)" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(paymentConfirmed[team.team_id])}
                    onChange={(event) => setPaymentConfirmed((current) => ({ ...current, [team.team_id]: event.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: "var(--color-primary)" }}
                  />
                  Payment declaration received from the team
                </label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={busy || !paymentConfirmed[team.team_id]}
                    onClick={() => void runAction(() => approveTeamApplication(team.team_id, true), "Team approved and sent to Hanbee for review.")}
                  >
                    Approve team
                  </button>
                  <input
                    aria-label={`Changes requested for ${team.name}`}
                    placeholder="Note for the captain"
                    maxLength={300}
                    value={notes[team.team_id] ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [team.team_id]: event.target.value }))}
                    disabled={busy}
                    style={{
                      flex: "1 1 200px",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-elevated)",
                      borderRadius: 10,
                      padding: "9px 14px",
                      color: "var(--text-main)",
                      fontSize: 13.5
                    }}
                  />
                  <button 
                    type="button" 
                    className={styles.actionBtnSecondary} 
                    disabled={busy} 
                    onClick={() => void runAction(() => returnTeamForChanges(team.team_id, notes[team.team_id] ?? ""), "Team returned to its captain for changes.")}
                  >
                    Request changes
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {!loading && error && (
        <button type="button" className={styles.actionBtnSecondary} onClick={() => void load()} style={{ alignSelf: "flex-start" }}>
          Try again
        </button>
      )}
    </div>
  );
}

