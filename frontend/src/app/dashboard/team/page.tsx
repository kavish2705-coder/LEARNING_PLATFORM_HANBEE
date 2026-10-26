"use client";

import { FormEvent, useCallback, useEffect, useState, useMemo } from "react";
import { Users, ShieldCheck, CheckCircle2, AlertCircle, UserPlus } from "lucide-react";
import styles from "./team.module.css";
import Shimmer from "../components/ui/Shimmer";
import Dropdown from "../components/ui/Dropdown";
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
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

// Maximum and Minimum members allowed in a team per company guidelines
const MAX_TEAM_SIZE = 5;
const MIN_TEAM_SIZE = 1;

interface RosterDriver {
  student_id: string;
  name: string;
  is_captain: boolean;
  is_self: boolean;
  role?: string;
}

export default function MyTeamPage() {
  const { data: profile } = useSessionProfile();

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

  const [activeTab, setActiveTab] = useState<"roster" | "formation">("roster");

  // Load team data from backend
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
    await runAction(() => startStudentTeam(tournament.id, teamName, "Robotics 101"), "Team created successfully.");
    setTeamName("");
  }

  async function inviteClassmate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = formation?.my_team;
    if (!team || !inviteeId) return;
    await runAction(() => inviteStudentToTeam(team.id, inviteeId), "Invitation sent.");
    setInviteeId("");
  }

  const currentUserName = profile?.full_name || "You";
  const currentUserId = profile?.id || "";

  // Real data check: if the database returns a real team with members, use ONLY real data.
  const realTeam = formation?.my_team;
  const isRealTeam = Boolean(realTeam && realTeam.members && realTeam.members.length > 0);

  const drivers: RosterDriver[] = useMemo(() => {
    if (!isRealTeam) return [];
    return realTeam!.members.map((m) => ({
      student_id: m.student_id,
      name: m.name,
      is_captain: m.is_captain,
      is_self: m.student_id === currentUserId || m.name === currentUserName,
      role: m.is_captain ? "Lead Driver / Captain" : "Driver",
    }));
  }, [isRealTeam, realTeam, currentUserId, currentUserName]);

  const team = formation?.my_team;
  const teamDisplayName = isRealTeam ? team!.name : "No team yet";
  const teamStatus = isRealTeam ? team!.status : "none";
  const memberCount = isRealTeam ? (team?.members.length ?? 0) : 0;
  const isCaptain = isRealTeam ? team!.is_captain : true;

  if (loading) {
    return (
      <div className={styles.teamPage}>
        <Shimmer variant="cards" count={4} />
      </div>
    );
  }

  return (
    <div className={styles.teamPage}>
      {/* Hero Team Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <div className={styles.metaRow}>
            <span className={`${styles.teamStatusBadge} ${teamStatus === "draft" ? styles.teamStatusDraft : ""}`}>
              <ShieldCheck size={14} />
              {teamStatus === "verified"
                ? "Verified · Grid Ready"
                : teamStatus === "none"
                ? "No team yet"
                : teamStatus.replaceAll("_", " ")}
            </span>
            <span className={styles.schoolBadge}>
              <Users size={13} />
              {memberCount}/{MAX_TEAM_SIZE} Drivers (Min: {MIN_TEAM_SIZE})
            </span>
          </div>

          <h1 className={styles.teamName}>
            {teamDisplayName}
            {isCaptain && <span className={styles.badgeCaptain}>Captain</span>}
          </h1>
        </div>
      </div>

      {/* Notice / Status Banners */}
      {notice && (
        <div className={`${styles.noticeAlert} ${styles.noticeAlertSuccess}`}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className={`${styles.noticeAlert} ${styles.noticeAlertError}`}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "roster" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("roster")}
        >
          <Users size={16} />
          Driver Roster ({memberCount}/{MAX_TEAM_SIZE})
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "formation" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("formation")}
        >
          <UserPlus size={16} />
          Squad Formation & Invitations
        </button>
      </div>

      {/* TAB 1: Driver Roster & Telemetry */}
      {activeTab === "roster" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* No-team notice: ONLY shown when no real team is in DB */}
          {!isRealTeam && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              background: "var(--accent-subtle-bg)",
              border: "1px solid var(--accent-subtle-border)",
              borderRadius: "14px",
              padding: "12px 18px",
              fontSize: "13px",
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
                <span>
                  {tournament
                    ? "You don't have a team yet. Form or join one to register for the tournament."
                    : "Team registration opens once Hanbee schedules a tournament. There's nothing to form yet."}
                </span>
              </div>
              {tournament && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  style={{ padding: "6px 14px", fontSize: "12px" }}
                  onClick={() => setActiveTab("formation")}
                >
                  Form a Squad →
                </button>
              )}
            </div>
          )}

          {/* Capacity Tracker */}
          {isRealTeam && (
            <div className={styles.slotsBanner}>
              <div className={styles.slotsInfo}>
                <div className={styles.slotsTitle}>
                  <ShieldCheck size={16} color="var(--accent-subtle-text)" />
                  Team Roster Capacity: {memberCount} of {MAX_TEAM_SIZE} Drivers (Min: {MIN_TEAM_SIZE})
                </div>
                <div className={styles.slotsDesc}>
                  Official tournament teams require between 1 and 5 registered students. All teammates have equal track eligibility.
                </div>
              </div>

              <div className={styles.slotsVisual}>
                {[1, 2, 3, 4, 5].map((slotNum) => {
                  const isFilled = slotNum <= memberCount;
                  return (
                    <button
                      key={slotNum}
                      type="button"
                      className={`${styles.slotPill} ${isFilled ? styles.slotFilled : styles.slotEmpty}`}
                      title={isFilled ? `Driver Slot ${slotNum}: Registered` : "Add a driver"}
                      onClick={isFilled ? undefined : () => setActiveTab("formation")}
                      disabled={isFilled}
                    >
                      {isFilled ? slotNum : "+"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drivers Grid */}
          {isRealTeam ? (
            <div className={styles.rosterGrid}>
              {drivers.map((driver) => {
                const initial = driver.name.charAt(0).toUpperCase();
                return (
                  <div
                    key={driver.student_id}
                    className={`${styles.driverCard} ${driver.is_self ? styles.driverCardSelf : ""}`}
                  >
                    <div className={styles.driverHeader}>
                      <div className={styles.driverProfile}>
                        <div className={`${styles.driverAvatar} ${driver.is_self ? styles.driverAvatarSelf : ""}`}>
                          {initial}
                        </div>
                        <div className={styles.driverNameRow}>
                          <span className={styles.driverName}>
                            {driver.name}
                            {driver.is_self && <span className={styles.badgeYou}>YOU</span>}
                          </span>
                          <span className={styles.driverRole}>{driver.role || (driver.is_captain ? "Captain" : "Driver")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No drivers yet — form a team to see your roster here.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Squad Formation & Invitations */}
      {activeTab === "formation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Active Invitations */}
          {formation && formation.invitations.length > 0 && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Pending Team Invitations</h2>
                <p className={styles.formSubtitle}>You have been invited to join an existing school squad.</p>
              </div>

              {formation.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "var(--bg-surface-elevated)",
                    borderRadius: 12,
                    border: "1px solid var(--border-elevated)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 15 }}>{invitation.team_name}</strong>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {invitation.members} / {MAX_TEAM_SIZE} members
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      disabled={busy}
                      onClick={() => void runAction(() => answerTeamInvitation(invitation.id, true), "You joined the team.")}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={busy}
                      onClick={() => void runAction(() => answerTeamInvitation(invitation.id, false), "Invitation declined.")}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Captain Inviting Classmates (Max 5 Limit) */}
          {isCaptain && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Invite Classmates to Squad</h2>
                <p className={styles.formSubtitle}>
                  Current size: {memberCount} of {MAX_TEAM_SIZE} players.{" "}
                  {memberCount < MAX_TEAM_SIZE
                    ? `${MAX_TEAM_SIZE - memberCount} slot${MAX_TEAM_SIZE - memberCount === 1 ? "" : "s"} remaining.`
                    : "Your squad has reached the maximum capacity of 5 students."}
                </p>
              </div>

              {memberCount < MAX_TEAM_SIZE ? (
                <form onSubmit={inviteClassmate} className={styles.inlineForm}>
                  <Dropdown
                    id="team-invitee"
                    value={inviteeId}
                    onChange={setInviteeId}
                    required
                    disabled={busy}
                    placeholder="Select a classmate"
                    options={(formation?.eligible_classmates ?? []).map((student) => ({ value: student.student_id, label: student.name }))}
                  />
                  <button type="submit" disabled={busy} className={styles.actionBtn}>
                    {busy ? "Sending Invite..." : "Send Squad Invite"}
                  </button>
                </form>
              ) : (
                <div style={{ color: "#10b981", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />
                  Squad roster is full with 5 drivers. Ready for qualifying!
                </div>
              )}
            </div>
          )}

          {/* Create Squad if not in one */}
          {!team && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Form a New RC Racing Squad</h2>
                <p className={styles.formSubtitle}>
                  {tournament
                    ? "Choose a team name. Teams can have 1 to 5 members. You can start solo and invite teammates later."
                    : "Team registration isn't open yet — Hanbee staff hasn't scheduled a tournament. Check back once one is announced."}
                </p>
              </div>

              {tournament && (
                <form onSubmit={createTeam} className={styles.inlineForm}>
                  <input
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Team Vortex Apex, Neon Velocity..."
                    minLength={1}
                    maxLength={40}
                    required
                    disabled={busy}
                    className={styles.textInput}
                  />
                  <button type="submit" disabled={busy} className={styles.actionBtn}>
                    {busy ? "Creating Squad..." : "Start Squad (1-5 Players)"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Solo Entry if not attached to a school */}
          {!team && isSolo && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>{isSolo ? "Solo Tournament Entry" : "School Membership Needed"}</h2>
                <p className={styles.formSubtitle}>
                  {isSolo
                    ? "Enter this tournament as a team of one. Your entry will be reviewed by Hanbee staff after you confirm payment."
                    : "Your account is not attached to an active school or marked for solo entry. Contact Hanbee staff to restore your school membership or enable solo participation."}
                </p>
              </div>
              {isSolo && tournament && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy}
                  onClick={() => void runAction(() => createSoloTournamentEntry(tournament.id), "Solo entry created. Confirm payment below to submit it.")}
                >
                  Create Solo Entry
                </button>
              )}
            </div>
          )}

          {/* Submission and Approval Actions for School Teams */}
          {team && isCaptain && team.status === "draft" && formation?.school_id && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Submit Squad for School Staff Approval</h2>
                <p className={styles.formSubtitle}>
                  Teams with 1 to 5 players are eligible for official submission.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy || memberCount < MIN_TEAM_SIZE || memberCount > MAX_TEAM_SIZE}
                  onClick={() => void runAction(() => submitStudentTeam(team.id), "Squad submitted to school staff for verification.")}
                >
                  Submit Team for Verification ({memberCount}/{MAX_TEAM_SIZE} Players)
                </button>

                <button
                  type="button"
                  className={styles.dangerBtn}
                  disabled={busy}
                  onClick={() => void runAction(() => leaveStudentTeam(team.id), "You left the team.")}
                >
                  Leave Squad
                </button>
              </div>
            </div>
          )}

          {/* Solo entry: payment confirmation instead of school-staff submission */}
          {team && isCaptain && team.status === "draft" && !formation?.school_id && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Confirm Tournament Payment</h2>
                <p className={styles.formSubtitle}>
                  Confirm payment for your solo tournament entry. Hanbee staff will verify the entry after submission.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={paymentDeclared}
                    onChange={(e) => setPaymentDeclared(e.target.checked)}
                  />
                  I have completed the tournament payment.
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={busy || !paymentDeclared}
                    onClick={() => void runAction(() => applyStudentTeam(team.id, true), "Payment declared. Your solo entry is waiting for Hanbee review.")}
                  >
                    Submit Paid Solo Entry
                  </button>
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    disabled={busy}
                    onClick={() => void runAction(() => leaveStudentTeam(team.id), "You left the team.")}
                  >
                    Leave Team
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
