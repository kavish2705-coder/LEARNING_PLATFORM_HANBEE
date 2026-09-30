"use client";

import styles from "../../dashboard.module.css";
import { Users, UserCheck, Shield, Edit3, Trash2, Mail, Check, X } from "lucide-react";
import { useState } from "react";

export default function ManageUsersPage() {
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const users = [
    { id: "1", name: "James Okafor", role: "Teacher", email: "james.o@hanbee.edu", status: "Active" },
    { id: "2", name: "Sarah Chen", role: "Teacher", email: "sarah.c@hanbee.edu", status: "Active" },
    { id: "3", name: "Alex Rivera", role: "Student", email: "alex.r@hanbee.edu", status: "Active" },
    { id: "4", name: "Maria Garcia", role: "Student", email: "maria.g@hanbee.edu", status: "Inactive" },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>User Management</h1>
        <p className={styles.pageSubtitle}>Oversee teachers and students across the platform</p>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Total Users</span>
            <Users size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>1,284</div>
          <div className={styles.metricSubtext}>+12 this week</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Active Teachers</span>
            <Shield size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>42</div>
          <div className={styles.metricSubtext}>All departments</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Active Students</span>
            <UserCheck size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>1,150</div>
          <div className={styles.metricSubtext}>92% engagement rate</div>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Platform Users</h3>
          <div className={styles.tableFilters}>
            <button className={`${styles.filterBtn} ${styles.filterBtnActive}`}>All</button>
            <button className={styles.filterBtn}>Teachers</button>
            <button className={styles.filterBtn}>Students</button>
          </div>
        </div>

        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                </td>
                <td>
                  <span className={user.role === "Teacher" ? styles.badgeUpcoming : styles.badgeCompleted}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Mail size={14} /> {user.email}
                  </div>
                </td>
                <td>
                  <span style={{ color: user.status === "Active" ? "var(--color-success)" : "var(--text-muted)" }}>
                    {user.status}
                  </span>
                </td>
                <td>
                  {editingUser === user.id ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => setEditingUser(null)}
                        style={{ background: "var(--color-success)", color: "#fff", border: "none", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingUser(null)}
                        style={{ background: "var(--bg-card-hover)", color: "var(--text-main)", border: "none", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button 
                        onClick={() => setEditingUser(user.id)}
                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", transition: "color 0.2s" }}
                      >
                        <Edit3 size={18} />
                      </button>
                      <button style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer" }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Quick Edit Panel that slides up or appears when editing */}
      {editingUser && (
        <div style={{
          position: "fixed",
          bottom: "40px",
          right: "40px",
          width: "350px",
          background: "var(--bg-card)",
          boxShadow: "var(--clay-shadow-elevated)",
          borderRadius: "16px",
          padding: "24px",
          border: "var(--border-subtle)",
          zIndex: 100,
          animation: "fadeInUp 0.3s ease-out forwards"
        }}>
          <h3 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>Edit User Details</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Role Designation</label>
              <select style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}>
                <option>Teacher</option>
                <option>Student</option>
                <option>Manager</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Account Status</label>
              <select style={{ width: "100%", padding: "10px", background: "var(--bg-input)", border: "var(--border-subtle)", borderRadius: "8px", color: "var(--text-main)" }}>
                <option>Active</option>
                <option>Suspended</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button className={styles.primaryBtn} style={{ flex: 1, padding: "10px" }} onClick={() => setEditingUser(null)}>
              Save Changes
            </button>
            <button onClick={() => setEditingUser(null)} style={{ padding: "10px 16px", background: "var(--bg-card-hover)", border: "none", color: "var(--text-main)", borderRadius: "8px", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
