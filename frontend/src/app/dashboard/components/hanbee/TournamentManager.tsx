"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "../../dashboard.module.css";
import { Input, Textarea } from "../ui/FormField";
import Dropdown from "../ui/Dropdown";
import { getAccountProfile } from "../../../../lib/supabaseAuth";
import { createTournament, listTournaments, updateTournament, type TournamentRecord, type TournamentStatus } from "../../../../lib/tournamentAdminApi";
import { fetchPaymentSettings, updatePaymentSettings, uploadPaymentQr, type PaymentSettings } from "../../../../lib/teamFormationApi";

// Shared across every tournament (an editable account -- so staff can swap
// it if it ever fails -- not a per-tournament setting); the entry fee
// amount is what actually varies per tournament and lives on the
// tournament form below instead.
function PaymentSettingsCard() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [upiId, setUpiId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetchPaymentSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setUpiId(data.upi_id);
        setInstructions(data.instructions);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load payment settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updatePaymentSettings({ upi_id: upiId.trim(), instructions: instructions.trim() });
      setSettings((current) => current && { ...current, upi_id: upiId.trim(), instructions: instructions.trim() });
      setNotice("Payment details saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save payment details.");
    } finally {
      setSaving(false);
    }
  }

  async function handleQrUpload(file: File) {
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const url = await uploadPaymentQr(file);
      await updatePaymentSettings({ qr_image_url: url });
      setSettings((current) => current && { ...current, qr_image_url: url });
      setNotice("QR code updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't upload the QR code.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) return <p role="status" className={styles.sectionCard} style={{ marginBottom: 20 }}>Loading payment settings…</p>;

  return (
    <div className={styles.sectionCard} style={{ marginBottom: 20 }}>
      <h3 className={styles.tableTitle}>Payment settings</h3>
      <p style={{ color: "var(--text-muted)", marginTop: 4, marginBottom: 10 }}>
        The entry fee amount is set per tournament below.
      </p>
      <p role="alert" style={{ color: "var(--color-warning)", background: "var(--accent-subtle-bg)", border: "1px solid var(--color-warning)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13.5 }}>
        The UPI ID and QR code saved here are <strong>not</strong> what students actually pay to. The live checkout always uses the server&apos;s <code>UPI_VPA</code> environment variable, which this form never reads or writes. To change where real payments are routed, update <code>UPI_VPA</code> in the deployment environment directly, not here.
      </p>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {settings?.qr_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- payment-assets is a public Supabase Storage bucket, not a Next-optimizable local/remote image source worth configuring
            <img src={settings.qr_image_url} alt="Current payment QR code" style={{ width: 140, height: 140, borderRadius: 10, border: "1px solid var(--border-subtle)", objectFit: "contain", background: "#fff" }} />
          ) : (
            <div style={{ width: 140, height: 140, borderRadius: 10, border: "1px dashed var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 8 }}>
              No QR uploaded yet
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleQrUpload(file); }}
            style={{ fontSize: 12 }}
          />
          {uploading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Uploading…</span>}
        </div>

        <form onSubmit={saveText} style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label>UPI ID<Input value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="e.g. hanbee@upi" maxLength={100} /></label>
          <label>Instructions<Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={500} rows={3} placeholder="e.g. Pay the tournament entry fee and enter the transaction ID below." style={{ display: "block", width: "100%" }} /></label>
          <button type="submit" className={styles.primaryBtn} disabled={saving} style={{ alignSelf: "flex-start" }}>{saving ? "Saving…" : "Save payment details"}</button>
        </form>
      </div>
    </div>
  );
}

type TournamentForm = { title: string; description: string; startsAt: string; endsAt: string; venue: string; status: TournamentStatus; entryFeeAmount: string };
const blank: TournamentForm = { title: "", description: "", startsAt: "", endsAt: "", venue: "", status: "upcoming", entryFeeAmount: "" };
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
    setForm({ title: row.title, description: row.description, startsAt: localInputValue(row.starts_at), endsAt: localInputValue(row.ends_at), venue: row.venue, status: row.status, entryFeeAmount: row.entry_fee_amount != null ? String(row.entry_fee_amount) : "" });
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
    const trimmedFee = form.entryFeeAmount.trim();
    const entryFeeAmount = trimmedFee === "" ? null : Number(trimmedFee);
    if (entryFeeAmount !== null && (Number.isNaN(entryFeeAmount) || entryFeeAmount < 0)) {
      setError("Entry fee must be a positive number, or left blank.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const common = { title: form.title.trim(), description: form.description.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), venue: form.venue.trim(), entry_fee_amount: entryFeeAmount };
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
    <section>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Tournament management</h2>
        <p className={styles.pageSubtitle}>Create the next event and manage event dates and status.</p>
      </div>
      {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <PaymentSettingsCard />
      <form className={styles.sectionCard} onSubmit={submit} style={{ marginBottom: 20 }}>
        <h3 className={styles.tableTitle}>{editingId ? "Edit tournament" : "Create tournament"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
          <label>Title<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={180} /></label>
          <label>Venue<Input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} maxLength={240} /></label>
          <label>Starts<Input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></label>
          <label>Ends<Input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required /></label>
          <label>Entry fee (₹)<Input type="number" min="0" step="0.01" value={form.entryFeeAmount} onChange={(event) => setForm({ ...form, entryFeeAmount: event.target.value })} placeholder="e.g. 500" /></label>
          {editingId && <label>Status<Dropdown value={form.status} onChange={(v) => setForm({ ...form, status: v as TournamentStatus })} options={[{ value: "upcoming", label: "Upcoming" }, { value: "live", label: "Live" }, { value: "completed", label: "Completed" }]} style={{ minWidth: 0 }} /></label>}
        </div>
        <label style={{ display: "block", marginTop: 12 }}>Description<Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={4000} rows={3} style={{ display: "block", width: "100%" }} /></label>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>{saving ? "Saving…" : editingId ? "Save tournament" : "Create tournament"}</button>
          {editingId && <button type="button" className={styles.filterBtn} disabled={saving} onClick={() => { setEditingId(""); setForm(blank); }}>Cancel</button>}
        </div>
      </form>
      {loading ? <p role="status" className={styles.sectionCard}>Loading tournament list…</p> : tournaments.length === 0 ? (
        <div className={styles.sectionCard} style={{ textAlign: "center", padding: "32px 20px", color: "var(--text-muted)" }}>
          No tournaments have been created yet. Use the form above to schedule the next one.
        </div>
      ) : <div style={{ display: "grid", gap: 12 }}>
        {tournaments.map((row) => <article key={row.id} className={styles.sectionCard}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 className={styles.tableTitle}>{row.title}</h3>
              <p style={{ color: "var(--text-muted)" }}>{new Date(row.starts_at).toLocaleString()} – {new Date(row.ends_at).toLocaleString()}</p>
              <p>{row.venue || "Venue not set"} · {row.team_size} per team · {row.status} · {row.entry_fee_amount != null ? `₹${row.entry_fee_amount} entry fee` : "entry fee not set"}</p>
            </div>
            <button type="button" className={styles.filterBtn} disabled={saving} onClick={() => edit(row)}>Edit</button>
          </div>
          {row.description && <p style={{ marginTop: 10 }}>{row.description}</p>}
        </article>)}
      </div>}
    </section>
  );
}
