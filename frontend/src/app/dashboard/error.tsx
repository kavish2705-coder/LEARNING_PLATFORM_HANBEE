"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
      <p style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "var(--color-danger)" }}>
        Something broke
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-main)" }}>That wasn&apos;t supposed to happen.</h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 420 }}>
        Something went wrong loading this page. Try again, and contact Hanbee staff if it keeps happening.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: 6,
          padding: "9px 20px",
          borderRadius: 8,
          background: "var(--color-primary)",
          color: "var(--color-primary-text)",
          fontWeight: 600,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
