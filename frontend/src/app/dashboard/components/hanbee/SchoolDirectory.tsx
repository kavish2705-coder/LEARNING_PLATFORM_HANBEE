"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Building2, Users, Trophy, ExternalLink } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input } from "../ui/FormField";
import Shimmer from "../ui/Shimmer";
import { useSessionProfile } from "../../../../lib/hooks/useSessionProfile";
import { fetchSchoolDirectory, fetchSchoolDirectoryCount, type SchoolDirectoryRow } from "../../../../lib/schoolAdminApi";

const PAGE_SIZE = 25;

// Debounces a value: only the last change within `delay` ms is returned,
// so typing a search query doesn't fire a network request per keystroke.
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SchoolDirectory({ detailPath }: { detailPath: string }) {
  const { data: profile } = useSessionProfile();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounced(search);
  const canView = profile?.role === "manager" || profile?.role === "staff";

  const { data: schools, isLoading, isFetching, error } = useQuery({
    queryKey: ["school-directory", debouncedSearch, page],
    queryFn: () => fetchSchoolDirectory(debouncedSearch, PAGE_SIZE, page * PAGE_SIZE),
    enabled: canView,
    placeholderData: (previous) => previous,
  });

  const { data: total } = useQuery({
    queryKey: ["school-directory-count", debouncedSearch],
    queryFn: () => fetchSchoolDirectoryCount(debouncedSearch),
    enabled: canView,
    placeholderData: (previous) => previous,
  });

  const rows: SchoolDirectoryRow[] = schools ?? [];
  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className={styles.pageHeader}><h1 className={styles.pageTitle}>Schools</h1><p className={styles.pageSubtitle}>School accounts, membership, and tournament activity</p></div>
      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load the school directory."}</p>}

      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Search schools by name…"
            aria-label="Search schools"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {isLoading ? <Shimmer rows={5} /> : (
        <div className={styles.sectionCard}>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead><tr><th>School</th><th>Status</th><th>Owner</th><th>Students</th><th>Teams</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map((school) => {
                  const isActive = school.status === "active" || school.status === "verified";
                  return (
                    <tr key={school.org_id}>
                      <td className={styles.cellHighlight}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent-subtle-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", flexShrink: 0 }}>
                            <Building2 size={18} />
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--text-main)", display: "block" }}>{school.name}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>ID: {school.org_id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isActive ? (
                          <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            ✓ Active
                          </span>
                        ) : (
                          <span style={{ padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            ● Pending
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: "var(--text-main)" }}>{school.owner_name ?? "Institutional Head"}</span>
                        <br />
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{school.owner_email}</span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text-main)" }}>
                          <Users size={14} color="var(--accent-subtle-text)" />
                          {school.students}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text-main)" }}>
                          <Trophy size={14} color="#f59e0b" />
                          {school.teams}
                        </span>
                      </td>
                      <td>
                        <Link 
                          href={`${detailPath}?id=${encodeURIComponent(school.org_id)}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: "var(--accent-subtle-bg)",
                            color: "var(--color-primary)",
                            border: "1px solid var(--accent-subtle-border)",
                            textDecoration: "none",
                            transition: "all 0.2s ease",
                          }}
                        >
                          View Details
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>{search ? "No schools match your search." : "No schools are registered yet."}</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 12 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Page {page + 1} of {totalPages} · {total} school{total === 1 ? "" : "s"}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={styles.actionBtn} disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
                <button type="button" className={styles.actionBtn} disabled={page + 1 >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
