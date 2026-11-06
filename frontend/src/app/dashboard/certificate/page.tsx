"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import styles from "../dashboard.module.css";
import { fetchMyCertificates, type StudentCertificate } from "../../../lib/certificatesApi";

export default function CertificatePage() {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyCertificates()
      .then((rows) => { if (active) setCertificates(rows); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "We couldn't load your certificates."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Certificates</h1>
        <p className={styles.pageSubtitle}>Certificates issued for completed courses on Hanbee</p>
      </div>

      {error && <p role="alert" className={styles.sectionCard} style={{ color: "var(--color-danger)" }}>{error}</p>}
      {loading && (
        <div className={styles.sectionCard} style={{ textAlign: "center", padding: "40px" }}>
          <p role="status" style={{ color: "var(--text-muted)", margin: 0 }}>Loading your certificates…</p>
        </div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <section className={styles.sectionCard} style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "rgba(8, 145, 178, 0.12)", color: "var(--color-primary)", marginBottom: 12 }}>
            <Award size={32} aria-hidden="true" />
          </div>
          <h2 className={styles.sectionTitle} style={{ margin: "8px 0" }}>No certificates yet</h2>
          <p style={{ color: "var(--text-muted)", margin: "0 auto 16px", maxWidth: 360 }}>
            Complete an enrolled course to unlock your official verified certificate.
          </p>
          <Link href="/dashboard/courses" className={styles.actionBtn} style={{ display: "inline-flex", textDecoration: "none" }}>
            Browse Courses <ChevronRight size={16} />
          </Link>
        </section>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {certificates.map((certificate) => (
          <article key={certificate.id} className={styles.sectionCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "inline-flex", padding: 12, borderRadius: 14, background: "rgba(16, 185, 129, 0.12)", color: "var(--color-success)" }}>
                  <Award size={24} aria-hidden="true" />
                </div>
                <div>
                  <h2 className={styles.sectionTitle} style={{ fontSize: 18 }}>{certificate.course_title}</h2>
                  <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 13 }}>
                    Issued on {new Date(certificate.issued_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "1px", color: "var(--text-muted)", display: "block" }}>
                  CERTIFICATE SERIAL
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--color-primary)" }}>
                  {certificate.serial}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
