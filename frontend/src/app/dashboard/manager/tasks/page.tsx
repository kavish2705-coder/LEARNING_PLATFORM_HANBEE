"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { Input, Select, Textarea } from "../../components/ui/FormField";
import { authenticatedSupabaseFetch, getAccountProfile } from "../../../../lib/supabaseAuth";
import { CheckCircle2, Clock, AlertCircle, Plus, Filter, User } from "lucide-react";

type StaffMember = { id: string; full_name: string; email: string; role: string };
type Task = { 
  id: string; 
  title: string; 
  description: string; 
  priority: "low" | "medium" | "high"; 
  status: "todo" | "in_progress" | "done"; 
  due_date: string | null; 
  staff_id: string; 
  created_at: string;
};

export default function ManagerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [managerId, setManagerId] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [filterStaffId, setFilterStaffId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "manager" && profile.role !== "staff") {
      throw new Error("Only managers and staff can view operations tasks.");
    }
    setManagerId(profile.id);

    const [staffRows, taskRows] = await Promise.all([
      authenticatedSupabaseFetch<StaffMember[]>("/rest/v1/profiles?role=in.(staff,manager)&approved=eq.true&select=id,full_name,email,role&order=full_name.asc").catch(() => []),
      authenticatedSupabaseFetch<Task[]>("/rest/v1/staff_tasks?select=id,title,description,priority,status,due_date,staff_id,created_at&order=due_date.asc.nullslast,created_at.desc").catch(() => []),
    ]);

    setStaffList(staffRows || []);
    setTasks(taskRows || []);
    if (!assignedStaffId) {
      setAssignedStaffId(profile.id);
    }
  }, [assignedStaffId]);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { 
      if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tasks."); 
    }).finally(() => { 
      if (active) setLoading(false); 
    });
    return () => { active = false; };
  }, [load]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetStaffId = assignedStaffId || managerId;
    if (!targetStaffId) return;
    setSaving(true); 
    setError(""); 
    setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/staff_tasks", { 
        method: "POST", 
        headers: { Prefer: "return=minimal" }, 
        body: JSON.stringify({ 
          staff_id: targetStaffId, 
          title: title.trim(), 
          description: description.trim(), 
          due_date: dueDate || null, 
          priority, 
          status: "todo" 
        }) 
      });
      setTitle(""); 
      setDescription(""); 
      setDueDate(""); 
      setPriority("medium"); 
      setMessage("Task assigned and created successfully."); 
      await load();
    } catch (reason) { 
      setError(reason instanceof Error ? reason.message : "We couldn't save this task."); 
    } finally { 
      setSaving(false); 
    }
  }

  async function updateStatus(task: Task, status: Task["status"]) {
    setSaving(true); 
    setError(""); 
    setMessage("");
    try {
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/staff_tasks?id=eq.${encodeURIComponent(task.id)}`, { 
        method: "PATCH", 
        headers: { Prefer: "return=minimal" }, 
        body: JSON.stringify({ status }) 
      });
      setMessage(`Task “${task.title}” marked as ${status.replace("_", " ")}.`); 
      await load();
    } catch (reason) { 
      setError(reason instanceof Error ? reason.message : "We couldn't update this task."); 
    } finally { 
      setSaving(false); 
    }
  }

  const staffMap = new Map(staffList.map((s) => [s.id, s.full_name]));

  const filteredTasks = tasks.filter((t) => {
    if (filterStaffId !== "all" && t.staff_id !== filterStaffId) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const doneCount = tasks.filter(t => t.status === "done").length;

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Staff Operations & Tasks</h1>
        <p className={styles.pageSubtitle}>Assign, track, and monitor operational tasks across the team</p>
      </div>

      {error && <p role="alert" className={styles.sectionCard} style={{ marginBottom: 16 }}>{error}</p>}
      {message && <p role="status" className={styles.sectionCard} style={{ marginBottom: 16 }}>{message}</p>}

      {/* Add Task Form */}
      <form className={styles.sectionCard} onSubmit={createTask} style={{ marginBottom: 24 }}>
        <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={18} color="var(--color-primary)" />
          Assign a New Task
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 14 }}>
          <label>
            Task Title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} placeholder="e.g. Inspect Bay 3 transponder loop" />
          </label>
          <label>
            Assign To
            <Select value={assignedStaffId} onChange={(event) => setAssignedStaffId(event.target.value)}>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role})
                </option>
              ))}
              {staffList.length === 0 && <option value={managerId}>Myself</option>}
            </Select>
          </label>
          <label>
            Priority
            <Select value={priority} onChange={(event) => setPriority(event.target.value as Task["priority"])}>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </Select>
          </label>
          <label>
            Due Date
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
        <label style={{ display: "block", marginTop: 12 }}>
          Details & Notes
          <Textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} placeholder="Instructions, regulations, or safety checklists..." />
        </label>
        <button type="submit" className={styles.actionBtn} disabled={saving || !managerId} style={{ marginTop: 14 }}>
          {saving ? "Saving…" : "Assign Task"}
        </button>
      </form>

      {/* Filter and Tab Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {(["all", "todo", "in_progress", "done"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              style={{
                padding: "7px 16px",
                borderRadius: "999px",
                border: statusFilter === filter ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                background: statusFilter === filter ? "var(--accent-subtle-bg)" : "var(--bg-card)",
                color: statusFilter === filter ? "var(--color-primary)" : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {filter === "all" ? `All Tasks (${tasks.length})` : 
               filter === "todo" ? `To Do (${todoCount})` : 
               filter === "in_progress" ? `In Progress (${inProgressCount})` : 
               `Done (${doneCount})`}
            </button>
          ))}
        </div>

        {/* Staff Filter Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} color="var(--text-muted)" />
          <Select 
            value={filterStaffId} 
            onChange={(e) => setFilterStaffId(e.target.value)}
            style={{ minWidth: 180, fontSize: 13 }}
          >
            <option value="all">All Staff Members</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <p role="status" className={styles.sectionCard}>Loading operations tasks…</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredTasks.map((task) => {
            const assigneeName = staffMap.get(task.staff_id) || "Assigned Staff";
            const isHigh = task.priority === "high";
            const isMedium = task.priority === "medium";

            return (
              <article key={task.id} className={styles.sectionCard} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: isHigh ? "rgba(239, 68, 68, 0.15)" : isMedium ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)",
                          color: isHigh ? "#ef4444" : isMedium ? "#f59e0b" : "var(--text-muted)",
                          border: isHigh ? "1px solid rgba(239, 68, 68, 0.3)" : isMedium ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)",
                        }}
                      >
                        {task.priority}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <User size={12} /> {assigneeName}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 6 }}>
                          <Clock size={12} /> Due {new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h2 className={styles.sectionTitle} style={{ fontSize: 16 }}>{task.title}</h2>
                    {task.description && (
                      <p style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Status Buttons */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateStatus(task, "todo")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: 12,
                        fontWeight: 600,
                        border: task.status === "todo" ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                        background: task.status === "todo" ? "var(--accent-subtle-bg)" : "var(--bg-surface-elevated)",
                        color: task.status === "todo" ? "var(--color-primary)" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      To Do
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateStatus(task, "in_progress")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: 12,
                        fontWeight: 600,
                        border: task.status === "in_progress" ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                        background: task.status === "in_progress" ? "rgba(245, 158, 11, 0.15)" : "var(--bg-surface-elevated)",
                        color: task.status === "in_progress" ? "#f59e0b" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void updateStatus(task, "done")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: 12,
                        fontWeight: 600,
                        border: task.status === "done" ? "1px solid #10b981" : "1px solid var(--border-subtle)",
                        background: task.status === "done" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-surface-elevated)",
                        color: task.status === "done" ? "#10b981" : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      ✓ Done
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredTasks.length === 0 && (
            <section className={styles.sectionCard} style={{ textAlign: "center", padding: "32px 16px" }}>
              <p style={{ color: "var(--text-muted)" }}>No tasks match your current filter.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
