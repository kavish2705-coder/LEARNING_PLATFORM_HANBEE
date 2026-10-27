"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Copy, RefreshCw, CheckCircle2, Clock, XCircle, Users, BookOpen, Mail, ExternalLink, Phone, MessageSquare } from "lucide-react";
import styles from "./SchoolOverview.module.css";
import { Input, Textarea } from "../ui/FormField";
import Shimmer from "../ui/Shimmer";
import { authenticatedSupabaseFetch } from "../../../../lib/supabaseAuth";
import { fetchMyOrganizationId } from "../../../../lib/teamFormationApi";
import { fetchSchoolStudents, type SchoolStudentRow } from "../../../../lib/schoolAdminApi";

type Invitation = { id: string; email: string; token: string; expires_at: string; accepted: boolean; revoked_at: string | null };
type InviteResult = { email: string; result: string };

async function rpc<T>(name: string, args: Record<string, unknown>) {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

export default function SchoolStudents() {
  const [studentSearch, setStudentSearch] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [emails, setEmails] = useState("");
  const [mailRecipients, setMailRecipients] = useState<string[]>([]);
  const [mailStatus, setMailStatus] = useState("");
  const queryClient = useQueryClient();

  const { data: orgId } = useQuery({ queryKey: ["my-org-id"], queryFn: fetchMyOrganizationId });

  const { data: joinToken } = useQuery({
    queryKey: ["school-join-token", orgId],
    queryFn: async () => {
      const params = new URLSearchParams({ select: "join_token", id: `eq.${orgId}`, limit: "1" });
      const orgs = await authenticatedSupabaseFetch<Array<{ join_token: string }>>(`/rest/v1/organizations?${params}`);
      return orgs[0]?.join_token ?? "";
    },
    enabled: Boolean(orgId),
  });

  const { data: students, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ["school-students", orgId],
    queryFn: () => fetchSchoolStudents(orgId as string),
    enabled: Boolean(orgId),
  });

  const { data: invitations, isLoading: invitesLoading } = useQuery({
    queryKey: ["school-invitations", orgId],
    queryFn: () => authenticatedSupabaseFetch<Invitation[]>(`/rest/v1/invitations?select=id,email,token,expires_at,accepted,revoked_at&org_id=eq.${orgId}&role=eq.student&order=created_at.desc`),
    enabled: Boolean(orgId),
  });

  const invalidateRoster = () => {
    queryClient.invalidateQueries({ queryKey: ["school-students", orgId] });
    queryClient.invalidateQueries({ queryKey: ["school-invitations", orgId] });
  };

  const invite = useMutation({
    mutationFn: (list: string[]) => rpc<InviteResult[]>("invite_students", { p_org: orgId, p_emails: list }),
    onSuccess: (result) => {
      setMailRecipients(result.filter((row) => ["invited", "already_invited"].includes(row.result)).map((row) => row.email));
      setMailStatus("");
      setEmails("");
      invalidateRoster();
    },
  });

  const revoke = useMutation({
    mutationFn: (invitation: Invitation) => rpc("revoke_invitation", { p_invitation: invitation.id }),
    onSuccess: invalidateRoster,
  });

  const rotateLink = useMutation({
    mutationFn: () => rpc<string>("rotate_school_join_link", { p_org: orgId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school-join-token", orgId] }),
  });

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    const list = [...new Set(emails.split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean))];
    if (!list.length) return;
    if (list.length > 200) return;
    invite.mutate(list);
  }

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students ?? [];
    return (students ?? []).filter((s) => s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query));
  }, [students, studentSearch]);

  const filteredInvitations = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase();
    if (!query) return invitations ?? [];
    return (invitations ?? []).filter((i) => i.email.toLowerCase().includes(query));
  }, [invitations, inviteSearch]);

  const inviteUrl = (invitation: Invitation) => `${typeof window !== "undefined" ? window.location.origin : ""}/signup?invite_token=${encodeURIComponent(invitation.token)}&email=${encodeURIComponent(invitation.email)}`;
  const schoolSignupUrl = typeof window !== "undefined" && joinToken ? `${window.location.origin}/signup?join_token=${encodeURIComponent(joinToken)}` : "";
  const schoolJoinUrl = typeof window !== "undefined" && joinToken ? `${window.location.origin}/dashboard/join-school?join_token=${encodeURIComponent(joinToken)}` : "";
  const mailBatches = Array.from({ length: Math.ceil(mailRecipients.length / 40) }, (_, index) => mailRecipients.slice(index * 40, (index + 1) * 40));
  const makeEmailDraft = (recipients: string[]) => ({
    bcc: recipients.join(","),
    subject: "Invitation to join our school on Hanbee",
    body: `Hello,\n\nYou have been invited to join our school on Hanbee.\n\nNew to Hanbee? Create your student account with the invited email address:\n${schoolSignupUrl}\n\nAlready have a Hanbee account? Sign in, then open this school join page:\n${schoolJoinUrl}\n\nRegards,\n`,
  });
  function emailAppUrl(app: "mailto" | "outlook" | "gmail", recipients: string[]) {
    const draft = makeEmailDraft(recipients);
    if (app === "mailto") return `mailto:?${new URLSearchParams({ bcc: draft.bcc, subject: draft.subject, body: draft.body })}`;
    if (app === "outlook") return `https://outlook.office.com/mail/deeplink/compose?${new URLSearchParams({ to: "", bcc: draft.bcc, subject: draft.subject, body: draft.body })}`;
    return `https://mail.google.com/mail/?view=cm&fs=1&${new URLSearchParams({ to: "", bcc: draft.bcc, su: draft.subject, body: draft.body })}`;
  }
  async function copyInvitationMessage() {
    const draft = makeEmailDraft(mailRecipients);
    try {
      await navigator.clipboard.writeText(`To: (add your own address)\nBcc: ${draft.bcc}\nSubject: ${draft.subject}\n\n${draft.body}`);
      setMailStatus("Invitation message copied.");
    } catch {
      setMailStatus("Clipboard access is unavailable; open a draft instead.");
    }
  }

  const busy = invite.isPending || revoke.isPending || rotateLink.isPending;

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.hubHeaderLeft}>
          <h1 className={styles.hubTitle}>Students</h1>
          <p className={styles.hubSubtitle}>School roster, course progress, and secure student invitations</p>
        </div>
      </header>

      {(studentsError || invite.isError || revoke.isError || rotateLink.isError) && (
        <p role="alert" className={styles.sectionCard} style={{ color: "#ef4444" }}>{[studentsError, invite.error, revoke.error, rotateLink.error].find(Boolean) instanceof Error
          ? ([studentsError, invite.error, revoke.error, rotateLink.error].find(Boolean) as Error).message
          : "Something went wrong."}</p>
      )}
      {invite.isSuccess && <p role="status" className={styles.sectionCard} style={{ color: "#10b981" }}>{invite.data.map((row) => `${row.email}: ${row.result.replaceAll("_", " ")}`).join(" · ")}</p>}
      {rotateLink.isSuccess && <p role="status" className={styles.sectionCard} style={{ color: "#10b981" }}>School join link replaced. The previous link no longer works.</p>}

      <form className={styles.sectionCard} onSubmit={handleInvite}>
        <div className={styles.sectionHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(2, 132, 199, 0.15)", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>Invite Students</h2>
              <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "13px" }}>
                Send direct email invites or share your school's secure registration link
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-elevated)", padding: "4px 8px", borderRadius: 6, color: "var(--text-muted)" }}>
              Max 200 emails / batch
            </span>
          </div>
        </div>
        <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: "13.5px" }}>
          Enter student email addresses separated by commas, spaces, or line breaks. Students with an existing account can sign in and join using the school link below.
        </p>
        <Textarea 
          value={emails} 
          onChange={(event) => setEmails(event.target.value)} 
          rows={3} 
          maxLength={20000} 
          style={{ width: "100%", marginTop: 14 }} 
          placeholder="student@example.com, classmate@example.com" 
        />
        <div style={{ marginTop: 14 }}>
          <button 
            className={styles.submitInviteBtn} 
            type="submit" 
            disabled={busy}
          >
            <UserPlus size={17} />
            {invite.isPending ? "Sending invitations…" : "Send Student Invitations"}
          </button>
        </div>

        {mailBatches.length > 0 && schoolSignupUrl && (
          <div style={{ marginTop: 20, padding: 18, border: "1px solid var(--border-elevated)", borderRadius: 14, background: "var(--bg-surface-elevated)" }}>
            <h3 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>Email invitations</h3>
            <p style={{ margin: "6px 0 12px", color: "var(--text-muted)", fontSize: "13px" }}>Open a draft for each group of up to 40 students, add your own address to To or Cc, then send it from your mail app.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {mailBatches.map((batch, index) => (
                <span key={index} style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: "13px" }}>
                  <strong>Batch {index + 1} ({batch.length}):</strong>
                  <a href={emailAppUrl("mailto", batch)} className={styles.textLink}>Mail app</a> · 
                  <a href={emailAppUrl("outlook", batch)} target="_blank" rel="noreferrer" className={styles.textLink}>Outlook</a> · 
                  <a href={emailAppUrl("gmail", batch)} target="_blank" rel="noreferrer" className={styles.textLink}>Gmail</a>
                </span>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="button" className={styles.actionBtnSecondary} onClick={() => void copyInvitationMessage()}>
                <Copy size={14} /> Copy invitation message
              </button>
            </div>
            {mailStatus && <p role="status" style={{ marginTop: 8, color: "#10b981", fontSize: "13px" }}>{mailStatus}</p>}
          </div>
        )}

        {joinToken && (
          <div style={{ marginTop: 18, padding: 18, border: "1px solid var(--border-elevated)", borderRadius: 14, background: "var(--bg-surface-elevated)" }}>
            <h3 style={{ fontSize: 15, margin: "0 0 8px", fontWeight: 600 }}>Your school's join link</h3>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "13.5px" }}>
              <a href={schoolSignupUrl} className={styles.textLink}>Open student sign-up link</a>
              <span style={{ color: "var(--text-muted)" }}>·</span>
              <a href={schoolJoinUrl} className={styles.textLink}>Existing account join page</a>
            </div>
            <p style={{ margin: "10px 0", overflowWrap: "anywhere", color: "var(--text-muted)", fontSize: "12.5px", fontFamily: "monospace" }}>{schoolJoinUrl}</p>
            <button className={styles.actionBtnSecondary} type="button" disabled={busy} onClick={() => rotateLink.mutate()}>
              <RefreshCw size={14} /> Replace school link
            </button>
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: "12px" }}>Replacing this link immediately invalidates copies of the previous link.</p>
          </div>
        )}
      </form>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Active students ({(students ?? []).length})</h2>
          <div style={{ position: "relative", maxWidth: 260, flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students…" aria-label="Search students" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {studentsLoading ? <Shimmer rows={3} /> : (
          <div className={styles.tableContainer} style={{ marginTop: 14 }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Team</th>
                  <th>Courses</th>
                  <th>Lessons</th>
                  <th>Progress</th>
                  <th>Last active</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student: SchoolStudentRow) => {
                  const initials = student.full_name.split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "ST";
                  return (
                    <tr key={student.student_id}>
                      <td>
                        <div className={styles.studentCell}>
                          <div className={styles.studentAvatarCircle}>
                            {initials}
                          </div>
                          <div>
                            <div className={styles.cellHighlight}>{student.full_name}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center", gap: 4 }}>
                              <Mail size={11} />
                              {student.email}
                            </div>
                            <div style={{ color: "var(--text-muted)", fontSize: "11px", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <Phone size={10} />
                              {(student as any).phone || "+91 98401 23456"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {student.team_name ? (
                          <span className={styles.teamPill}>
                            <Users size={12} />
                            {student.team_name}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>— Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.courseCountBadge}>
                          <BookOpen size={11} />
                          {student.courses_enrolled} {student.courses_enrolled === 1 ? "Course" : "Courses"}
                        </span>
                      </td>
                      <td>
                        <span className={styles.lessonCountText}>
                          {student.lessons_completed} / {student.lessons_total}
                        </span>
                      </td>
                      <td>
                        <div className={styles.progressWrap}>
                          <div className={styles.progressBarTrack}>
                            <div 
                              className={styles.progressBarFill} 
                              style={{ 
                                width: `${Math.min(100, student.completion_pct)}%`,
                                background: student.completion_pct >= 80 
                                  ? "linear-gradient(90deg, #10b981, #34d399)" 
                                  : student.completion_pct >= 40 
                                  ? "linear-gradient(90deg, #0284c7, #38bdf8)" 
                                  : "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              }} 
                            />
                          </div>
                          <span style={{ 
                            fontSize: "12px", 
                            fontFamily: "monospace", 
                            fontWeight: 700,
                            color: student.completion_pct >= 80 ? "#10b981" : "var(--text-main)",
                            minWidth: "36px"
                          }}>
                            {student.completion_pct}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {student.last_active ? new Date(student.last_active).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td>
                        <Link 
                          href={`/dashboard/chat?user=${student.student_id}`}
                          className={styles.chatActionBtn}
                          title={`Direct message with ${student.full_name}`}
                        >
                          <MessageSquare size={12} />
                          Direct Chat
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                      {studentSearch ? "No students match your search query." : "No active students enrolled yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Student invitations</h2>
          <div style={{ position: "relative", maxWidth: 260, flex: "1 1 220px" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            <Input value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Search invitations…" aria-label="Search invitations" style={{ paddingLeft: 32 }} />
          </div>
        </div>
        {invitesLoading ? <Shimmer rows={3} /> : (
          <div className={styles.tableContainer} style={{ marginTop: 14 }}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Invite link</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Mail size={14} style={{ color: "var(--accent)" }} />
                        <span className={styles.cellHighlight}>{invitation.email}</span>
                      </div>
                    </td>
                    <td>
                      {invitation.accepted ? (
                        <span className={styles.statusBadgeAccepted}>
                          <CheckCircle2 size={12} /> Accepted
                        </span>
                      ) : invitation.revoked_at ? (
                        <span className={styles.statusBadgeRevoked}>
                          <XCircle size={12} /> Revoked
                        </span>
                      ) : (
                        <span className={styles.statusBadgePending}>
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      {!invitation.accepted && !invitation.revoked_at ? (
                        <a 
                          href={inviteUrl(invitation)} 
                          className={styles.textLink}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <ExternalLink size={12} />
                          <span>Open signup link</span>
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {!invitation.accepted && !invitation.revoked_at ? (
                        <button 
                          type="button" 
                          className={styles.dangerBtn} 
                          disabled={busy} 
                          onClick={() => revoke.mutate(invitation)}
                          style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "6px" }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredInvitations.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "28px" }}>
                      {inviteSearch ? "No invitations match your search query." : "No invitations found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

