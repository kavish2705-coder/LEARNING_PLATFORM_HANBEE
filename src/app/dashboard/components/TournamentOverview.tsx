"use client";

import { useState } from "react";
import { Timer, Flag, Trophy, Target, ChevronRight } from "lucide-react";
import styles from "../dashboard.module.css";

const tableData = [
  { name: "Hanbee Grand Prix 2026", format: "TEAM", telemetry: "00:41.284s", position: "#2", status: "UPCOMING" },
  { name: "Autonomous RC Drag Sprint", format: "SOLO", telemetry: "00:43.112s", position: "#5", status: "COMPLETED" },
  { name: "National RC Championship", format: "TEAM", telemetry: "00:40.998s", position: "#3", status: "COMPLETED" },
  { name: "Hanbee Invitational 2025", format: "SOLO", telemetry: "00:42.450s", position: "#4", status: "COMPLETED" },
  { name: "RC Sprint Series Qualifiers", format: "TEAM", telemetry: "—", position: "—", status: "UPCOMING" },
];

import { useRole } from "../../RoleContext";

export default function TournamentOverview() {
  const { role } = useRole();
  const [filter, setFilter] = useState("ALL");

  const filteredData = tableData.filter(row => {
    if (filter === "ALL") return true;
    return row.format === filter;
  });

  const handleActionClick = (action: string) => {
    alert(`Opening ${action}...`);
  };

  if (role === "teacher") {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Tournament Administration</h1>
          <p className={styles.pageSubtitle}>Manage participating teams and track leaderboard progress</p>
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Active Teams</span>
              <Target size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>24</div>
            <div className={styles.metricSubtext}>Across all classes</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Upcoming Races</span>
              <Flag size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>3</div>
            <div className={styles.metricSubtext}>Next 7 days</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Pending Telemetry</span>
              <Timer size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>12</div>
            <div className={styles.metricSubtext}>Runs to review</div>
          </div>
        </div>

        <div className={styles.dashboardGrid} style={{ marginTop: '32px' }}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Registered Teams</h2>
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Team Name</th>
                      <th>Class</th>
                      <th>Best Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={styles.cellHighlight}>Team Apex</td>
                      <td>Advanced Engineering</td>
                      <td className={styles.cellMonospace}>00:41.284s</td>
                      <td><span className={`${styles.statusPill} ${styles.statusSuccess}`}>Qualified</span></td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>Circuit Breakers</td>
                      <td>Robotics 101</td>
                      <td className={styles.cellMonospace}>00:44.912s</td>
                      <td><span className={`${styles.statusPill} ${styles.statusSuccess}`}>Qualified</span></td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>Velocity Ops</td>
                      <td>Advanced Engineering</td>
                      <td className={styles.cellMonospace}>—</td>
                      <td><span className={styles.statusPill} style={{ background: 'rgba(255,165,0,0.1)', color: '#ffa500' }}>Pending Run</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === "manager") {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Facility & Tournaments</h1>
          <p className={styles.pageSubtitle}>Manage track scheduling and tournament registration</p>
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Facility Utilization</span>
              <Timer size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>85%</div>
            <div className={styles.metricSubtext}>Peak hours this week</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Active Tournaments</span>
              <Trophy size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>2</div>
            <div className={styles.metricSubtext}>Currently ongoing</div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Total Registrations</span>
              <Target size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>1,402</div>
            <div className={styles.metricSubtext}>+15% from last year</div>
          </div>
        </div>

        <div className={styles.dashboardGrid} style={{ marginTop: '32px' }}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Track Schedule</h2>
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Time Slot</th>
                      <th>Event Type</th>
                      <th>Organizer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={styles.cellHighlight}>09:00 - 12:00</td>
                      <td>Practice Laps</td>
                      <td>James Okafor</td>
                      <td><span className={`${styles.statusPill} ${styles.statusSuccess}`}>In Progress</span></td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>13:00 - 16:00</td>
                      <td>RC Sprint Qualifiers</td>
                      <td>Tournament Committee</td>
                      <td><span className={styles.statusPill} style={{ background: 'rgba(255,165,0,0.1)', color: '#ffa500' }}>Upcoming</span></td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>17:00 - 20:00</td>
                      <td>Open Track Maintenance</td>
                      <td>Facility Team</td>
                      <td><span className={styles.statusPill} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>Scheduled</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tournament Overview</h1>
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
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'var(--text-main)' } as React.CSSProperties} />
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
              <div key={i} className={styles.bar} style={{ height: `${h}%`, '--bar-color': 'var(--text-muted)' } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Global Rank</span>
            <Trophy size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>#42</div>
          <div className={styles.metricSubtext}>Top 5% worldwide</div>
          <div className={styles.sparkline}>
            {[100, 95, 80, 75, 60, 50, 42].map((h, i) => (
              <div key={i} className={styles.bar} style={{ height: `${100 - h}%`, '--bar-color': 'var(--text-main)' } as React.CSSProperties} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent & Upcoming</h2>
              <div className={styles.filterGroup}>
                <button 
                  className={`${styles.filterBtn} ${filter === 'ALL' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilter('ALL')}
                >All</button>
                <button 
                  className={`${styles.filterBtn} ${filter === 'TEAM' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilter('TEAM')}
                >Team</button>
                <button 
                  className={`${styles.filterBtn} ${filter === 'SOLO' ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilter('SOLO')}
                >Solo</button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Competition</th>
                    <th>Format</th>
                    <th>Telemetry</th>
                    <th>Position</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={index}>
                      <td className={styles.cellHighlight}>{row.name}</td>
                      <td>
                        <span className={styles.badgeSolid}>{row.format}</span>
                      </td>
                      <td className={styles.cellMonospace}>{row.telemetry}</td>
                      <td>{row.position}</td>
                      <td>
                        <span className={`${styles.statusPill} ${row.status === 'UPCOMING' ? styles.statusWarning : styles.statusSuccess}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionList}>
              <button className={styles.actionBtn} onClick={() => handleActionClick("Register Team")}>
                <div className={styles.actionIcon}><Target size={20} /></div>
                <div className={styles.actionText}>
                  <strong>Register Team</strong>
                  <span>Join an upcoming tournament</span>
                </div>
                <ChevronRight size={16} />
              </button>
              
              <button className={styles.actionBtn} onClick={() => handleActionClick("View Telemetry")}>
                <div className={styles.actionIcon}><Timer size={20} /></div>
                <div className={styles.actionText}>
                  <strong>View Telemetry</strong>
                  <span>Analyze your latest runs</span>
                </div>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
