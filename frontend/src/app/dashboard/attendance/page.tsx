"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import styles from "./attendance.module.css";
import Shimmer from "../components/ui/Shimmer";
import EmptyState from "../components/ui/EmptyState";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";

type Session = {
  id: string;
  login_at: string;
  last_heartbeat_at: string | null;
  ended_at: string | null;
  status: string;
};

const LIVE_WINDOW_MS = 2 * 60 * 1000;

function formatDuration(start: string, end: string | null) {
  const ms = Math.max(0, new Date(end ?? Date.now()).getTime() - new Date(start).getTime());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default function AttendancePage() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ["my-attendance"],
    queryFn: () =>
      authenticatedSupabaseFetch<Session[]>(
        "/rest/v1/auto_attendance_sessions?select=id,login_at,last_heartbeat_at,ended_at,status&order=login_at.desc&limit=30",
      ),
    refetchInterval: 60_000,
  });

  const rows = sessions ?? [];
  const latest = rows[0];
  const live = Boolean(latest && !latest.ended_at && latest.last_heartbeat_at && Date.now() - new Date(latest.last_heartbeat_at).getTime() < LIVE_WINDOW_MS);

  const hours = time.getHours() % 12 || 12;
  const ampm = time.getHours() >= 12 ? "PM" : "AM";

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Live Attendance</h1>
        <p className={styles.pageSubtitle}>Attendance is recorded automatically while you're signed in to a course</p>
      </div>

      <div className={styles.clockPanel}>
        <div className={styles.timeDisplay}>
          {hours.toString().padStart(2, "0")}<span>:</span>{time.getMinutes().toString().padStart(2, "0")}<span>:</span>{time.getSeconds().toString().padStart(2, "0")} <small>{ampm}</small>
        </div>
        <div className={styles.clockAction}>
          <div className={styles.statusIndicator}>
            <div
              className={styles.statusDot}
              style={{ backgroundColor: live ? "var(--status-online)" : "var(--text-muted)", boxShadow: live ? "0 0 10px var(--status-online)" : "none" }}
            />
            Status: {live ? "Active now" : "Not active"}
          </div>
        </div>
      </div>

      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Attendance History</h2>
        {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load your attendance."}</p>}
        {isLoading && <Shimmer rows={4} />}
        {!isLoading && !error && rows.length === 0 && (
          <EmptyState
            icon={<Clock size={22} />}
            title="No attendance recorded yet"
            description="Your session history will show up here once you clock in for the first time."
          />
        )}
        {rows.length > 0 && (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Started</th>
                <th>Last active</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.login_at).toLocaleDateString()}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{new Date(row.login_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{row.last_heartbeat_at ? new Date(row.last_heartbeat_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{formatDuration(row.login_at, row.last_heartbeat_at ?? row.ended_at)}</td>
                  <td>{row.status.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
