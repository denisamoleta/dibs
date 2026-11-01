import { formatWhen } from "./format"
import { sheetProgress, type SheetDTO } from "./types"

/** Plain-text list that pastes cleanly into WhatsApp, iMessage, Slack, email… */
export function fullSummary(sheet: SheetDTO, url: string): string {
  const lines: string[] = [`📋 ${sheet.title}`]
  const when = formatWhen(sheet)
  if (when) lines.push(`🗓 ${when}`)
  if (sheet.location) lines.push(`📍 ${sheet.location}`)
  lines.push("")

  for (const item of sheet.items) {
    const names = item.claims.map((c) => c.name).join(", ")
    const open = item.slots - item.claims.length
    if (open <= 0) lines.push(`✅ ${item.title} — ${names}`)
    else if (names) lines.push(`🟡 ${item.title} — ${names} (+${open} open)`)
    else lines.push(`⬜ ${item.title}${item.slots > 1 ? ` (${item.slots} spots)` : ""}`)
  }

  const { open } = sheetProgress(sheet)
  lines.push("")
  lines.push(open > 0 ? `Call dibs 👉 ${url}` : `All covered 🎉 ${url}`)
  return lines.join("\n")
}

/** A short nudge listing only what's still missing. */
export function stillNeededSummary(sheet: SheetDTO, url: string): string {
  const needed = sheet.items
    .map((item) => ({ item, open: item.slots - item.claims.length }))
    .filter((x) => x.open > 0)

  if (!needed.length) return `Everything for "${sheet.title}" is covered — thank you all! 🎉\n${url}`

  const lines = [`Still needed for ${sheet.title}:`]
  for (const { item, open } of needed) lines.push(`• ${item.title}${open > 1 ? ` ×${open}` : ""}`)
  lines.push("", `Tap to call dibs 👉 ${url}`)
  return lines.join("\n")
}

export function toCsv(sheet: SheetDTO): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v)
    // Neutralize spreadsheet formula injection, then quote.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }
  const rows: (string | number | null)[][] = [["Item", "Spot", "Name", "Note", "Signed up at"]]
  for (const item of sheet.items) {
    for (let i = 0; i < Math.max(item.slots, item.claims.length); i++) {
      const c = item.claims[i]
      rows.push([item.title, i + 1, c?.name ?? "", c?.comment ?? "", c?.createdAt ?? ""])
    }
  }
  return rows.map((r) => r.map(esc).join(",")).join("\r\n")
}
