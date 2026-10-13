"use client";

import { Award, BookOpenCheck, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { fetchMyAchievements } from "../../../lib/achievementsApi";

const achievementIcons = {
  course: BookOpenCheck,
  certificate: Award,
  tournament: Trophy,
};

export default function AchievementsPage() {
  const { data: achievements = [], isLoading, error } = useQuery({
    queryKey: ["my-achievements"],
    queryFn: fetchMyAchievements,
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Achievements</h1>
        <p className={styles.pageSubtitle}>Milestones earned through your learning and tournament activity.</p>
      </div>

      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load your achievements."}</p>}
      {isLoading && <Shimmer variant="cards" count={3} />}
      {!isLoading && !error && achievements.length === 0 && (
        <section className={styles.sectionCard}>
          <Award size={24} aria-hidden="true" />
          <h2 className={styles.sectionTitle} style={{ marginTop: 12 }}>Your milestones will appear here</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
            Complete a course, earn a certificate, or join a tournament team to unlock your first achievement.
          </p>
        </section>
      )}
      {!isLoading && !error && achievements.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 20 }}>
          {achievements.map((achievement) => {
            const Icon = achievementIcons[achievement.kind];
            return (
              <article key={achievement.id} className={styles.metricCard} style={{ minHeight: 180 }}>
                <div className={styles.metricCardHeader}>
                  <span className={styles.metricLabel}>Earned achievement</span>
                  <Icon size={20} className={styles.metricIcon} aria-hidden="true" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>{achievement.title}</h2>
                <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{achievement.detail}</p>
                {achievement.earnedAt && (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: "auto", paddingTop: 16 }}>
                    Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
