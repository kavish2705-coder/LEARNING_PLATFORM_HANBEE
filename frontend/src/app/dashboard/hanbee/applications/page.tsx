"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input } from "../../components/ui/FormField";
import Dropdown from "../../components/ui/Dropdown";
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
  const canView = profile?.role === "manager" || profile?.role === "staff";
  const queryClient = useQueryClient();

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ["course-applications", debouncedSearch],
    queryFn: () => rpc<Application[]>("list_course_applications", { p_status: ["applied", "payment_declared"], p_search: debouncedSearch || null }),
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

      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by student or course…" aria-label="Search applications" style={{ paddingLeft: 36 }} />
      </div>

      {isLoading ? <Shimmer rows={3} /> : <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.tableTitle}>Pending Applications ({list.length})</h2>
        </div>
        {list.length === 0 ? <p>{search ? "No applications match your search." : "No course applications are waiting for review."}</p> : (
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
                  return (
                    <tr key={application.id}>
                      <td>
                        <strong style={{ color: "var(--text-main)", display: "block" }}>{application.applicant_name}</strong>
                        <span style={{ fontSize: "12px" }}>{application.school_name ?? "Independent student"}</span>
                      </td>
                      <td style={{ color: "var(--text-main)", fontWeight: "500" }}>{application.course_title}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ textTransform: "capitalize" }}>{application.status.replaceAll("_", " ")}</span>
                          {application.payment_declared && <span style={{ color: "var(--color-success)", fontSize: "12px", fontWeight: "600" }}>Payment Declared</span>}
                        </div>
                      </td>
                      <td>{new Date(application.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <Dropdown
                            value={selectedSections[application.id] ?? ""}
                            onChange={(v) => setSelectedSections((current) => ({ ...current, [application.id]: v }))}
                            style={{ padding: "6px", fontSize: "12px", minWidth: "120px" }}
                            options={[{ value: "", label: "Choose a section" }, ...choices.map((section) => ({ value: section.id, label: section.name }))]}
                          />
                          <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} disabled={decide.isPending || choices.length === 0} onClick={() => decide.mutate({ application, decision: "verified" })}>{busy ? "Saving…" : "Approve"}</button>
                          <button type="button" className={styles.filterBtn} style={{ padding: "6px 12px", fontSize: "12px" }} disabled={decide.isPending} onClick={() => decide.mutate({ application, decision: "rejected" })}>Decline</button>
                        </div>
                        {choices.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: 4 }}>Create a section first.</div>}
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
