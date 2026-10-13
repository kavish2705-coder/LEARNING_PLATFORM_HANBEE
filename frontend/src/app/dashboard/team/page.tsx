"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import styles from "../dashboard.module.css";
import {
  answerTeamInvitation,
  applyStudentTeam,
  createSoloTournamentEntry,
  fetchMySoloStatus,
  fetchMyTeamFormation,
  fetchUpcomingTournament,
  inviteStudentToTeam,
  leaveStudentTeam,
  startStudentTeam,
  submitStudentTeam,
  type MyTeamFormation,
  type UpcomingTournament,
} from "../../../lib/teamFormationApi";

export default function MyTeamPage() {
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [formation, setFormation] = useState<MyTeamFormation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [isSolo, setIsSolo] = useState(false);
  const [paymentDeclared, setPaymentDeclared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [upcoming, solo] = await Promise.all([fetchUpcomingTournament(), fetchMySoloStatus()]);
      setTournament(upcoming);
      setIsSolo(solo);
      setFormation(upcoming ? await fetchMyTeamFormation(upcoming.id) : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Couldn't load your team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The team update was refused.");
    } finally {
      setBusy(false);
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tournament) return;
    await runAction(() => startStudentTeam(tournament.id, teamName, "Robotics 101"), "Team created.");
    setTeamName("");
  }

  async function inviteClassmate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = formation?.my_team;
    if (!team || !inviteeId) return;
    await runAction(() => inviteStudentToTeam(team.id, inviteeId), "Invitation sent.");
    setInviteeId("");
  }

  if (loading) return <p role="status">Loading team information…</p>;
  if (error && !tournament) {
    return <div role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></div>;
  }

  const team = formation?.my_team;
  const playerCount = team?.members.length ?? 0;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Team</h1>
        <p className={styles.pageSubtitle}>
          {tournament ? `${tournament.title} · ${tournament.team_size} players per school team` : "No tournament is open to you right now. This may be because none has been announced yet, or because your account isn't linked to an active school and isn't set up for solo entry. Contact Hanbee staff if you believe this is wrong."}
        </p>
      </div>

      {error && <p role="alert" className={styles.announcementAlert}>{error}</p>}
      {notice && <p role="status" className={styles.announcementNotice}>{notice}</p>}

      {tournament && formation && (
        <div className={styles.pageStack}>
          {formation.invitations.length > 0 && (
            <section className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Team invitations</h2>
              {formation.invitations.map((invitation) => (
                <div key={invitation.id} className={styles.invitationRow}>
                  <p>{invitation.team_name} · {invitation.members} members</p>
                  <div className={styles.buttonRow}>
                    <button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void runAction(() => answerTeamInvitation(invitation.id, true), "You joined the team.")}>Accept</button>
                    <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => void runAction(() => answerTeamInvitation(invitation.id, false), "Invitation declined.")}>Decline</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {!team && formation.school_id && (
            <section className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>You are not on a team yet</h2>
              <p className={styles.bodyMuted}>
                {formation.slots?.max_teams == null
                  ? "Your school staff haven't opened team slots yet."
                  : `${formation.slots.remaining ?? 0} of ${formation.slots.max_teams} school team slots remain.`}
              </p>
              {formation.slots?.remaining !== 0 && formation.slots?.max_teams != null && (
                <p className={styles.teamActions}>
                  <Link href="/dashboard/team/start" className={styles.primaryBtn}>Create a team with the setup wizard</Link>
                </p>
              )}
              {formation.slots?.remaining !== 0 && formation.slots?.max_teams != null && (
                <form onSubmit={createTeam} className={styles.inlineForm}>
                  <label htmlFor="new-team-name" className="sr-only">Team name</label>
                  <input
                    id="new-team-name"
                    className={styles.teamInput}
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Choose a team name"
                    minLength={1}
                    maxLength={40}
                    required
                    disabled={busy}
                  />
                  <button type="submit" className={styles.secondaryAction} disabled={busy}>{busy ? "Creating…" : "Quick create"}</button>
                </form>
              )}
            </section>
          )}

          {!team && !formation.school_id && (
            <section className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>{isSolo ? "Solo tournament entry" : "School membership needed"}</h2>
              <p className={styles.bodyMuted}>{isSolo ? "Enter this tournament as a team of one. Your entry will be reviewed by Hanbee staff after you confirm payment." : "Your account is not attached to an active school or marked for solo entry. Contact Hanbee staff to restore your school membership or enable solo participation."}</p>
              {isSolo && <div className={styles.teamActions}><button type="button" className={styles.primaryBtn} disabled={busy} onClick={() => void runAction(() => createSoloTournamentEntry(tournament.id), "Solo entry created. Review the payment step below to submit it.")}>Create solo entry</button></div>}
            </section>
          )}

          {team && (
            <section className={`${styles.sectionCard} ${styles.teamCard}`}>
              <header className={styles.teamHeader}>
                <div className={styles.teamIdentity}>
                  <h2>{team.name}</h2>
                  <div className={styles.teamMeta}>
                    <span className={`${styles.statusBadge} ${team.status === "verified" ? styles.statusVerified : team.status === "rejected" || team.status === "withdrawn" ? styles.statusRejected : team.status === "draft" ? styles.statusDraft : team.status === "applied" ? styles.statusApplied : styles.statusPending}`}>{team.status.replaceAll("_", " ")}</span>
                    <span>{playerCount}/{tournament.team_size} players</span>
                  </div>
                </div>
                {team.is_captain && <span className={styles.captainBadge}><Trophy size={13} aria-hidden="true" /> Captain</span>}
              </header>

              {team.staff_note && <p className={styles.teamNote}>School staff note: {team.staff_note}</p>}

              <div className={styles.teamSection}>
                <h3 className={styles.teamSectionTitle}>Team roster</h3>
                <ul className={styles.roster}>
                  {team.members.map((member) => (
                    <li key={member.student_id} className={styles.rosterSlot}>
                      <span className={styles.rosterAvatar} aria-hidden="true">{member.name.charAt(0).toUpperCase()}</span>
                      <span><span className={styles.rosterName}>{member.name}</span>{member.is_captain && <span className={styles.rosterRole}>Team captain</span>}</span>
                    </li>
                  ))}
                  {team.pending_invites.map((invite) => (
                    <li key={invite.id} className={`${styles.rosterSlot} ${styles.rosterSlotEmpty}`}>
                      <span className={styles.rosterAvatar} aria-hidden="true">…</span>
                      <span><span className={styles.rosterName}>{invite.name}</span><span className={styles.rosterRole}>Invitation pending</span></span>
                    </li>
                  ))}
                  {Array.from({ length: Math.max(0, tournament.team_size - playerCount - team.pending_invites.length) }, (_, index) => (
                    <li key={`open-slot-${index}`} className={`${styles.rosterSlot} ${styles.rosterSlotEmpty}`}>
                      <span className={styles.rosterAvatar} aria-hidden="true">+</span>
                      <span><span className={styles.rosterName}>Open player slot</span><span className={styles.rosterRole}>Awaiting teammate</span></span>
                    </li>
                  ))}
                </ul>
              </div>

              {team.is_captain && team.status === "draft" && (
                <div className={styles.teamSection}>
                  <h3 className={styles.teamSectionTitle}>Team actions</h3>
                  {formation.school_id && formation.eligible_classmates.length > 0 && (
                    <form onSubmit={inviteClassmate} className={styles.inlineForm}>
                      <label htmlFor="team-invitee" className="sr-only">Classmate to invite</label>
                      <select id="team-invitee" className={styles.teamInput} value={inviteeId} onChange={(event) => setInviteeId(event.target.value)} required disabled={busy}>
                        <option value="">Choose a classmate</option>
                        {formation.eligible_classmates.map((student) => <option key={student.student_id} value={student.student_id}>{student.name}</option>)}
                      </select>
                      <button type="submit" className={styles.secondaryAction} disabled={busy}>Invite classmate</button>
                    </form>
                  )}
                  {formation.school_id ? <div className={styles.teamActions}><button type="button" className={styles.primaryBtn} disabled={busy || playerCount !== tournament.team_size} onClick={() => void runAction(() => submitStudentTeam(team.id), "Team sent to school staff for approval.")}>
                    {playerCount === tournament.team_size ? "Submit team for approval" : `Invite ${tournament.team_size - playerCount} more player${tournament.team_size - playerCount === 1 ? "" : "s"}`}
                  </button></div> : <div className={styles.paymentPanel}>
                    <p className={styles.bodyMuted}>Confirm payment for your solo tournament entry. Hanbee staff will verify the entry after submission.</p>
                    {process.env.NEXT_PUBLIC_TOURNAMENT_PAYMENT_QR_URL && <a className={styles.tertiaryAction} href={process.env.NEXT_PUBLIC_TOURNAMENT_PAYMENT_QR_URL} target="_blank" rel="noreferrer">View tournament payment QR</a>}
                    <label className={styles.paymentCheck}><input type="checkbox" checked={paymentDeclared} onChange={(event) => setPaymentDeclared(event.target.checked)} />I have completed the tournament payment.</label>
                    <div><button type="button" className={styles.primaryBtn} disabled={busy || !paymentDeclared} onClick={() => void runAction(() => applyStudentTeam(team.id, true), "Payment declared. Your solo entry is waiting for Hanbee review.")}>Submit paid solo entry</button></div>
                  </div>}
                </div>
              )}

              {team.status === "proposed" && <p className={styles.teamNote}>Your school staff are reviewing this team.</p>}
              {team.status === "draft" && !team.is_captain && <p className={styles.teamNote}>Your captain is forming the team.</p>}
              {team.status === "payment_declared" && <p className={styles.teamNote}>{formation.school_id ? "Your school approved the team." : "Your payment declaration was received."} Hanbee staff will review its entry.</p>}
              {team.status === "verified" && <p className={styles.teamNote}>Your team is verified for the tournament.</p>}
              {team.is_captain && team.status === "draft" && <footer className={styles.teamFooter}><button type="button" className={styles.destructiveAction} disabled={busy} onClick={() => void runAction(() => leaveStudentTeam(team.id), "You left the team.")}>Leave team</button></footer>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
