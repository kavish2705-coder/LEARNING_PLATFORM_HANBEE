"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#000", color: "#fff" }}>
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
            fontFamily: "'Afacad', sans-serif",
          }}
        >
          <p style={{ fontSize: 15, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            Something broke
          </p>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700 }}>That wasn&apos;t supposed to happen.</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 420 }}>
            Something went wrong loading this page. Try again, and contact Hanbee staff if it keeps happening.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 8,
              padding: "10px 22px",
              borderRadius: 8,
              background: "#fff",
              color: "#000",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
