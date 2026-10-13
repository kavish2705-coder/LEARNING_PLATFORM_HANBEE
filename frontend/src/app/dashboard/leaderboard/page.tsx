"use client";

import { useQuery } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { getLeaderboard, listTournaments } from "../../../lib/tournamentAdminApi";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

export default function LeaderboardPage() {
  const { data: tournaments, isLoading: loadingTournaments, error: tournamentError } = useQuery({
    queryKey: ["tournaments"],
    queryFn: listTournaments,
  });
  const tournament = (tournaments ?? []).find((t) => t.status === "completed") ?? (tournaments ?? [])[0];

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["leaderboard", tournament?.id],
    queryFn: () => getLeaderboard(tournament!.id),
    enabled: Boolean(tournament?.id),
  });

  const loading = loadingTournaments || isLoading;
  const failure = tournamentError ?? error;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Leaderboard</h1>
        <p className={styles.pageSubtitle}>{tournament ? tournament.title : "See the latest tournament results"}</p>
      </div>

      <MyRank />

      {failure && <p role="alert">{failure instanceof Error ? failure.message : "We couldn't load the leaderboard."}</p>}
      {loading && <Shimmer rows={5} />}
      {!loading && !failure && !tournament && <p>No tournament has been published yet.</p>}
      {!loading && !failure && tournament && (rows ?? []).length === 0 && <p>No results have been posted for this tournament yet.</p>}

      {(rows ?? []).length > 0 && (
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>Top Teams</h2>
          <div className={styles.leaderboardList}>
            {(rows ?? []).map((team, index) => (
              <div key={team.team_id} className={styles.leaderboardRow}>
                <div className={`${styles.leaderboardRank} ${index === 0 ? styles.rankGold : index === 1 ? styles.rankSilver : index === 2 ? styles.rankBronze : styles.rankOther}`}>
                  #{team.rank}
                </div>
                <div className={styles.leaderboardTeam}>
                  <h3 className={styles.leaderboardName}>{team.team_name}</h3>
                  <p className={styles.leaderboardSchool}>{team.school_name ?? "Solo entry"}</p>
                </div>
                <div className={styles.leaderboardPoints}>
                  {team.points.toLocaleString()} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MyRank() {
  const { data } = useQuery({
    queryKey: ["my-leaderboard-rank"],
    queryFn: () => authenticatedSupabaseFetch<{ tournament_title: string; team_name: string; rank: number; points: number; field_size: number }[]>("/rest/v1/rpc/my_leaderboard_rank", { method: "POST", body: "{}" }),
  });
  const row = data?.[0];
  if (!row) return null;
  return (
    <div className={`${styles.sectionCard} ${styles.myRankCard}`}>
      <span className={styles.metricLabel}>Your team in {row.tournament_title}</span>
      <h2 className={`${styles.sectionTitle} ${styles.myRankTitle}`}>{row.team_name}: #{row.rank} of {row.field_size}</h2>
      <p className={styles.myRankPoints}>{row.points} points</p>
    </div>
  );
}
