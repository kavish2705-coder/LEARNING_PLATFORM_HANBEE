"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import Link from "next/link";
import styles from "../dashboard.module.css";
import { fetchUpcomingTournament, fetchMyTeamFormation, type MyTeamFormation, type UpcomingTournament } from "../../../lib/teamFormationApi";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

export default function TournamentOverview() {
  const [tournament, setTournament] = useState<UpcomingTournament | null>(null);
  const [team, setTeam] = useState<MyTeamFormation["my_team"]>(null);
  const [teamHref, setTeamHref] = useState("/dashboard/team");
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { data: profile, isLoading: profileLoading, error: profileError } = useSessionProfile();

  useEffect(() => {
    if (profileLoading) return;
    if (profileError) { setError(profileError instanceof Error ? profileError.message : "We couldn't load tournament information."); setLoading(false); return; }
    let active = true;
    async function loadOverview() {
      try {
        const event = await fetchUpcomingTournament();
        if (!active) return;
        setTournament(event);
        if (profile?.role === "student") setCanManageTeam(true);
        if (profile?.role === "school_staff") {
          setTeamHref("/dashboard/school/teams");
          setCanManageTeam(true);
        }
        if (event && profile?.role === "student") {
          const formation = await fetchMyTeamFormation(event.id);
          if (active) setTeam(formation.my_team);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournament information.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadOverview();
    return () => { active = false; };
  }, [profileLoading, profileError, profile?.role]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Overview</h1>
        <p className={styles.pageSubtitle}>Upcoming Hanbee events and your team status</p>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading tournament information…</p> : tournament ? (
        <section className={styles.sectionCard}>
          <span className={styles.metricLabel}>NEXT TOURNAMENT</span>
          <h2 className={styles.heroTitle}>{tournament.title}</h2>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><CalendarDays size={16} aria-hidden="true" />{new Date(tournament.starts_at).toLocaleString()}</span>
            {tournament.venue && <span className={styles.metaItem}><MapPin size={16} aria-hidden="true" />{tournament.venue}</span>}
          </div>
          {team && <p className={styles.teamMeta}>Your team: <strong>{team.name}</strong><span className={`${styles.statusBadge} ${team.status === "verified" ? styles.statusVerified : team.status === "rejected" ? styles.statusRejected : team.status === "draft" ? styles.statusDraft : styles.statusPending}`}>{team.status.replaceAll("_", " ")}</span></p>}
          <div className={`${styles.buttonRow} ${styles.heroActions}`}>
            {canManageTeam && <Link href={teamHref} className={styles.primaryBtn}>{team ? "Manage team" : "Team registration"}</Link>}
            <Link href="/dashboard/leaderboard" className={styles.secondaryAction}>View results</Link>
          </div>
        </section>
      ) : (
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>No upcoming tournament</h2>
          <p className={styles.bodyMuted}>New events will appear here when they are published.</p>
          <Link href="/dashboard/leaderboard" className={styles.tertiaryAction}>See published results</Link>
        </section>
      )}

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Tournament</span><span className={styles.metricIconBadge}><Trophy size={18} aria-hidden="true" /></span></div>
          <div className={`${styles.metricValue} ${styles.metricValueCompact}`}>{loading ? "—" : tournament ? "Upcoming" : "None"}</div>
          <div className={styles.metricSubtext}>Current event status</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Team Status</span><span className={styles.metricIconBadge}><Users size={18} aria-hidden="true" /></span></div>
          <div className={`${styles.metricValue} ${styles.metricValueCompact}`}>{loading ? "—" : team ? team.status.replaceAll("_", " ") : "No team"}</div>
          <div className={styles.metricSubtext}>{team ? `${team.members.length} members` : "Create or join a team"}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}><span className={styles.metricLabel}>Team size</span><span className={styles.metricIconBadge}><Users size={18} aria-hidden="true" /></span></div>
          <div className={styles.metricValue}>{loading ? "—" : tournament ? tournament.team_size : "—"}</div>
          <div className={styles.metricSubtext}>Members required per team</div>
        </div>
      </div>
    </div>
  );
}
