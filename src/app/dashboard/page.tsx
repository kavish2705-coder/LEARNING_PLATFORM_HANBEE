"use client";

import { motion } from "framer-motion";
import styles from "./dashboard.module.css";

const stats = [
  {
    label: "Courses Completed",
    value: "04",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    )
  },
  {
    label: "Hours Learned",
    value: "28.5",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    )
  },
  {
    label: "Current Streak",
    value: "12 Days",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"></path>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )
  }
];

export default function DashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome back, Alex.</h1>
        <p className={styles.subtitle}>Here is what&apos;s happening with your learning progress today.</p>
      </header>

      <section className={styles.grid}>
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label} 
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1, duration: 0.5 }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>{stat.icon}</div>
              {stat.label}
            </div>
            <div className={styles.value}>{stat.value}</div>
          </motion.div>
        ))}
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Continue Learning</h2>
        <div className={styles.courseList}>
          
          <motion.div 
            className={styles.courseCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className={styles.courseThumb}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div className={styles.courseInfo}>
              <h3 className={styles.courseName}>Advanced UI/UX Principles</h3>
              <p className={styles.courseInstructor}>by Sarah Drasner</p>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: "65%" }}></div>
              </div>
              <div className={styles.progressText}>65% Completed</div>
            </div>
          </motion.div>

          <motion.div 
            className={styles.courseCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className={styles.courseThumb} style={{ background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div className={styles.courseInfo}>
              <h3 className={styles.courseName}>Mastering React & Next.js</h3>
              <p className={styles.courseInstructor}>by Lee Robinson</p>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: "32%", background: "#43e97b" }}></div>
              </div>
              <div className={styles.progressText}>32% Completed</div>
            </div>
          </motion.div>

        </div>
      </section>
    </motion.div>
  );
}
