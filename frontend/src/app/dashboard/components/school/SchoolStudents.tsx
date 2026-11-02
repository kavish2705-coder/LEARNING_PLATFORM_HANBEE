"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Users, UserPlus, Link2, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import styles from "../../dashboard.module.css";
import { Input, Textarea } from "../ui/FormField";
import Shimmer from "../ui/Shimmer";
import EmptyState from "../ui/EmptyState";
import { authenticatedSupabaseFetch } from "../../../../lib/supabaseAuth";
import type { SchoolStudentRow } from "../../../../lib/schoolAdminApi";

type Invitation = { id: string; email: string | null; username: string | null; phone: string | null; token: string; expires_at: string; accepted: boolean; revoked_at: string | null };
type InviteByUsernameResult = { username: string; phone: string | null; token: string; result: string };
type StudentsBundle = { org_id: string; join_token: string; students: SchoolStudentRow[]; invitations: Invitation[] };

async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export default function SchoolStudents() {
  const [studentSearch, setStudentSearch] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteNames, setInviteNames] = useState("");
  const [invitePhones, setInvitePhones] = useState("");
  const [generatedLinks, setGeneratedLinks] = useState<{ username: string; phone: string | null; token: string; result: string }[]>([]);
  const [showJoinLink, setShowJoinLink] = useState(false);
  const queryClient = useQueryClient();

  // One round trip for everything this page needs, instead of 3 separate
  // requests (org lookup, then join_token/students/invitations) -- see
  // school_students_bundle() (migration 0085).
  const { data: bundle, isLoading: bundleLoading, error: bundleError } = useQuery({
    queryKey: ["school-students-bundle"],
    queryFn: () => rpc<StudentsBundle>("school_students_bundle"),
  });
  const orgId = bundle?.org_id;
  const joinToken = bundle?.join_token;
  const students = bundle?.students;
  const invitations = bundle?.invitations;
  const studentsLoading = bundleLoading;
  const studentsError = bundleError;

  const invitesLoading = bundleLoading;

  const invalidateRoster = () => {
    queryClient.invalidateQueries({ queryKey: ["school-students-bundle"] });
  };

  const invite = useMutation({
    mutationFn: () => {
      const rawNames = inviteNames.split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const rawPhones = invitePhones.split(/\n+/).map((value) => value.trim());
      const seen = new Set<string>();
      const students: { username: string; phone: string }[] = [];
      rawNames.forEach((line, index) => {
        const [namePart, usernamePart] = line.split("|").map((part) => part.trim());
        let username = (usernamePart || slugifyUsername(namePart)).toLowerCase();
        if (seen.has(username)) {
          let suffix = 2;
          while (seen.has(`${username}.${suffix}`)) suffix++;
          username = `${username}.${suffix}`;
        }
        seen.add(username);
        students.push({ username, phone: rawPhones[index] ?? "" });
      });
      if (!students.length) throw new Error("Add at least one student name.");
      if (!orgId) throw new Error("No school found.");
      if (students.length > 200) throw new Error("At most 200 students per batch.");
      return rpc<InviteByUsernameResult[]>("invite_students_by_username", { p_org: orgId, p_students: students });
    },
    onSuccess: (result) => {
      setGeneratedLinks(result);
      setInviteNames("");
      setInvitePhones("");
      invalidateRoster();
    },
  });

  const revoke = useMutation({
    mutationFn: (invitation: Invitation) => rpc("revoke_invitation", { p_invitation: invitation.id }),
    onSuccess: invalidateRoster,
  });

  const rotateLink = useMutation({
    mutationFn: () => rpc<string>("rotate_school_join_link", { p_org: orgId }),
    onSuccess: invalidateRoster,
  });

  function slugifyUsername(name: string) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
    return base || "student";
  }

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students ?? [];
    return (students ?? []).filter((s) => s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query));
  }, [students, studentSearch]);

  const filteredInvitations = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase();
    const active = (invitations ?? []).filter((i) => !i.revoked_at);
    if (!query) return active;
    return active.filter((i) => (i.email ?? i.username ?? "").toLowerCase().includes(query));
  }, [invitations, inviteSearch]);

  // email is dropped from the link itself -- the signup page fetches it
  // (and the invitee's name) server-side via the token instead of carrying
  // it in plain text (0115_invite_link_privacy.sql). invite_username stays
  // inline for username-based invites since it's functionally required
  // there (there's no email to validate the account against), not just
  // display.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = (invitation: Invitation) =>
    invitation.email
      ? `${origin}/signup?invite_token=${encodeURIComponent(invitation.token)}`
      : `${origin}/signup?invite_token=${encodeURIComponent(invitation.token)}&invite_username=${encodeURIComponent(invitation.username ?? "")}`;
  const usernameInviteLink = (token: string, username: string) =>
    `${origin}/signup?invite_token=${encodeURIComponent(token)}&invite_username=${encodeURIComponent(username)}`;
  const schoolJoinUrl = typeof window !== "undefined" && joinToken ? `${window.location.origin}/dashboard/join-school?join_token=${encodeURIComponent(joinToken)}` : "";
  function waLink(link: string, phone: string) {
    const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
    const message = `Hi! You've been invited to join our school on Hanbee.\n\nTap this link to create your account:\n${link}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  const busy = invite.isPending || revoke.isPending || rotateLink.isPending;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.metricLabel}>SCHOOL PORTAL</div>
        <h1 className={styles.pageTitle}>Students</h1>
        <p className={styles.pageSubtitle}>School roster, course progress, and secure student invitations</p>
      </div>
      {(studentsError || invite.isError || revoke.isError || rotateLink.isError) && (
        <p role="alert">{[studentsError, invite.error, revoke.error, rotateLink.error].find(Boolean) instanceof Error
          ? ([studentsError, invite.error, revoke.error, rotateLink.error].find(Boolean) as Error).message
          : "Something went wrong."}</p>
      )}
      {invite.isSuccess && <p role="status">{invite.data.map((row) => `${row.username}: ${row.result.replaceAll("_", " ")}`).join(" · ")}</p>}
      {rotateLink.isSuccess && <p role="status">School join link replaced. The previous link no longer works.</p>}
      <form
        className={styles.sectionCard}
        style={{ marginBottom: 24 }}
        onSubmit={(event) => {
          event.preventDefault();
          invite.mutate();
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "var(--accent-subtle-bg)", color: "var(--accent-subtle-text)" }}>
            <UserPlus size={17} />
          </span>
          <h2 className={styles.sectionTitle}>Invite students</h2>
        </div>
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
          Enter one full name per line — a personal signup link is generated for each (only that student can use it). To set your own username, write it as <code>Full Name | username</code>.
        </p>
        <Textarea value={inviteNames} onChange={(event) => setInviteNames(event.target.value)} rows={3} maxLength={8000} style={{ width: "100%", marginTop: 12 }} placeholder={"Ravi Kumar\nAsha Devi | asha.devi"} />
        <p style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 13 }}>Optional: add a phone number per line, in the same order as the names above, to also get a WhatsApp button with that student's link.</p>
        <Textarea value={invitePhones} onChange={(event) => setInvitePhones(event.target.value)} rows={3} maxLength={4000} style={{ width: "100%", marginTop: 8 }} placeholder={"+91 98765 43210\n(leave a blank line to skip a student)"} />
        <button className={styles.primaryBtn} type="submit" disabled={busy || studentsLoading} style={{ marginTop: 12 }}>{invite.isPending ? "Generating…" : "Generate links"}</button>
        {invite.isError && (
          <p role="alert" style={{ marginTop: 10, color: "var(--color-danger)" }}>
            {invite.error instanceof Error ? invite.error.message : "Something went wrong."}
          </p>
        )}

        {generatedLinks.length > 0 && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: "var(--bg-surface-elevated)", border: "1px solid var(--border-elevated)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link2 size={15} color="var(--accent-subtle-text)" />
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Signup links</h3>
            </div>
            <p style={{ margin: "6px 0 12px", color: "var(--text-muted)", fontSize: 13 }}>
              Each link only works for the student it was generated for. Share it however you like — WhatsApp, paste into chat, etc.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {generatedLinks.map((row) => {
                const link = usernameInviteLink(row.token, row.username);
                return (
                  <div key={row.username} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
                    <span style={{ color: "var(--text-muted)", minWidth: 140 }}>{row.username}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.result.replaceAll("_", " ")}</span>
                    {row.result !== "invalid_username" && row.result !== "username_taken" && row.result !== "duplicate_in_list" && (
                      <>
                        <a href={link} target="_blank" rel="noreferrer" className={styles.secondaryAction} style={{ padding: "6px 14px", minHeight: "auto" }}>
                          Open link
                        </a>
                        {row.phone && (
                          <a href={waLink(link, row.phone)} target="_blank" rel="noreferrer" className={styles.secondaryAction} style={{ padding: "6px 14px", minHeight: "auto" }}>
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {joinToken && (
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowJoinLink((prev) => !prev)}
              className={styles.secondaryAction}
              style={{ padding: "6px 14px", minHeight: "auto" }}
            >
              <Link2 size={14} />
              {showJoinLink ? "Hide" : "Show"} school join link
              {showJoinLink ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        )}

        {joinToken && showJoinLink && (
          <div style={{ marginTop: 10, padding: 16, borderRadius: 14, background: "var(--bg-surface-elevated)", border: "1px solid var(--border-elevated)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link2 size={15} color="var(--accent-subtle-text)" />
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Your school's join link</h3>
            </div>
            <p style={{ margin: "6px 0 10px", color: "var(--text-muted)", fontSize: 12.5 }}>For a student who already has a Hanbee account (e.g. from another school) to join this one.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 12px", background: "var(--bg-input)", borderRadius: 10, overflowWrap: "anywhere" }}>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", flex: 1 }}>{schoolJoinUrl}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <a href={schoolJoinUrl} className={styles.secondaryAction} style={{ padding: "6px 14px", minHeight: "auto" }}>Existing account join page</a>
              <button className={styles.secondaryAction} style={{ padding: "6px 14px", minHeight: "auto" }} type="button" disabled={busy} onClick={() => rotateLink.mutate()}>Replace school link</button>
            </div>
            <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 12.5 }}>Replacing this link immediately invalidates copies of the previous link.</p>
          </div>
        )}
      </form>

      <section className={styles.sectionCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 className={styles.sectionTitle}>Active students ({(students ?? []).length})</h2>
          <div style={{ position: "relative", maxWidth: 260, flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students…" aria-label="Search students" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {studentsLoading ? <Shimmer rows={3} /> : (students ?? []).length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="No active students yet"
            description="Invite students using the form above, or share your school's join link so they can sign themselves up."
          />
        ) : (
          <div className={styles.tableContainer} style={{ marginTop: 14 }}>
            <table className={styles.dataTable}><thead><tr><th>Student</th><th>Team</th><th>Courses</th><th>Lessons</th><th>Progress</th><th>Last active</th></tr></thead>
              <tbody>{filteredStudents.map((student: SchoolStudentRow) => <tr key={student.student_id}><td>{student.full_name}<br /><small>{student.email}</small></td><td>{student.team_name ?? "—"}</td><td>{student.courses_enrolled}</td><td>{student.lessons_completed}/{student.lessons_total}</td><td>{student.completion_pct}%</td><td>{student.last_active ? new Date(student.last_active).toLocaleDateString() : "—"}</td></tr>)}
                {filteredStudents.length === 0 && <tr><td colSpan={6}>No students match your search.</td></tr>}</tbody>
            </table>
          </div>
        )}
      </section>
      <section className={styles.sectionCard} style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 className={styles.sectionTitle}>Student invitations</h2>
          <div style={{ position: "relative", maxWidth: 260, flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <Input value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Search invitations…" aria-label="Search invitations" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {invitesLoading ? <Shimmer rows={3} /> : <div className={styles.tableContainer} style={{ marginTop: 14 }}>
          <table className={styles.dataTable}><thead><tr><th>Email / Username</th><th>Status</th><th>Expires</th><th>Invite link</th><th>Action</th></tr></thead>
            <tbody>{filteredInvitations.map((invitation) => <tr key={invitation.id}><td>{invitation.email ?? invitation.username}</td><td><span className={`${styles.badge} ${invitation.accepted ? styles.badgeApproved : invitation.revoked_at ? styles.badgeChanges : styles.badgeProposed}`}>{invitation.accepted ? "Accepted" : invitation.revoked_at ? "Revoked" : "Pending"}</span></td><td>{new Date(invitation.expires_at).toLocaleDateString()}</td><td>{!invitation.accepted && !invitation.revoked_at && <a href={waLink(inviteUrl(invitation), invitation.phone ?? "")} target="_blank" rel="noreferrer">Share signup link</a>}</td><td>{!invitation.accepted && !invitation.revoked_at && <button type="button" className={styles.secondaryAction} style={{ padding: "6px 14px", minHeight: "auto" }} disabled={busy} onClick={() => revoke.mutate(invitation)}>Revoke</button>}</td></tr>)}
              {filteredInvitations.length === 0 && <tr><td colSpan={5}>{inviteSearch ? "No invitations match your search." : "No invitations found."}</td></tr>}</tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
