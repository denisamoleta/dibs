import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#D4462A", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 44,
            top: 72,
            width: 70,
            height: 70,
            borderRadius: 999,
            border: "20px solid #FFF8EE",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 105,
            top: 37,
            width: 20,
            height: 104,
            borderRadius: 10,
            background: "#FFF8EE",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 35,
            top: 35,
            width: 27,
            height: 27,
            borderRadius: 999,
            background: "#FFD84D",
          }}
        />
      </div>
    ),
    size,
  )
}
