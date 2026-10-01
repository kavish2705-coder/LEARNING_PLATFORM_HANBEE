"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { Clock, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";

type AttendanceDay = { work_date: string; status: string; clock_in: string | null; clock_out: string | null; hours: number | null };
type StaffTask = { id: string; title: string; priority: string; status: string; due_date: string | null; done: boolean };
interface HanbeeData {
  status: string;
  hoursWorked: { today: number; last7Days: number[]; totalHours: number };
  personalTasks: { id: string; title: string; priority: string; status: string; dueDate: string | null }[];
  needsAttention: { id: string; message: string }[];
}

export default function HanbeeOverview() {
  const [data, setData] = useState<HanbeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" || !profile) throw new Error("My Space is available to approved Hanbee staff.");
    const taskQuery = new URLSearchParams({ select: "id,title,priority,status,due_date,done", staff_id: `eq.${profile.id}`, order: "due_date.asc.nullslast" });
    const [attendance, tasks] = await Promise.all([
      authenticatedSupabaseFetch<AttendanceDay[]>("/rest/v1/rpc/staff_attendance", { method: "POST", body: JSON.stringify({}) }),
      authenticatedSupabaseFetch<StaffTask[]>("/rest/v1/staff_tasks?" + taskQuery.toString()),
    ]);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const today = attendance.find((row) => row.work_date === todayKey);
    const weekAgo = new Date(now);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
    const weekRows = attendance.filter((row) => row.work_date >= weekAgo.toISOString().slice(0, 10) && row.work_date <= todayKey);
    const weeklyHours = weekRows.reduce((sum, row) => sum + (row.hours ?? 0), 0);
    const last7Days = Array.from({ length: 7 }, () => 0);
    for (const row of weekRows) {
      const weekday = new Date(row.work_date + "T00:00:00").getDay();
      last7Days[(weekday + 6) % 7] = row.hours ?? 0;
    }
    const mappedTasks = tasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, status: task.status, dueDate: task.due_date }));
    const attention = tasks.find((task) => !task.done && task.priority === "high") ?? tasks.find((task) => !task.done && task.due_date && task.due_date < todayKey);
    setData({
      status: today?.clock_in && !today.clock_out ? "Clocked In" : "Clocked Out",
      hoursWorked: { today: today?.hours ?? 0, last7Days, totalHours: weeklyHours },
      personalTasks: mappedTasks,
      needsAttention: attention ? [{ id: attention.id, message: attention.title }] : [],
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async (initial: boolean) => {
      if (initial) setLoading(true);
      setError(null);
      try { await fetchData(); }
      catch (reason) { if (mounted) setError(reason instanceof Error ? reason.message : "We couldn't load your Hanbee workspace."); }
      finally { if (mounted && initial) setLoading(false); }
    };
    void load(true);
    const interval = setInterval(() => { void load(false); }, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [fetchData]);

  if (loading) return <div className={styles.sectionCard}>Loading Hanbee Overview...</div>;
  if (error) return <div className={styles.sectionCard}>{error}</div>;
  if (!data) return <div className={styles.sectionCard}>No data available</div>;

  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Space</h1>
        <p className={styles.pageSubtitle}>Your personal dashboard and activity overview</p>
      </header>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Time Tracking (Today)</span>
            <Clock size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>{data.hoursWorked.today}h</div>
          <div className={styles.metricSubtext}>Target: 8h / day</div>
          <div className={styles.sparkline}>
            <div className={styles.bar} style={{ height: "100%", width: Math.min((data.hoursWorked.today / 8) * 100, 100) + "%", backgroundColor: "var(--text-main)", borderRadius: "2px", opacity: 1 }}></div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Total Hours (7d)</span>
            <TrendingUp size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue}>{data.hoursWorked.totalHours}h</div>
          <div className={styles.metricSubtext}>Last 7 days</div>
          <div className={styles.sparkline}>
            {data.hoursWorked.last7Days.map((hours, index) => (
              <div key={index} className={styles.bar} style={{ height: (Math.min((hours / 8) * 100, 100) || 5) + "%", "--bar-color": "var(--text-muted)" } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricCardHeader}>
            <span className={styles.metricLabel}>Current Status</span>
            <AlertTriangle size={16} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValue} style={{ fontSize: "20px", marginTop: "8px" }}>
             {data.status}
          </div>
          <div className={styles.metricSubtext}>
             {data.needsAttention.length > 0 ? "Needs Attention: " + data.needsAttention[0].message : "All caught up"}
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.tableTitle}>Personal Tasks</h2>
            </div>
            
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.personalTasks.map((task) => (
                    <tr key={task.id}>
                      <td style={{ color: "var(--text-main)", fontWeight: 500 }}>{task.title}</td>
                      <td><span className={styles.badge + " " + styles.badgeSolo}>{task.priority}</span></td>
                      <td>
                        <span className={styles.badge + " " + (task.status === "done" ? styles.badgeCompleted : styles.badgeUpcoming)}>
                          {task.status === "done" ? "Completed" : task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                  {data.personalTasks.length === 0 && (
                    <tr><td colSpan={4}>No personal tasks assigned</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
