"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input, Select } from "../../components/ui/FormField";
import Shimmer from "../../components/ui/Shimmer";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";
import { authenticatedSupabaseFetch } from "../../../../lib/supabaseAuth";

type Application = { id: string; course_id: string; course_title: string; applicant_id: string; applicant_name: string; school_name: string | null; status: string; payment_declared: boolean; created_at: string };
type Section = { id: string; course_id: string; name: string };

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const rpc = <T,>(name: string, args: Record<string, unknown> = {}) =>
  authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

export default function HanbeeApplicationsPage() {
  const { data: profile } = useSessionProfile();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "all">("pending");
  const canView = profile?.role === "manager" || profile?.role === "staff";
  const queryClient = useQueryClient();

  const statusArray = statusFilter === "pending"
    ? ["applied", "payment_declared"]
    : statusFilter === "approved"
    ? ["verified"]
    : ["applied", "payment_declared", "verified", "rejected"];

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ["course-applications", debouncedSearch, statusFilter],
    queryFn: () => rpc<Application[]>("list_course_applications", { p_status: statusArray, p_search: debouncedSearch || null }),
    enabled: canView,
    placeholderData: (previous) => previous,
  });
  const { data: sections } = useQuery({
    queryKey: ["course-sections"],
    queryFn: () => authenticatedSupabaseFetch<Section[]>("/rest/v1/sections?select=id,course_id,name&order=name.asc"),
    enabled: canView,
  });

  const decide = useMutation({
    mutationFn: ({ application, decision }: { application: Application; decision: "verified" | "rejected" }) => {
      const sectionId = selectedSections[application.id];
      return rpc("decide_course_application", { p_application: application.id, p_decision: decision, p_section: decision === "verified" ? sectionId : null });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-applications"] }),
  });

  const list = applications ?? [];
  const sectionList = sections ?? [];

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Course Applications</h1><p className={styles.pageSubtitle}>Review course requests and enroll students into a section</p></div>
      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load course applications."}</p>}
      {decide.isError && <p role="alert">{decide.error instanceof Error ? decide.error.message : "We couldn't decide this application."}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 320, flex: "1 1 240px" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student or course…" aria-label="Search applications" style={{ paddingLeft: 36 }} />
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {(["pending", "approved", "all"] as const).map((filter) => (
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
              {filter === "pending" ? "Pending Review" : filter === "approved" ? "Approved / Enrolled" : "All Applications"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Shimmer rows={3} /> : <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.tableTitle}>
            {statusFilter === "pending" ? "Pending Applications" : statusFilter === "approved" ? "Approved & Enrolled Students" : "All Course Applications"} ({list.length})
          </h2>
        </div>
        {list.length === 0 ? <p>{search ? "No applications match your search." : `No ${statusFilter} applications found.`}</p> : (
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Course</th>
                  <th>Status & Payment</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((application) => {
                  const choices = sectionList.filter((section) => section.course_id === application.course_id);
                  const busy = decide.isPending && decide.variables?.application.id === application.id;
                  const isDone = application.status === "verified" || application.status === "rejected";
                  return (
                    <tr key={application.id}>
                      <td>
                        <strong style={{ color: "var(--text-main)", display: "block" }}>{application.applicant_name}</strong>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{application.school_name ?? "Independent student"}</span>
                      </td>
                      <td style={{ color: "var(--text-main)", fontWeight: "500" }}>{application.course_title}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ 
                            textTransform: "capitalize",
                            fontWeight: 600,
                            color: application.status === "verified" ? "#10b981" : application.status === "rejected" ? "#ef4444" : "var(--text-main)"
                          }}>
                            {application.status.replaceAll("_", " ")}
                          </span>
                          {application.payment_declared && <span style={{ color: "var(--color-success)", fontSize: "12px", fontWeight: "600" }}>✓ Payment Declared</span>}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>{new Date(application.created_at).toLocaleDateString()}</td>
                      <td>
                        {isDone ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: application.status === "verified" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.12)",
                            color: application.status === "verified" ? "#10b981" : "#ef4444",
                          }}>
                            {application.status === "verified" ? "✓ Enrolled" : "✕ Declined"}
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <Select 
                              value={selectedSections[application.id] ?? ""} 
                              onChange={(event) => setSelectedSections((current) => ({ ...current, [application.id]: event.target.value }))}
                              style={{ padding: "6px", fontSize: "12px", minWidth: "120px" }}
                            >
                              <option value="">Choose a section</option>
                              {choices.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                            </Select>
                            <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} disabled={decide.isPending || choices.length === 0} onClick={() => decide.mutate({ application, decision: "verified" })}>{busy ? "Saving…" : "Approve"}</button>
                            <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} disabled={decide.isPending} onClick={() => decide.mutate({ application, decision: "rejected" })}>Decline</button>
                          </div>
                        )}
                        {!isDone && choices.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: 4 }}>Create a section first.</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>}
    </div>
  );
}
