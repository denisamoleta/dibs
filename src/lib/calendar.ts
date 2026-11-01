import type { SheetDTO } from "./types"

type EventLike = Pick<
  SheetDTO,
  "slug" | "title" | "description" | "location" | "eventDate" | "startTime" | "endTime" | "timezone"
>

const compactDate = (iso: string) => iso.replace(/-/g, "")
const compactTime = (hhmm: string) => `${hhmm.replace(":", "")}00`

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

function addMinutes(hhmm: string, minutes: number): { time: string; dayOffset: number } {
  const [h, m] = hhmm.split(":").map(Number)
  const total = h * 60 + m + minutes
  const dayOffset = Math.floor(total / 1440)
  const t = ((total % 1440) + 1440) % 1440
  return {
    time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
    dayOffset,
  }
}

/** Start/end as floating local times (ICS without "Z"), which calendars show in the viewer's zone. */
function range(e: EventLike): { start: string; end: string; allDay: boolean } | null {
  if (!e.eventDate) return null
  if (!e.startTime) {
    return { start: compactDate(e.eventDate), end: compactDate(nextDay(e.eventDate)), allDay: true }
  }
  let endDate = e.eventDate
  let endTime = e.endTime
  if (!endTime || endTime <= e.startTime) {
    const shifted = endTime ? { time: endTime, dayOffset: 1 } : addMinutes(e.startTime, 120)
    endTime = shifted.time
    if (shifted.dayOffset > 0) endDate = nextDay(e.eventDate)
  }
  return {
    start: `${compactDate(e.eventDate)}T${compactTime(e.startTime)}`,
    end: `${compactDate(endDate)}T${compactTime(endTime)}`,
    allDay: false,
  }
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

/** RFC 5545 line folding at 75 octets. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let current = ""
  let size = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ""
      size = 0
    }
    current += ch
    size += n
  }
  parts.push(current)
  return parts.join("\r\n ")
}

export function buildIcs(e: EventLike, url: string, now = new Date()): string | null {
  const r = range(e)
  if (!r) return null
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const description = [e.description, `Sign-up sheet: ${url}`].filter(Boolean).join("\n\n")
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dibs//Sign-up sheets//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.slug}@dibs`,
    `DTSTAMP:${stamp}`,
    r.allDay ? `DTSTART;VALUE=DATE:${r.start}` : `DTSTART:${r.start}`,
    r.allDay ? `DTEND;VALUE=DATE:${r.end}` : `DTEND:${r.end}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    e.location ? `LOCATION:${escapeIcs(e.location)}` : null,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null)
  return lines.map(fold).join("\r\n") + "\r\n"
}

export function googleCalendarUrl(e: EventLike, url: string): string | null {
  const r = range(e)
  if (!r) return null
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${r.start}/${r.end}`,
    details: [e.description, `Sign-up sheet: ${url}`].filter(Boolean).join("\n\n"),
  })
  if (e.location) params.set("location", e.location)
  if (e.timezone && !r.allDay) params.set("ctz", e.timezone)
  return `https://calendar.google.com/calendar/render?${params}`
}
