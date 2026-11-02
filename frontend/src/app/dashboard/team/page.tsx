"use client";

import { FormEvent, useCallback, useEffect, useState, useMemo } from "react";
import { Users, ShieldCheck, CheckCircle2, AlertCircle, UserPlus, RefreshCw, Trophy, XCircle, AlertTriangle } from "lucide-react";
import styles from "./team.module.css";
import registrationStyles from "./registrationStatus.module.css";
import Shimmer from "../components/ui/Shimmer";
import Dropdown from "../components/ui/Dropdown";
import {
  answerTeamInvitation,
  applyStudentTeam,
  createSoloTournamentEntry,
  fetchMySoloStatus,
  fetchMyTeamFormation,
  fetchMyTeamRegistrationStatus,
  fetchPaymentSettings,
  fetchUpcomingTournament,
  inviteStudentToTeam,
  leaveStudentTeam,
  startStudentTeam,
  submitStudentTeam,
  type MyTeamFormation,
  type UpcomingTournament,
  type StudentTeamRegistrationStatus,
  type PaymentSettings,
} from "../../../lib/teamFormationApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { getRealtimeClient } from "../../../lib/realtime";
import {
  listOpenPoolTeams,
  listPoolJoinRequests,
  listPoolableStudents,
  requestJoinPoolTeam,
  respondToPoolJoinRequest,
  startPoolTeam,
  type OpenPoolTeam,
  type PoolJoinRequest,
  type PoolableStudent,
} from "../../../lib/poolApi";

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

const CHECKLIST_LABELS: Record<string, string> = {
  chassis_bodywork: "Chassis & bodywork",
  wheels_tyres: "Wheels & tyres",
  steering: "Steering",
  brakes: "Brakes",
  battery: "Power / battery safety",
  wiring: "Electronics / wiring",
  roster_compliance: "Driver / roster compliance",
  safety_equipment: "Safety equipment",
};

function checklistLabel(key: string) {
  return CHECKLIST_LABELS[key] ?? key.replaceAll("_", " ");
}

function formatRaceTime(milliseconds: number | null) {
  return milliseconds === null ? "—" : `${(milliseconds / 1000).toFixed(2)}s`;
}

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason.trim()) return reason;
  if (reason && typeof reason === "object" && "message" in reason && typeof reason.message === "string" && reason.message.trim()) {
    return reason.message;
  }
  return fallback;
}

export default function MyTeamPage() {
  const { data: profile } = useSessionProfile();

  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [formation, setFormation] = useState<MyTeamFormation | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [isSolo, setIsSolo] = useState(false);
  const [paymentDeclared, setPaymentDeclared] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<StudentTeamRegistrationStatus | null>(null);
  const [registrationStatusLoading, setRegistrationStatusLoading] = useState(false);
  const [poolStudents, setPoolStudents] = useState<PoolableStudent[]>([]);
  const [openPoolTeams, setOpenPoolTeams] = useState<OpenPoolTeam[]>([]);
  const [poolJoinRequests, setPoolJoinRequests] = useState<PoolJoinRequest[]>([]);

  const [activeTab, setActiveTab] = useState<"roster" | "formation">("roster");

  const loadRegistrationStatus = useCallback(async (tournamentId: string) => {
    setRegistrationStatusLoading(true);
    try {
      setRegistrationStatus(await fetchMyTeamRegistrationStatus(tournamentId));
    } catch (statusError) {
      setError(errorMessage(statusError, "Couldn't load registration status. Please refresh and try again."));
    } finally {
      setRegistrationStatusLoading(false);
    }
  }, []);

  const loadPoolData = useCallback(async (tournamentId: string, independent: boolean) => {
    if (!independent) {
      setPoolStudents([]);
      setOpenPoolTeams([]);
      setPoolJoinRequests([]);
      return;
    }
    try {
      const [students, teams, requests] = await Promise.all([
        listPoolableStudents(tournamentId),
        listOpenPoolTeams(tournamentId),
        listPoolJoinRequests(tournamentId),
      ]);
      setPoolStudents(students);
      setOpenPoolTeams(teams);
      setPoolJoinRequests(requests);
    } catch (poolError) {
      setError(errorMessage(poolError, "Couldn't load independent team options."));
    }
  }, []);

  // Load team data from backend
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [upcoming, solo] = await Promise.all([fetchUpcomingTournament(), fetchMySoloStatus()]);
       setTournament(upcoming);
       setIsSolo(solo);
       if (!upcoming) {
         setFormation(null);
         setRegistrationStatus(null);
       } else {
         const nextFormation = await fetchMyTeamFormation(upcoming.id);
         setFormation(nextFormation);
         await loadRegistrationStatus(upcoming.id);
         await loadPoolData(upcoming.id, solo && !nextFormation.school_id);
       }
    } catch (loadError) {
      setError(errorMessage(loadError, "Couldn't load your team. Please refresh and try again."));
    } finally {
      setLoading(false);
    }
  }, [loadPoolData, loadRegistrationStatus]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    fetchPaymentSettings().then((settings) => { if (active) setPaymentSettings(settings); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!profile?.id || !tournament?.id) return;
    let realtimeClient: ReturnType<typeof getRealtimeClient> | null = null;
    let channel: ReturnType<ReturnType<typeof getRealtimeClient>["channel"]> | null = null;
    try {
      realtimeClient = getRealtimeClient();
      channel = realtimeClient
        .channel(`team-registration-${profile.id}-${tournament.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
          () => {
            void loadRegistrationStatus(tournament.id);
            void loadPoolData(tournament.id, isSolo && !formation?.school_id);
          },
        )
        .subscribe((status, reason) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setError(errorMessage(reason, "Live updates are unavailable. Use Refresh to check your status."));
          }
        });
    } catch {
      setError("Live updates are unavailable. Use Refresh to check your status.");
    }
    return () => {
      if (channel && realtimeClient) {
        void realtimeClient.removeChannel(channel).catch(() => undefined);
      }
    };
  }, [profile?.id, tournament?.id, isSolo, formation?.school_id, loadPoolData, loadRegistrationStatus]);

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
    await runAction(
      () => isSolo ? startPoolTeam(tournament.id, teamName) : startStudentTeam(tournament.id, teamName, "Robotics 101"),
      "Team created successfully.",
    );
    setTeamName("");
  }

  async function inviteClassmate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = formation?.my_team;
    if (!team || !inviteeId) return;
    await runAction(() => inviteStudentToTeam(team.id, inviteeId), "Invitation sent.");
    setInviteeId("");
  }

  async function requestToJoin(teamId: string) {
    await runAction(() => requestJoinPoolTeam(teamId), "Join request sent to the team captain.");
  }

  async function decideJoinRequest(requestId: string, decision: "accepted" | "declined") {
    await runAction(() => respondToPoolJoinRequest(requestId, decision), decision === "accepted" ? "Student added to your team." : "Join request declined.");
  }

  const currentUserName = profile?.full_name || "You";
  const currentUserId = profile?.id || "";
  const teamSizeLimit = Math.min(tournament?.team_size ?? MAX_TEAM_SIZE, MAX_TEAM_SIZE);

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
  const isIndependent = isSolo && !formation?.school_id;

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
              {memberCount}/{teamSizeLimit} Drivers (Min: {MIN_TEAM_SIZE})
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

      {registrationStatusLoading && !registrationStatus && (
        <section className={registrationStyles.panel} aria-label="Loading registration status">
          <div className={registrationStyles.skeleton}>
            <div className={`${registrationStyles.skeletonLine} ${registrationStyles.skeletonLineShort}`} />
            <div className={`${registrationStyles.skeletonLine} ${registrationStyles.skeletonLineWide}`} />
            <div className={registrationStyles.skeletonLine} />
            <div className={registrationStyles.skeletonLine} />
          </div>
        </section>
      )}

      {registrationStatus?.team && registrationStatus.scrutineering && (
        <section className={registrationStyles.panel} aria-labelledby="registration-status-title">
          <div className={registrationStyles.header}>
            <div className={registrationStyles.headerCopy}>
              <div className={registrationStyles.eyebrow}>Race readiness</div>
              <h2 id="registration-status-title" className={registrationStyles.title}>Registration &amp; Race Status</h2>
              <p className={registrationStyles.subtitle}>A clear view of payment, inspection, and published results for {registrationStatus.team.name}.</p>
            </div>
            <button type="button" className={registrationStyles.refreshButton} onClick={() => void loadRegistrationStatus(registrationStatus.tournament.id)} disabled={registrationStatusLoading || busy}>
              <RefreshCw size={14} className={registrationStatusLoading ? registrationStyles.refreshIcon : undefined} />
              {registrationStatusLoading ? "Refreshing" : "Refresh"}
            </button>
          </div>

          <div className={`${registrationStyles.eligibilityHero} ${!registrationStatus.eligible ? registrationStyles.eligibilityHeroBlocked : ""}`} role="status">
            <div>
              <div className={registrationStyles.eligibilityLabel}>Your race eligibility</div>
              <div className={registrationStyles.eligibilityState}>
                {registrationStatus.eligible ? <Trophy size={22} /> : <XCircle size={22} />}
                {registrationStatus.eligible ? "Race eligible" : "Not race eligible yet"}
              </div>
            </div>
            <div className={registrationStyles.eligibilityHint}>
              {registrationStatus.eligible ? "Both payment verification and scrutineering are complete." : "Payment verification and a passed car inspection are both required."}
            </div>
          </div>

          <div className={registrationStyles.statusGrid}>
            <div className={registrationStyles.statusCard}>
              <div className={registrationStyles.statusCardHeader}><CheckCircle2 size={14} /> Payment review</div>
              <div className={registrationStyles.statusCardValue}>
                <span className={`${registrationStyles.statusChip} ${registrationStatus.team.status === "verified" ? registrationStyles.statusChipSuccess : registrationStatus.team.status === "rejected" ? registrationStyles.statusChipDanger : registrationStyles.statusChipWarning}`}>
                  {registrationStatus.team.status === "verified"
                    ? "Verified"
                    : registrationStatus.team.status === "rejected"
                      ? "Rejected"
                      : registrationStatus.team.status === "payment_declared"
                        ? "Awaiting Hanbee review"
                        : registrationStatus.team.status === "applied"
                          ? "Payment not declared"
                          : "Not submitted"}
                </span>
              </div>
              {registrationStatus.team.status === "rejected" && registrationStatus.team.review_note && <p className={registrationStyles.statusCardMeta}>{registrationStatus.team.review_note}</p>}
              <p className={registrationStyles.statusCardMeta}>
                {registrationStatus.team.status === "verified"
                  ? "Entry payment approved by Hanbee staff. Car inspection is tracked separately."
                  : registrationStatus.team.status === "rejected"
                    ? "Entry payment decision from Hanbee staff."
                    : registrationStatus.team.status === "payment_declared"
                      ? "Entry payment decision from Hanbee staff. Passing car inspection does not approve payment."
                      : registrationStatus.team.status === "applied"
                        ? "Payment has not been declared yet. Hanbee staff can review the entry after payment is submitted."
                        : "Submit your entry and payment details for Hanbee staff review."}
              </p>
            </div>
            <div className={registrationStyles.statusCard}>
              <div className={registrationStyles.statusCardHeader}><ShieldCheck size={14} /> Car inspection</div>
              <div className={registrationStyles.statusCardValue}>
                <span className={`${registrationStyles.statusChip} ${registrationStatus.scrutineering.status === "passed" ? registrationStyles.statusChipSuccess : registrationStatus.scrutineering.status === "failed" ? registrationStyles.statusChipDanger : registrationStyles.statusChipWarning}`}>
                  {registrationStatus.scrutineering.status === "passed" ? "Passed" : registrationStatus.scrutineering.status === "failed" ? "Failed" : "Pending inspection"}
                </span>
              </div>
              <p className={registrationStyles.statusCardMeta}>{registrationStatus.scrutineering.checked_at ? `Last checked ${new Date(registrationStatus.scrutineering.checked_at).toLocaleDateString()}` : "Your car has not been inspected yet."}</p>
            </div>
          </div>

          {registrationStatus.scrutineering.status === "failed" && (
            <div className={registrationStyles.feedback} role="alert">
              <div className={registrationStyles.sectionHeading + " " + registrationStyles.sectionHeadingDanger}><AlertTriangle size={15} /> Inspection feedback</div>
              <ul className={registrationStyles.failedList}>
                {registrationStatus.scrutineering.items.filter((item) => item.result === "fail").map((item) => (
                  <li key={item.key} className={registrationStyles.failedItem}>
                    <XCircle size={14} />
                    <span><strong>{checklistLabel(item.key)}</strong>{item.note ? ` — ${item.note}` : ""}</span>
                  </li>
                ))}
              </ul>
              {registrationStatus.scrutineering.notes && <p className={registrationStyles.note}>{registrationStatus.scrutineering.notes}</p>}
            </div>
          )}

          {registrationStatus.scrutineering.history.length > 0 && (
            <div className={registrationStyles.subsection}>
              <div className={registrationStyles.subsectionHeader}>
                <h3 className={registrationStyles.subsectionTitle}>Inspection history</h3>
                <span className={registrationStyles.subsectionMeta}>{registrationStatus.scrutineering.history.length} inspection{registrationStatus.scrutineering.history.length === 1 ? "" : "s"}</span>
              </div>
              <div className={registrationStyles.timeline}>
                {registrationStatus.scrutineering.history.map((entry, index) => (
                  <div key={`${entry.checked_at}-${index}`} className={registrationStyles.timelineItem}>
                    <span className={`${registrationStyles.timelineDot} ${entry.status === "passed" ? registrationStyles.timelineDotSuccess : entry.status === "failed" ? registrationStyles.timelineDotDanger : ""}`} />
                    <div className={registrationStyles.timelineRow}>
                      <span className={registrationStyles.timelineStatus}>{entry.status === "passed" ? "Passed" : entry.status === "failed" ? "Failed" : "Pending"}</span>
                      <span className={registrationStyles.timelineDate}>{new Date(entry.checked_at).toLocaleString()}</span>
                    </div>
                    {entry.notes && <p className={registrationStyles.timelineNote}>{entry.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(registrationStatus.race_results.length > 0 || registrationStatus.result) && (
            <div className={registrationStyles.subsection}>
              <div className={registrationStyles.subsectionHeader}>
                <h3 className={registrationStyles.subsectionTitle}>Published results</h3>
                {registrationStatus.result && <span className={registrationStyles.subsectionMeta}>Final ranking available</span>}
              </div>
              {registrationStatus.result ? (
                <p className={registrationStyles.subtitle}>Final position <strong>#{registrationStatus.result.rank}</strong> · {registrationStatus.result.points} points</p>
              ) : (
                <p className={registrationStyles.subtitle}>Race results are published; the final leaderboard position is not available yet.</p>
              )}
              {registrationStatus.race_results.length > 0 && (
                <div className={registrationStyles.resultsTableWrap}>
                  <table className={registrationStyles.resultsTable}>
                    <thead><tr><th>Race / heat</th><th>Status</th><th>Time</th><th>Laps</th></tr></thead>
                    <tbody>{registrationStatus.race_results.map((race) => (
                      <tr key={race.race_name}>
                        <td>{race.race_name}</td>
                        <td>{race.finished ? "Finished" : "In progress"}</td>
                        <td className={!race.finished ? registrationStyles.mutedCell : undefined}>{race.finished ? formatRaceTime(race.finish_time_ms) : "—"}</td>
                        <td>{race.lap_count}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {team?.status === "proposed" && (
        <div className={styles.formSection} role="status">
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Waiting for school staff approval</h2>
            <p className={styles.formSubtitle}>
              Your team will appear in Hanbee&apos;s tournament entry review after your school approves it and confirms the payment declaration.
            </p>
          </div>
        </div>
      )}

      {(team?.status === "applied" || team?.status === "payment_declared") && (
        <div className={styles.formSection} role="status">
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Waiting for Hanbee review</h2>
            <p className={styles.formSubtitle}>
              Your school has submitted this team. It is now in the tournament entry review queue.
            </p>
          </div>
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
          Driver Roster ({memberCount}/{teamSizeLimit})
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
                  Team Roster Capacity: {memberCount} of {teamSizeLimit} Drivers (Min: {MIN_TEAM_SIZE})
                </div>
                <div className={styles.slotsDesc}>
                  Official tournament teams require between 1 and 5 registered students. All teammates have equal track eligibility.
                </div>
              </div>

              <div className={styles.slotsVisual}>
                {Array.from({ length: teamSizeLimit }, (_, index) => index + 1).map((slotNum) => {
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
                      {invitation.members} / {teamSizeLimit} members
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

          {isIndependent && isCaptain && isRealTeam && teamStatus !== "draft" && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Squad formation is closed</h2>
                <p className={styles.formSubtitle}>
                  {team!.name} has already applied, so its roster is locked and can no longer accept invites or join requests.
                </p>
              </div>
            </div>
          )}

          {isIndependent && isCaptain && isRealTeam && teamStatus === "draft" && poolJoinRequests.length > 0 && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Join requests</h2>
                <p className={styles.formSubtitle}>Independent students asking to join {team!.name}.</p>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {poolJoinRequests.map((request) => (
                  <div key={request.request_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
                    <div><strong>{request.student_name}</strong><div style={{ color: "var(--text-muted)", fontSize: 12 }}>Requested {new Date(request.created_at).toLocaleDateString()}</div></div>
                    <div style={{ display: "flex", gap: 8 }}><button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void decideJoinRequest(request.request_id, "accepted")}>Accept</button><button type="button" className={styles.secondaryBtn} disabled={busy} onClick={() => void decideJoinRequest(request.request_id, "declined")}>Decline</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Captain Inviting Classmates (Max 5 Limit) */}
          {isCaptain && !isIndependent && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Invite Classmates to Squad</h2>
                <p className={styles.formSubtitle}>
                  Current size: {memberCount} of {teamSizeLimit} players.{" "}
                  {memberCount < teamSizeLimit
                    ? `${teamSizeLimit - memberCount} slot${teamSizeLimit - memberCount === 1 ? "" : "s"} remaining.`
                    : `Your squad has reached the maximum capacity of ${teamSizeLimit} students.`}
                </p>
              </div>

              {memberCount < teamSizeLimit ? (
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

          {isIndependent && isCaptain && isRealTeam && teamStatus === "draft" && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Invite independent drivers</h2>
                <p className={styles.formSubtitle}>Invite another independent student while your team is still forming.</p>
              </div>
              {memberCount < teamSizeLimit ? (
                <form onSubmit={inviteClassmate} className={styles.inlineForm}>
                  <Dropdown id="pool-team-invitee" value={inviteeId} onChange={setInviteeId} required disabled={busy} placeholder="Select an independent student" options={poolStudents.map((student) => ({ value: student.student_id, label: student.full_name }))} />
                  <button type="submit" disabled={busy || poolStudents.length === 0} className={styles.actionBtn}>{busy ? "Sending Invite..." : "Send Team Invite"}</button>
                </form>
              ) : <div style={{ color: "#10b981", fontSize: 13 }}>Your team has reached its capacity.</div>}
            </div>
          )}

          {/* Create Squad if not in one */}
          {!team && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Form a New RC Racing Squad</h2>
                <p className={styles.formSubtitle}>
                  {tournament
                      ? isIndependent ? "Choose a team name and invite other independent students, or request to join an open pool team." : "Choose a team name. Teams can have 1 to 5 members. You can start solo and invite teammates later."
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

          {isIndependent && !team && openPoolTeams.length > 0 && (
            <div className={styles.formSection}>
              <div className={styles.formHeader}><h2 className={styles.formTitle}>Open independent teams</h2><p className={styles.formSubtitle}>Request to join a team that is still forming.</p></div>
              <div style={{ display: "grid", gap: 10 }}>{openPoolTeams.map((poolTeam) => <div key={poolTeam.team_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 12, border: "1px solid var(--border-subtle)", borderRadius: 10 }}><div><strong>{poolTeam.team_name}</strong><div style={{ color: "var(--text-muted)", fontSize: 12 }}>{poolTeam.captain_name ?? "Captain"} · {poolTeam.member_count}/{poolTeam.team_size} drivers</div></div><button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void requestToJoin(poolTeam.team_id)}>Request to join</button></div>)}</div>
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
                  Teams with 1 to {teamSizeLimit} players are eligible for school staff approval. School team slots determine how many teams your school can enter.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy || memberCount < MIN_TEAM_SIZE || memberCount > teamSizeLimit}
                  onClick={() => void runAction(() => submitStudentTeam(team.id), "Squad submitted to school staff for verification.")}
                >
                  Submit Team for School Approval ({memberCount}/{teamSizeLimit} Players)
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
                {paymentSettings?.qr_image_url ? (
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- payment-assets is a public Supabase Storage bucket, not a Next-optimizable local/remote image source worth configuring */}
                    <img src={paymentSettings.qr_image_url} alt="Payment QR code" style={{ width: 160, height: 160, borderRadius: 10, border: "1px solid var(--border-subtle)", objectFit: "contain", background: "#fff" }} />
                    <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420 }}>
                      {paymentSettings.upi_id && <p style={{ marginBottom: 6 }}>Pay to UPI ID: <strong style={{ color: "var(--text-primary)" }}>{paymentSettings.upi_id}</strong></p>}
                      {paymentSettings.instructions && <p>{paymentSettings.instructions}</p>}
                    </div>
                  </div>
                ) : (
                  <p role="status" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Payment QR isn&apos;t set up yet -- contact Hanbee staff for payment instructions before confirming.
                  </p>
                )}

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={paymentDeclared}
                    onChange={(e) => setPaymentDeclared(e.target.checked)}
                  />
                  I have completed the tournament payment.
                </label>
                {paymentDeclared && (
                  <label style={{ display: "block", fontSize: 13 }}>
                    UPI transaction ID / UTR
                    <input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. 408812345678"
                      maxLength={100}
                      required
                      disabled={busy}
                      className={styles.textInput}
                      style={{ display: "block", marginTop: 6 }}
                    />
                  </label>
                )}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={busy || !paymentDeclared || !paymentReference.trim()}
                    onClick={() => void runAction(async () => { await applyStudentTeam(team.id, true, paymentReference); setPaymentDeclared(false); setPaymentReference(""); }, "Payment declared. Your solo entry is waiting for Hanbee review.")}
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
