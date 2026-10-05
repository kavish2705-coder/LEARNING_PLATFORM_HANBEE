"use client";

import { PlayCircle, BookOpen, Clock, Award } from "lucide-react";
import styles from "../dashboard.module.css";
import Link from "next/link";

import { useRole } from "../../RoleContext";

export default function LearningOverview() {
  const { role } = useRole();

  if (role === "teacher") {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Instructor Dashboard</h1>
          <p className={styles.pageSubtitle}>Manage your classes and track student progress</p>
        </div>

        <div className={styles.sectionCard} style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className={styles.metricLabel}>NEEDS ATTENTION</span>
            <h2 style={{ fontSize: '24px', fontWeight: '500', marginTop: '8px', marginBottom: '8px' }}>14 Pending Assignments</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Intro to RC Telemetry & Sensors - Final Project</p>
          </div>
          <Link href="/dashboard/grading" className={styles.primaryBtn}>
            <PlayCircle size={18} /> Start Grading
          </Link>
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Active Students</span>
              <BookOpen size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>128</div>
            <div className={styles.metricSubtext}>Across 4 classes</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Avg. Score</span>
              <Award size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>86%</div>
            <div className={styles.metricSubtext}>+2.4% from last term</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Hours Taught</span>
              <Clock size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>45h</div>
            <div className={styles.metricSubtext}>This month</div>
          </div>
        </div>

        <div className={styles.dashboardGrid} style={{ marginTop: '32px' }}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Recent Submissions</h2>
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Assignment</th>
                      <th>Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={styles.cellHighlight}>Alex Rivera</td>
                      <td>Gyro Calibration Script</td>
                      <td>2 hours ago</td>
                      <td><span className={styles.statusPill} style={{ background: 'rgba(255,165,0,0.1)', color: '#ffa500' }}>Pending Grading</span></td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>Sam Chen</td>
                      <td>Telemetry Module Quiz</td>
                      <td>4 hours ago</td>
                      <td><span className={styles.statusPill} style={{ background: 'rgba(255,165,0,0.1)', color: '#ffa500' }}>Pending Grading</span></td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>Jordan Lee</td>
                      <td>Motor PID Tuning</td>
                      <td>1 day ago</td>
                      <td><span className={`${styles.statusPill} ${styles.statusSuccess}`}>Graded (95%)</span></td>
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
          <h1 className={styles.pageTitle}>Platform Analytics</h1>
          <p className={styles.pageSubtitle}>High-level learning platform metrics</p>
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Total Users</span>
              <BookOpen size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>4,250</div>
            <div className={styles.metricSubtext}>+12% this month</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Active Subscriptions</span>
              <Award size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>3,120</div>
            <div className={styles.metricSubtext}>98% retention rate</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricCardHeader}>
              <span className={styles.metricLabel}>Server Uptime</span>
              <Clock size={16} className={styles.metricIcon} />
            </div>
            <div className={styles.metricValue}>99.9%</div>
            <div className={styles.metricSubtext}>All systems operational</div>
          </div>
        </div>

        <div className={styles.dashboardGrid} style={{ marginTop: '32px' }}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Course Popularity</h2>
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Instructor</th>
                      <th>Active Students</th>
                      <th>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={styles.cellHighlight}>Intro to RC Telemetry & Sensors</td>
                      <td>James Okafor</td>
                      <td>342</td>
                      <td>84%</td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>Advanced PID Tuning</td>
                      <td>Sarah Jenkins</td>
                      <td>215</td>
                      <td>76%</td>
                    </tr>
                    <tr>
                      <td className={styles.cellHighlight}>Basics of Autonomous Navigation</td>
                      <td>Dr. Alan Turing</td>
                      <td>198</td>
                      <td>92%</td>
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
        <h1 className={styles.pageTitle}>Learning Overview</h1>
        <p className={styles.pageSubtitle}>Track your course progress and upcoming lessons</p>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          {/* Most Time-Sensitive Info: Continue Learning */}
          <div className={styles.sectionCard} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary)', color: 'var(--color-primary-text)', borderColor: 'var(--color-primary)', boxShadow: 'var(--clay-shadow-elevated)' }}>
            <div>
              <span className={styles.metricLabel} style={{ color: 'rgba(255,255,255,0.7)' }}>UP NEXT</span>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '8px', marginBottom: '8px' }}>Intro to RC Telemetry & Sensors</h2>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: 'rgba(255,255,255,0.9)' }}>Module 4: Reading Gyroscope Data</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden', width: '200px' }}>
                  <div style={{ height: '100%', width: '72%', background: '#ffffff' }}></div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>72%</span>
              </div>
            </div>
            
            <Link href="/dashboard/courses/intro-telemetry" className={styles.primaryBtn} style={{ background: '#ffffff', color: 'var(--color-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <PlayCircle size={18} /> Resume Lesson
            </Link>
          </div>

          <h2 className={styles.tableTitle} style={{ marginTop: '32px', marginBottom: '16px' }}>My Progress</h2>
          <div className={styles.metricsRow}>
            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <span className={styles.metricLabel}>Active Courses</span>
                <BookOpen size={16} className={styles.metricIcon} />
              </div>
              <div className={styles.metricValue}>3</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <span className={styles.metricLabel}>Hours Learned</span>
                <Clock size={16} className={styles.metricIcon} />
              </div>
              <div className={styles.metricValue}>24.5h</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricCardHeader}>
                <span className={styles.metricLabel}>Certificates</span>
                <Award size={16} className={styles.metricIcon} />
              </div>
              <div className={styles.metricValue}>2</div>
            </div>
          </div>
        </div>

        <div className={styles.sideColumn}>
          {/* Urgent Deadlines and Attendance side column */}
          <div className={styles.sectionCard} style={{ borderColor: 'var(--color-warning)' }}>
            <h3 className={styles.tableTitle} style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Pending Work
            </h3>
            <div style={{ marginTop: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Gyroscope Quiz</div>
                <div style={{ fontSize: '12px', color: 'var(--color-warning)' }}>Due Tomorrow</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>PID Tuning Project</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Due in 4 days</div>
              </div>
            </div>
          </div>

          <div className={styles.sectionCard} style={{ borderColor: 'var(--color-success)' }}>
            <h3 className={styles.tableTitle} style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} /> Next Live Class
            </h3>
            <div style={{ marginTop: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>Advanced Quadcopter Dynamics</div>
                <div style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: '500' }}>Today at 4:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
