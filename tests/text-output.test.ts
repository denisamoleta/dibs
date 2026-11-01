import { describe, expect, it } from "vitest"
import { buildIcs, googleCalendarUrl } from "@/lib/calendar"
import { formatTime, formatWhen, initials } from "@/lib/format"
import { fullSummary, stillNeededSummary, toCsv } from "@/lib/summary"
import type { SheetDTO } from "@/lib/types"

const LINK = "https://dibs.test/s/abc234defg"
const at = "2026-11-01T12:00:00.000Z"

function sheet(overrides: Partial<SheetDTO> = {}): SheetDTO {
  return {
    slug: "abc234defg",
    title: "Friendsgiving",
    description: "Bring a dish, serves 6",
    location: "Maya's, 12 Oak St",
    eventDate: "2026-11-26",
    startTime: "18:00",
    endTime: "22:30",
    timezone: "America/New_York",
    hostName: "Maya",
    allowWriteIns: true,
    isClosed: false,
    version: 3,
    createdAt: at,
    updatedAt: at,
    isAdmin: false,
    items: [
      { id: "1", title: "Pie", note: null, slots: 2, position: 0, addedBy: null, claims: [
        { id: "a", name: "Ana", comment: "apple", createdAt: at },
      ] },
      { id: "2", title: "Drinks", note: null, slots: 1, position: 1, addedBy: null, claims: [
        { id: "b", name: "Ben", comment: null, createdAt: at },
      ] },
      { id: "3", title: "Ice", note: null, slots: 1, position: 2, addedBy: null, claims: [] },
    ],
    ...overrides,
  }
}

describe("formatting", () => {
  it("formats wall-clock dates and times deterministically", () => {
    expect(formatTime("18:00")).toBe("6 PM")
    expect(formatTime("09:05")).toBe("9:05 AM")
    expect(formatTime("00:30")).toBe("12:30 AM")
    expect(formatWhen(sheet())).toBe("Thu, Nov 26 · 6 PM – 10:30 PM")
    expect(formatWhen(sheet({ eventDate: "2027-01-02", startTime: null, endTime: null }))).toBe(
      "Sat, Jan 2, 2027",
    )
    expect(formatWhen(sheet({ eventDate: null }))).toBeNull()
  })

  it("builds initials from names, including non-Latin ones", () => {
    expect(initials("maya chen")).toBe("MC")
    expect(initials("Ana")).toBe("A")
    expect(initials("Деница Петрова")).toBe("ДП")
  })
})

describe("chat summaries", () => {
  it("lists every item with who's on it", () => {
    const text = fullSummary(sheet(), LINK)
    expect(text).toContain("📋 Friendsgiving")
    expect(text).toContain("🟡 Pie — Ana (+1 open)")
    expect(text).toContain("✅ Drinks — Ben")
    expect(text).toContain("⬜ Ice")
    expect(text.trim().endsWith(LINK)).toBe(true)
  })

  it("nudges with only what's still needed", () => {
    const text = stillNeededSummary(sheet(), LINK)
    expect(text).toContain("• Pie")
    expect(text).toContain("• Ice")
    expect(text).not.toContain("Drinks")
  })

  it("celebrates when everything is covered", () => {
    const done = sheet({
      items: [{ id: "1", title: "Pie", note: null, slots: 1, position: 0, addedBy: null, claims: [
        { id: "a", name: "Ana", comment: null, createdAt: at },
      ] }],
    })
    expect(stillNeededSummary(done, LINK)).toContain("covered")
  })
})

describe("CSV export", () => {
  it("writes one row per spot and neutralizes spreadsheet formulas", () => {
    const evil = sheet({
      items: [{ id: "1", title: "=HYPERLINK(\"x\")", note: null, slots: 2, position: 0, addedBy: null, claims: [
        { id: "a", name: "+Bob", comment: "say \"hi\"", createdAt: at },
      ] }],
    })
    const rows = toCsv(evil).split("\r\n")
    expect(rows[0]).toBe('"Item","Spot","Name","Note","Signed up at"')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toContain(`"'=HYPERLINK(""x"")"`)
    expect(rows[1]).toContain(`"'+Bob"`)
    expect(rows[1]).toContain(`"say ""hi"""`)
  })
})

describe("calendar", () => {
  it("creates a valid timed ICS event with escaped text", () => {
    const ics = buildIcs(sheet(), LINK, new Date("2026-11-01T00:00:00Z"))!
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("DTSTART:20261126T180000")
    expect(ics).toContain("DTEND:20261126T223000")
    expect(ics).toContain("LOCATION:Maya's\\, 12 Oak St")
    expect(ics).toContain("SUMMARY:Friendsgiving")
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })

  it("handles all-day events and events that end after midnight", () => {
    const allDay = buildIcs(sheet({ startTime: null, endTime: null }), LINK)!
    expect(allDay).toContain("DTSTART;VALUE=DATE:20261126")
    expect(allDay).toContain("DTEND;VALUE=DATE:20261127")

    const late = buildIcs(sheet({ startTime: "22:00", endTime: "01:00" }), LINK)!
    expect(late).toContain("DTEND:20261127T010000")

    const noEnd = buildIcs(sheet({ startTime: "23:00", endTime: null }), LINK)!
    expect(noEnd).toContain("DTEND:20261127T010000")
  })

  it("returns nothing without a date", () => {
    expect(buildIcs(sheet({ eventDate: null }), LINK)).toBeNull()
    expect(googleCalendarUrl(sheet({ eventDate: null }), LINK)).toBeNull()
  })

  it("builds a Google Calendar link with the host's time zone", () => {
    const link = new URL(googleCalendarUrl(sheet(), LINK)!)
    expect(link.searchParams.get("dates")).toBe("20261126T180000/20261126T223000")
    expect(link.searchParams.get("ctz")).toBe("America/New_York")
  })
})
