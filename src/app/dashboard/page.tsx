"use client";

import { useState } from "react";
import { Timer, Flag, Trophy, Target, Calendar, BarChart2, ChevronRight } from "lucide-react";
import styles from "./dashboard.module.css";

const tableData = [
  { name: "Hanbee Grand Prix 2026", format: "TEAM", telemetry: "00:41.284s", position: "#2", status: "UPCOMING" },
  { name: "Autonomous RC Drag Sprint", format: "SOLO", telemetry: "00:43.112s", position: "#5", status: "COMPLETED" },
  { name: "National RC Championship", format: "TEAM", telemetry: "00:40.998s", position: "#3", status: "COMPLETED" },
  { name: "Hanbee Invitational 2025", format: "SOLO", telemetry: "00:42.450s", position: "#4", status: "COMPLETED" },
  { name: "RC Sprint Series Qualifiers", format: "TEAM", telemetry: "—", position: "—", status: "UPCOMING" },
];

export default function DashboardOverview() {
  const [filter, setFilter] = useState("ALL");

  const filteredData = tableData.filter(row => {
    if (filter === "ALL") return true;
    return row.format === filter;
  });

  const handleActionClick = (action: string) => {
    alert(`Opening ${action}...`);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Overview</h1>
        <p className={styles.pageSubtitle}>Tournament performance & quick actions</p>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Fastest Lap Time</span>
            <Timer size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>00:41.284s</div>
          <div className={styles.metricSubtext}>↓ 0.3s from last race</div>
          <div className={styles.sparkline}>
            {[40, 55, 30, 70, 85, 60, 45].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'rgba(255, 255, 255, 0.7)' } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Total Participations</span>
            <Flag size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>12</div>
          <div className={styles.metricSubtext}>Competitions entered</div>
          <div className={styles.sparkline}>
            {[20, 30, 25, 45, 60, 80, 100].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'rgba(255, 255, 255, 0.5)' } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Team Rank</span>
            <Trophy size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>#2</div>
          <div className={styles.metricSubtext}>Team Apex RC</div>
          <div className={styles.sparkline}>
            {[50, 40, 60, 45, 75, 80, 70].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'rgba(255, 255, 255, 0.6)' } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Solo Standing</span>
            <Target size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>#5</div>
          <div className={styles.metricSubtext}>Overall leaderboard</div>
          <div className={styles.sparkline}>
            {[80, 70, 85, 65, 55, 45, 35].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'rgba(255, 255, 255, 0.4)' } as React.CSSProperties} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Tournament Participation</h2>
          <div className={styles.tableFilters}>
            <button 
              className={`${styles.filterBtn} ${filter === 'ALL' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All Events
            </button>
            <button 
              className={`${styles.filterBtn} ${filter === 'TEAM' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter('TEAM')}
            >
              Team
            </button>
            <button 
              className={`${styles.filterBtn} ${filter === 'SOLO' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter('SOLO')}
            >
              Solo
            </button>
          </div>
        </div>

        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Format</th>
              <th>Lap / Telemetry</th>
              <th>Position</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>
                  <span className={`${styles.badge} ${row.format === 'TEAM' ? styles.badgeTeam : styles.badgeSolo}`}>
                    {row.format}
                  </span>
                </td>
                <td style={{ fontFamily: "monospace" }}>{row.telemetry}</td>
                <td>{row.position}</td>
                <td>
                  <span className={`${styles.badge} ${row.status === 'UPCOMING' ? styles.badgeUpcoming : styles.badgeCompleted}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
                  No events match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.quickActions}>
        <button className={styles.actionBtn} onClick={() => handleActionClick("Schedule")}>
          <div className={styles.actionIcon}>
            <Calendar size={18} color="rgba(255,255,255,0.7)" />
            View Schedule
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </button>
        <button className={styles.actionBtn} onClick={() => handleActionClick("Telemetry Logs")}>
          <div className={styles.actionIcon}>
            <BarChart2 size={18} color="rgba(255,255,255,0.7)" />
            Check Telemetry Logs
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </button>
        <button className={styles.actionBtn} onClick={() => handleActionClick("Race Registration")}>
          <div className={styles.actionIcon}>
            <Flag size={18} color="rgba(255,255,255,0.7)" />
            Register for Next Race
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </button>
      </div>
    </div>
  );
}
