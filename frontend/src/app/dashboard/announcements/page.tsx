"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { Edit3, Bell } from "lucide-react";
import styles from "./announcements.module.css";
import EmptyState from "../components/ui/EmptyState";
import { useSessionProfile } from "../../../lib/hooks/useSessionProfile";
import { fetchMyOrganizationId } from "../../../lib/teamFormationApi";
import { 
  createAnnouncement, 
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

  // Real announcements only -- no invented bulletins when the org has none.
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
        authorName: author?.full_name || "Tournament Official",
        authorRole: isMgr ? "Race Director" : isSchool ? "School Staff" : "Hanbee Staff",
        authorRoleBadge: isMgr ? "badgeDirector" : isSchool ? "badgeSchool" : "badgeStaff",
        category: isSchool ? "school" : row.title.toLowerCase().includes("lipo") || row.title.toLowerCase().includes("tech") ? "technical" : "tournament",
        categoryLabel: isSchool ? "School Notice" : "Official Directive",
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
            Race Bulletins & Announcements
          </h1>
          <p className={styles.pageSubtitle}>
            Official race updates, technical regulations, and tournament directives.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "all" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All ({enrichedList.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "tournament" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("tournament")}
        >
          Tournament
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "technical" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("technical")}
        >
          Technical
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeFilter === "school" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveFilter("school")}
        >
          School
        </button>
      </div>

      {/* Publishing form for Staff & Managers */}
      {canPublish && (
        <div className={styles.publishCard}>
          <h2 className={styles.publishTitle}>
            <Edit3 size={17} color="var(--accent-subtle-text)" />
            {editingId ? "Edit Bulletin" : "Publish Official Bulletin"}
          </h2>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                <option value="student">Audience: Students Only</option>
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
        <EmptyState
          icon={<Bell size={22} />}
          title="No announcements yet"
          description="School and tournament updates will show up here as soon as they're posted."
        />
      )}
      <div className={styles.announcementsList}>
        {filteredBulletins.map((item) => {
          const initial = item.authorName.charAt(0).toUpperCase();

          return (
            <article 
              key={item.id} 
              className={styles.announcementCard}
            >
              {/* Top Meta Bar */}
              <div className={styles.cardMetaBar}>
                <div className={styles.metaLeft}>
                  <span className={styles.categoryName}>
                    {item.category === "technical" 
                      ? "Technical Regulation" 
                      : item.category === "school" 
                      ? "School Notice" 
                      : "Race Directive"}
                  </span>
                  <span className={styles.metaDot}>•</span>
                  <span className={styles.timeText}>{item.timeLabel}</span>
                </div>
              </div>

              {/* Title & Body */}
              <h2 className={styles.title}>{item.title}</h2>
              <p className={styles.bodyText}>{item.body}</p>

              {/* Card Footer: Author Signature */}
              <div className={styles.cardFooter}>
                <div className={styles.authorSignature}>
                  <div className={styles.authorAvatar}>{initial}</div>
                  <div className={styles.authorDetails}>
                    <span className={styles.authorName}>{item.authorName}</span>
                    <span className={styles.authorRole}>{item.authorRole}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
