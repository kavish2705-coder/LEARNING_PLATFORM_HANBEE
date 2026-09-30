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

      <div className={styles.sectionCard} style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className={styles.metricLabel}>CONTINUE LEARNING</span>
          <h2 style={{ fontSize: '24px', fontWeight: '500', marginTop: '8px', marginBottom: '8px' }}>Intro to RC Telemetry & Sensors</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Module 4: Reading Gyroscope Data</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '6px', background: 'var(--bg-card-hover)', borderRadius: '4px', overflow: 'hidden', width: '200px' }}>
              <div style={{ height: '100%', width: '72%', background: 'var(--text-main)' }}></div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>72%</span>
          </div>
        </div>
        
        <Link href="/dashboard/courses/intro-telemetry" className={styles.primaryBtn}>
          <PlayCircle size={18} /> Resume Lesson
        </Link>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Courses in Progress</span>
            <BookOpen size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>3</div>
          <div className={styles.metricSubtext}>Currently active</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Hours Learned</span>
            <Clock size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>24.5h</div>
          <div className={styles.metricSubtext}>This month</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Completed</span>
            <Award size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>2</div>
          <div className={styles.metricSubtext}>Certificates earned</div>
        </div>
      </div>
    </div>
  );
}
