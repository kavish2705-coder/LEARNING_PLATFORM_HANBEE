"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import styles from "../../dashboard.module.css";
import { Input, Textarea, Select } from "../ui/FormField";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { createTournament, listTournaments, updateTournament, type TournamentRecord, type TournamentStatus } from "../../../../lib/tournamentAdminApi";
import { Trophy, Calendar, MapPin, Users, Edit3, Radio, Plus } from "lucide-react";

type TournamentForm = { title: string; description: string; startsAt: string; endsAt: string; venue: string; status: TournamentStatus };
const blank: TournamentForm = { title: "", description: "", startsAt: "", endsAt: "", venue: "", status: "upcoming" };
const localInputValue = (value: string) => {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function TournamentManager() {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<TournamentForm>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const profile = await getAccountProfile();
    if (profile.role !== "staff" && profile.role !== "manager") throw new Error("Only Hanbee staff and managers can manage tournaments.");
    setTournaments(await listTournaments());
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load tournaments."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  function edit(row: TournamentRecord) {
    setEditingId(row.id);
    setForm({ title: row.title, description: row.description, startsAt: localInputValue(row.starts_at), endsAt: localInputValue(row.ends_at), venue: row.venue, status: row.status });
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsAt = new Date(form.startsAt);
    const endsAt = new Date(form.endsAt);
    if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt < startsAt) {
      setError("Enter valid dates and make sure the tournament ends after it starts.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const common = { title: form.title.trim(), description: form.description.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), venue: form.venue.trim() };
      if (editingId) {
        const current = tournaments.find((item) => item.id === editingId);
        if (!current) throw new Error("This tournament is no longer available.");
        await updateTournament({ ...current, ...common, status: form.status });
        setNotice("Tournament updated.");
      } else {
        await createTournament(common);
        setNotice("Tournament created.");
      }
      setEditingId("");
      setForm(blank);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save this tournament.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Trophy size={22} color="var(--color-primary)" />
          Tournament Management
        </h2>
        <p className={styles.pageSubtitle}>Schedule upcoming circuit heats, set track venues, and manage tournament status.</p>
      </div>
      {error && <p role="alert" className={styles.sectionCard} style={{ marginBottom: 16 }}>{error}</p>}
      {notice && <p role="status" className={styles.sectionCard} style={{ marginBottom: 16 }}>{notice}</p>}
      
      <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 24 }}>
        <h3 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {editingId ? <Edit3 size={18} color="var(--color-primary)" /> : <Plus size={18} color="var(--color-primary)" />}
          {editingId ? "Edit Tournament Details" : "Create New Tournament Event"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
          <label>Title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={180} placeholder="e.g. National RC Championship — Stage 1" /></label>
          <label>Venue<Input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} maxLength={240} placeholder="e.g. Main Indoor Grand Prix Track" /></label>
          <label>Starts<Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label>
          <label>Ends<Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required /></label>
          {editingId && <label>Status<Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TournamentStatus })}><option value="upcoming">Upcoming</option><option value="live">Live Now</option><option value="completed">Completed</option></Select></label>}
        </div>
        <label style={{ display: "block", marginTop: 12 }}>Description & Track Rules<Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={4000} rows={3} placeholder="Circuit notes, battery voltage limits, and qualifying schedules..." style={{ display: "block", width: "100%" }} /></label>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className={styles.actionBtn} disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save Changes" : "Create Tournament"}
          </button>
          {editingId && (
            <button 
              type="button" 
              disabled={saving} 
              onClick={() => { setEditingId(""); setForm(blank); }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? <p role="status" className={styles.sectionCard}>Loading tournament list…</p> : (
        <div style={{ display: "grid", gap: 16 }}>
          {tournaments.map((row) => {
            const isLive = row.status === "live";
            const isUpcoming = row.status === "upcoming";

            return (
              <article key={row.id} className={styles.sectionCard} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span 
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "3px 10px",
                          borderRadius: 9999,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: isLive ? "rgba(16, 185, 129, 0.15)" : isUpcoming ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)",
                          color: isLive ? "#10b981" : isUpcoming ? "#f59e0b" : "var(--text-muted)",
                          border: isLive ? "1px solid rgba(16, 185, 129, 0.3)" : isUpcoming ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)",
                        }}
                      >
                        {isLive && <Radio size={12} style={{ animation: "pulse 1.5s infinite" }} />}
                        {row.status}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Users size={13} /> {row.team_size} per team
                      </span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)", margin: "4px 0" }}>{row.title}</h3>
                    
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Calendar size={13} color="var(--color-primary)" />
                        {new Date(row.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} – {new Date(row.ends_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <MapPin size={13} color="#f59e0b" />
                        {row.venue || "Venue Paddock TBA"}
                      </span>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className={styles.filterBtn} 
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
                    disabled={saving} 
                    onClick={() => edit(row)}
                  >
                    <Edit3 size={14} />
                    Edit Event
                  </button>
                </div>

                {row.description && (
                  <p style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                    {row.description}
                  </p>
                )}
              </article>
            );
          })}
          {tournaments.length === 0 && <p className={styles.sectionCard} style={{ color: "var(--text-muted)", textAlign: "center", padding: "28px 0" }}>No tournaments have been created yet.</p>}
        </div>
      )}
    </section>
  );
}
