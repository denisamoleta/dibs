import { ImageResponse } from "next/og"
import { formatWhen } from "@/lib/format"
import { CheckGlyph, ogFonts } from "@/lib/og"
import { sheetProgress } from "@/lib/types"
import { loadSheet } from "./data"

export const alt = "Sign-up sheet on Dibs"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const INK = "#2a2420"
const PAPER = "#fbf8f2"
const TOMATO = "#d4462a"
const MUTED = "#7a6e64"

// The link preview people see in WhatsApp/iMessage: title, when, and live progress.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sheet = await loadSheet(slug)

  const title = sheet?.title ?? "Sign-up sheet"
  const when = sheet ? formatWhen(sheet) : null
  const { filled, total, open } = sheet ? sheetProgress(sheet) : { filled: 0, total: 0, open: 0 }
  const pct = total ? Math.round((filled / total) * 100) : 0
  const preview = (sheet?.items ?? []).slice(0, 4)
  const fonts = await ogFonts()
  const display = fonts ? "Bricolage" : "sans-serif"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          padding: "60px 72px",
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: TOMATO,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: PAPER,
              fontSize: 30,
              fontWeight: 700,
              fontFamily: display,
            }}
          >
            d
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -1, fontFamily: display }}>dibs</div>
          <div style={{ marginLeft: "auto", fontSize: 24, color: MUTED }}>
            {total ? (open === 0 ? "All covered" : `${open} spot${open === 1 ? "" : "s"} open`) : ""}
          </div>
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: title.length > 40 ? 58 : 72,
            fontWeight: 700,
            fontFamily: display,
            lineHeight: 1.05,
            letterSpacing: -2,
            display: "flex",
          }}
        >
          {title.length > 70 ? `${title.slice(0, 68)}…` : title}
        </div>
        {when && <div style={{ marginTop: 18, fontSize: 30, color: MUTED, display: "flex" }}>{when}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {preview.map((item) => {
              const covered = item.claims.length >= item.slots
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: 999,
                    fontSize: 22,
                    background: covered ? "#e3f3e8" : "#ffffff",
                    border: `2px solid ${covered ? "#bfe3cb" : "#ece4d8"}`,
                    color: covered ? "#2f7a4b" : INK,
                    maxWidth: 260,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {covered && <CheckGlyph size={20} color="#2f7a4b" />}
                  {item.title.length > 18 ? `${item.title.slice(0, 17)}…` : item.title}
                </div>
              )
            })}
          </div>
          <div style={{ display: "flex", height: 18, borderRadius: 999, background: "#ece4d8", marginTop: 10 }}>
            <div
              style={{
                width: `${Math.max(pct, total ? 3 : 0)}%`,
                height: 18,
                borderRadius: 999,
                background: pct === 100 ? "#3c9a5f" : TOMATO,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: MUTED }}>
            <span>
              {filled} of {total} spots filled
            </span>
            <span style={{ color: TOMATO, fontFamily: display }}>Tap to call dibs →</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
