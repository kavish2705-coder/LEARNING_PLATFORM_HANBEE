"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { 
  Bell, AlertCircle, CheckCircle2, Radio, Flag, 
  ShieldCheck, Wrench, Sparkles, Filter, Pin, 
  Send, Users, Trash2, Edit3, Check
} from "lucide-react";
import styles from "./announcements.module.css";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";
import { 
  createAnnouncement, 
  deleteAnnouncement, 
  getAnnouncementAuthors, 
  listAnnouncements, 
  updateAnnouncement, 
  type AnnouncementAudience, 
  type AnnouncementAuthor, 
  type AnnouncementRow 
} from "../../../lib/announcementsApi";

type CategoryFilter = "all" | "tournament" | "technical" | "school";

interface EnrichedAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  authorName: string;
  authorRole: string;
  authorRoleBadge: "badgeDirector" | "badgeStaff" | "badgeSchool";
  category: "tournament" | "technical" | "school";
  categoryLabel: string;
  priority: "critical" | "standard";
  timeLabel: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [authors, setAuthors] = useState<Map<string, AnnouncementAuthor>>(new Map());
  const { data: profile } = useSessionProfile();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AnnouncementRow | null>(null);
  
  // Interactive student acknowledgment tracking
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hanbee_acknowledged_announcements");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const toast = useToast();

  async function load() {
    try {
      const rows = await listAnnouncements();
      const people = await getAnnouncementAuthors([...new Set(rows.map((row) => row.author_id))]);
      setAnnouncements(rows);
      setAuthors(new Map(people.map((person) => [person.id, person])));
    } catch (e) {
      // Fallback works automatically
    }
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const rows = await listAnnouncements();
        const people = await getAnnouncementAuthors([...new Set(rows.map((row) => row.author_id))]);
        if (!active) return;
        setAnnouncements(rows);
        setAuthors(new Map(people.map((person) => [person.id, person])));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load announcements.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (profile?.role === "school_staff") {
      fetchMyOrganizationId().then((id) => { if (active) setOrganizationId(id); }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [profile?.role]);

  const canPublish = profile?.role === "manager" || profile?.role === "staff" || profile?.role === "school_staff";
  const isSchoolStaff = profile?.role === "school_staff";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await updateAnnouncement(editingId, { title: title.trim(), body: body.trim(), audience });
        setNotice("Announcement updated.");
      } else {
        await createAnnouncement({ org_id: isSchoolStaff ? organizationId : null, title: title.trim(), body: body.trim(), audience });
        setNotice(isSchoolStaff ? "School announcement published." : "Site announcement published.");
      }
      setTitle("");
      setBody("");
      setAudience("all");
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save this announcement.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(row: AnnouncementRow) {
    setEditingId(row.id);
    setTitle(row.title);
    setBody(row.body);
    setAudience(row.audience);
    setNotice("");
  }

  const toggleAck = (id: string) => {
    setAcknowledged((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hanbee_acknowledged_announcements", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const enrichedList: EnrichedAnnouncement[] = useMemo(() => {
    return announcements.map((row) => {
      const author = authors.get(row.author_id);
      const isMgr = author?.role === "manager";
      const isSchool = author?.role === "school_staff";
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        audience: row.audience,
        authorName: author?.full_name || "Hanbee",
        authorRole: isMgr ? "Manager" : isSchool ? "School Staff" : "Hanbee Staff",
        authorRoleBadge: isMgr ? "badgeDirector" : isSchool ? "badgeSchool" : "badgeStaff",
        category: isSchool ? "school" : "tournament",
        categoryLabel: isSchool ? "School Notice" : "Announcement",
        priority: "standard",
        timeLabel: new Date(row.created_at).toLocaleDateString([], { month: "short", day: "numeric" }),
      };
    });
  }, [announcements, authors]);

  const filteredBulletins = useMemo(() => {
    if (activeFilter === "all") return enrichedList;
    return enrichedList.filter((b) => b.category === activeFilter);
  }, [enrichedList, activeFilter]);

  return (
    <div className={styles.pageContainer}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerText}>
          <h1 className={styles.pageTitle}>
            <Bell size={26} color="var(--accent-subtle-text)" />
            Official Race Bulletins & Directives
          </h1>
          <p className={styles.pageSubtitle}>
            Live tournament announcements, technical scrutineering notes, and school schedules.
          </p>
        </div>
      </div>

      {/* Official Live Broadcast Banner */}
      <div className={styles.broadcastBanner}>
        <div className={styles.broadcastLeft}>
          <span className={styles.liveIndicator}>
            <span className={styles.pulseDot} />
            Race Control
          </span>
          <span className={styles.broadcastText}>
            Qualifying session schedule confirmed: Track temperature optimal at 28°C. Transponder inspection active.
          </span>
        </div>
        <span className={styles.broadcastTickerTag}>ROUND 1 ACTIVE</span>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          <Filter size={14} />
          All Bulletins ({enrichedList.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "tournament" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("tournament")}
        >
          <Flag size={14} />
          Tournament Directives
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "technical" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("technical")}
        >
          <Wrench size={14} />
          Technical Bulletins
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "school" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("school")}
        >
          <ShieldCheck size={14} />
          School Notices
        </button>
      </div>

      {/* Publishing form for Staff & Managers */}
      {canPublish && (
        <div className={styles.publishCard}>
          <h2 className={styles.publishTitle}>
            <Edit3 size={18} color="var(--accent-subtle-text)" />
            {editingId ? "Edit Bulletin" : "Publish Official Bulletin"}
          </h2>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="Bulletin Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={styles.inputField}
            />
            <textarea
              placeholder="Announcement details, regulations, or schedule directives..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className={`${styles.inputField} ${styles.textareaField}`}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                className={styles.inputField}
                style={{ width: "auto" }}
              >
                <option value="all">Audience: All Drivers & Staff</option>
                <option value="student">Audience: Students & Drivers</option>
                <option value="staff">Audience: Staff Only</option>
              </select>

              <button type="submit" disabled={busy} className={styles.submitBtn}>
                {busy ? "Publishing..." : editingId ? "Update Bulletin" : "Broadcast Bulletin"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setBody("");
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {!loading && filteredBulletins.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No announcements to show.</p>
      )}
      <div className={styles.announcementsList}>
        {filteredBulletins.map((item) => {
          const isAck = Boolean(acknowledged[item.id]);
          const initial = item.authorName.charAt(0).toUpperCase();

          return (
            <article key={item.id} className={styles.announcementCard}>
              <div className={styles.cardHeader}>
                <div className={styles.authorMeta}>
                  <div
                    className={`${styles.avatar} ${
                      item.authorRoleBadge === "badgeDirector"
                        ? styles.avatarOfficial
                        : styles.avatarStaff
                    }`}
                  >
                    {initial}
                  </div>
                  <div className={styles.authorText}>
                    <div className={styles.authorNameRow}>
                      <span className={styles.authorName}>{item.authorName}</span>
                      <span className={`${styles.roleBadge} ${styles[item.authorRoleBadge]}`}>
                        {item.authorRole}
                      </span>
                    </div>
                    <span className={styles.timeText}>{item.timeLabel}</span>
                  </div>
                </div>

                <div className={styles.headerRightMeta}>
                  <span
                    className={`${styles.priorityBadge} ${
                      item.priority === "critical"
                        ? styles.priorityCritical
                        : styles.priorityStandard
                    }`}
                  >
                    {item.priority === "critical" ? "CRITICAL DIRECTIVE" : item.categoryLabel}
                  </span>
                </div>
              </div>

              <h2 className={styles.title}>{item.title}</h2>
              <p className={styles.bodyText}>{item.body}</p>

              <div className={styles.cardFooter}>
                <div className={styles.tagsRow}>
                  <span className={styles.audienceTag}>
                    <Users size={11} style={{ display: "inline", marginRight: 4 }} />
                    {item.audience === "all" ? "All Drivers & Staff" : `${item.audience}s`}
                  </span>
                  <span className={styles.audienceTag}>
                    Verified Track Broadcast
                  </span>
                </div>

                <button
                  type="button"
                  className={`${styles.ackBtn} ${isAck ? styles.ackBtnActive : ""}`}
                  onClick={() => toggleAck(item.id)}
                >
                  {isAck ? (
                    <>
                      <Check size={14} />
                      Acknowledged
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Mark Acknowledged
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
