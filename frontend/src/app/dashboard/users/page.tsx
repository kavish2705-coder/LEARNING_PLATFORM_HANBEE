"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "../dashboard.module.css";
import Shimmer from "../components/ui/Shimmer";
import { useConfirm } from "../../../components/ui/useConfirm";
import { useToast } from "../../../components/ui/Toast";
import { authenticatedSupabaseFetch } from "../../../lib/supabaseAuth";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  approved: boolean;
  account_status: "active" | "suspended" | "revoked";
};

const ROLES = ["all", "student", "school_staff", "staff", "manager"] as const;

async function setStatus(userId: string, status: "active" | "suspended", reason: string) {
  return authenticatedSupabaseFetch("/rest/v1/rpc/set_account_status", {
    method: "POST",
    body: JSON.stringify({ p_user: userId, p_status: status, p_reason: reason }),
  });
}

export default function UsersPage() {
  const { data: me } = useSessionProfile();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { ask, dialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("all");
  const [busyId, setBusyId] = useState("");

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      authenticatedSupabaseFetch<UserRow[]>(
        "/rest/v1/profiles?select=id,email,full_name,role,approved,account_status&order=full_name.asc",
      ),
    enabled: me?.role === "staff" || me?.role === "manager",
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((user) =>
      (role === "all" || user.role === role) &&
      (!q || user.full_name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)),
    );
  }, [users, search, role]);

  async function change(user: UserRow, next: "active" | "suspended") {
    const verb = next === "suspended" ? "Suspend" : "Restore";
    const ok = await ask({
      title: `${verb} this account?`,
      message: `${verb} ${user.full_name} (${user.email})?`,
      confirmLabel: verb,
      tone: next === "suspended" ? "danger" : "primary",
    });
    if (!ok) return;
    setBusyId(user.id);
    try {
      await setStatus(user.id, next, `${verb} from user management`);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${user.full_name} is now ${next}.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "We couldn't change this account.");
    } finally {
      setBusyId("");
    }
  }

  if (me && me.role !== "staff" && me.role !== "manager") {
    return <p role="alert">Only Hanbee staff and the manager can manage users.</p>;
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>User Management</h1>
        <p className={styles.pageSubtitle}>Find accounts and suspend or restore access</p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <input
          type="search"
          placeholder="Search name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search users"
          style={{ minWidth: 240 }}
        />
        <select value={role} onChange={(event) => setRole(event.target.value as (typeof ROLES)[number])} aria-label="Filter by role">
          {ROLES.map((item) => <option key={item} value={item}>{item === "all" ? "All roles" : item.replace("_", " ")}</option>)}
        </select>
      </div>

      {error && <p role="alert">{error instanceof Error ? error.message : "We couldn't load users."}</p>}
      {isLoading && <Shimmer rows={5} />}
      {!isLoading && !error && visible.length === 0 && <p>No users match this search.</p>}

      {visible.length > 0 && (
        <table className={styles.dataTable ?? undefined} style={{ width: "100%" }}>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>{user.role.replace("_", " ")}</td>
                <td>{user.account_status}</td>
                <td>
                  {user.account_status === "active" ? (
                    <button type="button" disabled={busyId === user.id || user.id === me?.id} onClick={() => void change(user, "suspended")}>Suspend</button>
                  ) : (
                    <button type="button" disabled={busyId === user.id} onClick={() => void change(user, "active")}>Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {dialog}
    </div>
  );
}
