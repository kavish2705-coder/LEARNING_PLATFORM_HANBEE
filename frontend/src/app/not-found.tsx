import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "24px",
        gap: 16,
      }}
    >
      <p style={{ fontSize: 15, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
        404
      </p>
      <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700 }}>This page took a wrong turn.</h1>
      <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 420 }}>
        The link you followed doesn&apos;t lead anywhere on Hanbee. It may have been moved, or mistyped.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: "10px 22px",
          borderRadius: 8,
          background: "#fff",
          color: "#000",
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        ← Back to Home
      </Link>
    </main>
  );
}
