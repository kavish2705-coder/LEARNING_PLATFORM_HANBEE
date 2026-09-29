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
          <Link href="/dashboard/grading" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--clay-shadow-button)', color: 'var(--text-main)', fontWeight: '500', textDecoration: 'none' }}>
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
        
        <Link href="/dashboard/courses/intro-telemetry" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '12px 24px', borderRadius: '12px', boxShadow: 'var(--clay-shadow-button)', color: 'var(--text-main)', fontWeight: '500', textDecoration: 'none' }}>
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
