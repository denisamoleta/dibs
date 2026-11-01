// Event dates/times are stored as the host's wall-clock values ("2026-11-26", "18:00").
// We format them in UTC with a fixed locale so server and browser always agree (no hydration drift).

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const dateFmtYear = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

function isoToUtcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * The year is shown only when it differs from `referenceYear` (we pass the sheet's creation
 * year rather than "now", so rendering stays deterministic on server and client).
 */
export function formatDate(iso: string, referenceYear?: number): string {
  const date = isoToUtcDate(iso)
  return referenceYear === undefined || date.getUTCFullYear() === referenceYear
    ? dateFmt.format(date)
    : dateFmtYear.format(date)
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`
}

export function formatWhen(sheet: {
  eventDate: string | null
  startTime: string | null
  endTime: string | null
  createdAt?: string
}): string | null {
  if (!sheet.eventDate) return null
  const refYear = sheet.createdAt ? new Date(sheet.createdAt).getUTCFullYear() : undefined
  let out = formatDate(sheet.eventDate, refYear)
  if (sheet.startTime) {
    out += ` · ${formatTime(sheet.startTime)}`
    if (sheet.endTime) out += ` – ${formatTime(sheet.endTime)}`
  }
  return out
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = Array.from(parts[0])[0] ?? ""
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : ""
  return (first + last).toUpperCase()
}

/** Stable hue per name so the same person gets the same avatar color everywhere. */
export function nameHue(name: string): number {
  let h = 0
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) % 360
  return h
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
