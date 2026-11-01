"use client"

const COLORS = ["var(--primary)", "#FFD84D", "var(--success)", "oklch(0.7 0.15 260)"]
const PIECES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2
  const distance = 34 + (i % 3) * 12
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance)}px`,
    color: COLORS[i % COLORS.length],
    size: i % 2 ? 6 : 8,
  }
})

/** A tiny celebratory pop when someone calls dibs. Purely decorative. */
export function Burst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 size-0">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="animate-burst absolute rounded-full"
          style={
            {
              "--dx": p.dx,
              "--dy": p.dy,
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              background: p.color,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
