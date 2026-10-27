"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../../../../dashboard.module.css";
import { useConfirm } from "../../../../../../components/ui/useConfirm";
import { fetchLessonMaterials, uploadLessonAttachment, deleteLessonAttachment, type LessonMaterial } from "../../../../../../lib/coursesApi";

export default function AttachmentManager({ lessonId }: { lessonId: string }) {
  const { ask, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setMaterials(await fetchLessonMaterials(lessonId));
  }, [lessonId]);

  useEffect(() => {
    if (!open) return;
    void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Couldn't load attachments."));
  }, [open, load]);

  async function handleUpload(file: File) {
    setBusy(true);
    setError("");
    try {
      await uploadLessonAttachment(lessonId, file);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(material: LessonMaterial) {
    if (!(await ask({ title: "Remove attachment?", message: `Delete "${material.fileName}" for every student?` }))) return;
    setBusy(true);
    try {
      await deleteLessonAttachment(material.id, material.storagePath);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {dialog}
      <button type="button" className={styles.actionBtn} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide attachments" : "Attachments"}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: 12, background: "var(--bg-card)", borderRadius: 10, display: "grid", gap: 8 }}>
          {error && <p style={{ color: "var(--color-danger, #e11d48)", fontSize: 13 }}>{error}</p>}
          {materials.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No attachments yet.</p>}
          {materials.map((material) => (
            <div key={material.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 }}>
              <span>{material.fileName}</span>
              <button type="button" className={styles.actionBtn} disabled={busy} onClick={() => void handleDelete(material)}>Delete</button>
            </div>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>
      )}
    </div>
  );
}
