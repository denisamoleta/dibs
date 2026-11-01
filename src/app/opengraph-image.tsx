import { ImageResponse } from "next/og"
import { CheckGlyph, ogFonts } from "@/lib/og"

export const alt = "Dibs — who's bringing what? Sorted in one link."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const ROWS: [string, string, boolean][] = [
  ["Turkey", "Maya", true],
  ["Sides", "Jonah, Priya", true],
  ["Pie", "1 spot open", false],
]

export default async function Image() {
  const fonts = await ogFonts()
  const display = fonts ? "Bricolage" : "sans-serif"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fbf8f2",
          color: "#2a2420",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#d4462a",
                color: "#fff8ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontFamily: display,
              }}
            >
              d
            </div>
            <div style={{ fontSize: 36, fontFamily: display }}>dibs</div>
          </div>
          <div style={{ marginTop: 56, fontSize: 76, fontFamily: display, lineHeight: 1.02, letterSpacing: -2.5 }}>
            Who&apos;s bringing what? Sorted in one link.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#7a6e64" }}>
            Free sign-up sheets. No ads, no apps, no accounts.
          </div>
        </div>
        <div
          style={{
            marginLeft: "auto",
            alignSelf: "center",
            width: 380,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            background: "#ffffff",
            border: "2px solid #ece4d8",
            borderRadius: 28,
            padding: 26,
          }}
        >
          {ROWS.map(([item, who, done]) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: done ? "#3c9a5f" : "#ffffff",
                  border: done ? "none" : "3px dashed #d4462a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done && <CheckGlyph size={20} color="#ffffff" />}
              </div>
              <div style={{ fontFamily: display }}>{item}</div>
              <div style={{ marginLeft: "auto", color: done ? "#7a6e64" : "#d4462a", fontSize: 22 }}>{who}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
