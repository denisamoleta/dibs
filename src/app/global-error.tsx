"use client"

// Last-resort boundary when the root layout itself fails; keeps styling self-contained.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fbf8f2",
          color: "#2a2420",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>Dibs hit a snag</h1>
          <p style={{ color: "#7a6e64" }}>Please try again in a moment.</p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              borderRadius: 12,
              border: 0,
              background: "#d4462a",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
