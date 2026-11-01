import "server-only"

// Link-preview images render with Satori, which needs raw TTF/OTF data. We fetch the brand
// display font once per server instance; if that fails, Satori's default font still works.
let displayFont: Promise<ArrayBuffer | null> | undefined

export function loadDisplayFont(): Promise<ArrayBuffer | null> {
  displayFont ??= (async () => {
    try {
      const css = await (
        await fetch("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700", {
          signal: AbortSignal.timeout(3000),
        })
      ).text()
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
      if (!url) return null
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
      return res.ok ? await res.arrayBuffer() : null
    } catch {
      displayFont = undefined // retry on the next render
      return null
    }
  })()
  return displayFont
}

export async function ogFonts() {
  const data = await loadDisplayFont()
  return data ? [{ name: "Bricolage", data, weight: 700 as const, style: "normal" as const }] : undefined
}

export function CheckGlyph({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
