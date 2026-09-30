"use client";

import styles from "../../dashboard.module.css";
import { Plus, BookOpen, Clock, Users, Edit3, X } from "lucide-react";
import { useState } from "react";

export default function ManageCoursesPage() {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div>
      <div className={styles.pageHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className={styles.pageTitle}>Course Management</h1>
          <p className={styles.pageSubtitle}>Create and schedule courses for students</p>
        </div>
        {!showAddForm && (
          <button className={styles.primaryBtn} onClick={() => setShowAddForm(true)}>
            <Plus size={18} />
            Add New Course
          </button>
        )}
      </div>

      {showAddForm && (
        <div className={styles.sectionCard} style={{ marginBottom: "32px", border: "2px solid var(--color-primary)", position: "relative" }}>
          <button 
            onClick={() => setShowAddForm(false)}
            style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
          
          <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "24px" }}>Deploy a New Course</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Course Name</label>
                <input type="text" placeholder="e.g. Advanced FPV Drone Racing" style={{ width: "100%", padding: "12px", background: "var(--bg-input)", border: "var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Schedule / Timings</label>
                <input type="text" placeholder="e.g. Mon & Wed, 14:00 - 16:00" style={{ width: "100%", padding: "12px", background: "var(--bg-input)", border: "var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }} />
              </div>
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>Assign to Team / Group</label>
              <select style={{ width: "100%", padding: "12px", background: "var(--bg-input)", border: "var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}>
                <option>All Students</option>
                <option>Team Apex</option>
                <option>Team Velocity</option>
              </select>
            </div>

            <button className={styles.primaryBtn} style={{ alignSelf: "flex-start", marginTop: "8px" }} onClick={() => setShowAddForm(false)}>
              Publish Course
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Active Courses</h3>
        </div>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Schedule</th>
              <th>Enrolled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", padding: "10px", borderRadius: "8px" }}>
                    <BookOpen size={18} />
                  </div>
                  <strong>Aerodynamics 101</strong>
                </div>
              </td>
              <td>Tue/Thu 10:00 AM</td>
              <td>24 Students</td>
              <td>
                <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><Edit3 size={18} /></button>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "10px", borderRadius: "8px" }}>
                    <Clock size={18} />
                  </div>
                  <strong>Reflex & Reaction Time</strong>
                </div>
              </td>
              <td>Mon/Wed 09:00 AM</td>
              <td>18 Students</td>
              <td>
                <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><Edit3 size={18} /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
