import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        gap: 14,
      }}
    >
      <p style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-muted)" }}>404</p>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-main)" }}>We couldn&apos;t find that page.</h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 420 }}>
        That link doesn&apos;t match anywhere in your dashboard. It may have moved, or the link was mistyped.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 6,
          padding: "9px 20px",
          borderRadius: 8,
          background: "var(--color-primary)",
          color: "var(--color-primary-text)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
