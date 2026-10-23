"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Trash2, Calendar, MapPin, Clock } from "lucide-react";
import styles from "./SchoolOverview.module.css";
import { Input, Select } from "../ui/FormField";
import Shimmer from "../ui/Shimmer";
import { authenticatedSupabaseFetch, getAccountProfile, type AccountProfile } from "../../../../lib/supabaseAuth";
import { fetchMyOrganizationId } from "../../../../lib/teamFormationApi";
import { useConfirm } from "../../../../components/ui/useConfirm";

type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  location: string;
  starts_at: string;
  ends_at: string;
  section_id: string | null;
  org_id: string | null;
  owner_id: string | null;
};

type Range = "day" | "week" | "month";

function rangeStart(range: Range) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (range === "month") start.setDate(1);
  return start;
}

function rangeEnd(range: Range) {
  const end = rangeStart(range);
  if (range === "day") end.setDate(end.getDate() + 1);
  if (range === "week") end.setDate(end.getDate() + 7);
  if (range === "month") end.setMonth(end.getMonth() + 1);
  return end;
}

export default function SchoolSchedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("week");
  const [scope, setScope] = useState<"all" | "school" | "personal">("all");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [eventScope, setEventScope] = useState<"school" | "personal">("school");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const account = await getAccountProfile();
        if (active && account) setProfile(account);
      } catch {
        // Continue even if profile call fails
      }

      try {
        const orgId = await fetchMyOrganizationId();
        if (active) setOrganizationId(orgId);
      } catch {
        // Org ID is optional for personal events
      }

      try {
        const rows = await authenticatedSupabaseFetch<CalendarEvent[]>(
          "/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id,org_id,owner_id&order=starts_at.asc"
        );
        if (active) setEvents(rows ?? []);
      } catch (reason: unknown) {
        if (active) setError(reason instanceof Error ? reason.message : "We couldn't load the school schedule.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const start = rangeStart(range);
    const end = rangeEnd(range);
    return events.filter((event) => {
      const at = new Date(event.starts_at);
      const inScope = scope === "all" || (scope === "school" ? Boolean(event.org_id) : event.owner_id === profile?.id);
      return inScope && at >= start && at < end;
    });
  }, [events, profile?.id, range, scope]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    let currentProfile = profile;
    if (!currentProfile) {
      currentProfile = await getAccountProfile().catch(() => null);
      if (currentProfile) setProfile(currentProfile);
    }

    if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
      setError("Choose an end time later than the start time.");
      return;
    }

    if (eventScope === "school" && !organizationId) {
      setError("Your account is not linked to an active school.");
      return;
    }

    setSaving(true);
    try {
      await authenticatedSupabaseFetch<unknown>("/rest/v1/calendar_events", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          title: title.trim(),
          event_type: "other",
          location: location.trim(),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          org_id: eventScope === "school" ? organizationId : null,
          owner_id: eventScope === "personal" ? currentProfile?.id ?? null : null,
        }),
      });

      const rows = await authenticatedSupabaseFetch<CalendarEvent[]>(
        "/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id,org_id,owner_id&order=starts_at.asc"
      );
      setEvents(rows ?? []);
      setTitle("");
      setLocation("");
      setStartsAt("");
      setEndsAt("");
      setNotice(`${eventScope === "school" ? "School" : "Personal"} event added to your schedule.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't create this event.");
    } finally {
      setSaving(false);
    }
  }

  const { ask, dialog } = useConfirm();

  function canDelete(item: CalendarEvent) {
    return item.owner_id === profile?.id || (Boolean(item.org_id) && item.org_id === organizationId);
  }

  async function deleteEvent(item: CalendarEvent) {
    if (
      !(await ask({
        title: "Delete this event?",
        message: `"${item.title}" will be removed. This can't be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setNotice("");
    try {
      await authenticatedSupabaseFetch<unknown>(`/rest/v1/calendar_events?id=eq.${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      const rows = await authenticatedSupabaseFetch<CalendarEvent[]>(
        "/rest/v1/calendar_events?select=id,title,event_type,location,starts_at,ends_at,section_id,org_id,owner_id&order=starts_at.asc"
      );
      setEvents(rows ?? []);
      setNotice("Event deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't delete this event.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div>
      {dialog}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>School Schedule</h1>
        <p className={styles.pageSubtitle}>Plan school events and see your personal calendar together</p>
      </div>

      {error && <p role="alert" style={{ marginBottom: 12, color: "#ef4444" }}>{error}</p>}
      {notice && <p role="status" style={{ marginBottom: 12, color: "#10b981" }}>{notice}</p>}

      <form className={styles.sectionCard} onSubmit={createEvent} style={{ marginBottom: 24 }}>
        <h2 className={styles.sectionTitle}>Add an event</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
              placeholder="e.g. Aerodynamics Workshop"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            Calendar
            <Select
              value={eventScope}
              onChange={(event) => setEventScope(event.target.value as "school" | "personal")}
            >
              <option value="school">School</option>
              <option value="personal">Personal</option>
            </Select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            Location
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={200}
              placeholder="e.g. Lab 3 / Online"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            Starts
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            Ends
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </label>
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-start" }}>
          <button
            type="submit"
            className={styles.submitScheduleBtn}
            disabled={saving}
            id="add-to-schedule-btn"
          >
            <CalendarPlus size={18} />
            <span>{saving ? "Saving…" : "Add to schedule"}</span>
          </button>
        </div>
      </form>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Calendar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Select
              aria-label="Calendar view"
              value={range}
              onChange={(event) => setRange(event.target.value as Range)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </Select>
            <Select
              aria-label="Calendar scope"
              value={scope}
              onChange={(event) => setScope(event.target.value as typeof scope)}
            >
              <option value="all">School and personal</option>
              <option value="school">School only</option>
              <option value="personal">Personal only</option>
            </Select>
          </div>
        </div>

        {loading ? (
          <Shimmer rows={4} />
        ) : (
          visibleEvents.map((item) => (
            <article
              key={item.id}
              style={{
                padding: "16px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>{item.title}</h3>
                  <p style={{ color: "var(--text-muted)", marginTop: 4, fontSize: "13px" }}>
                    {item.org_id ? "School event" : "Personal event"}
                    {item.location && ` · ${item.location}`}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <time dateTime={item.starts_at} style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    {new Date(item.starts_at).toLocaleString()} – {new Date(item.ends_at).toLocaleTimeString()}
                  </time>
                  {canDelete(item) && (
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={deletingId === item.id}
                      onClick={() => void deleteEvent(item)}
                    >
                      <Trash2 size={13} />
                      {deletingId === item.id ? "Deleting…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}

        {!loading && visibleEvents.length === 0 && (
          <p style={{ marginTop: 14, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
            No events in this calendar range.
          </p>
        )}
      </section>
    </div>
  );
}
