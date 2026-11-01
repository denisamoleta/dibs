// Shared by the tracker (client), the collector (server) and the admin dashboard.

/** Client-side events we accept, with their allowed dimensions. Anything else is dropped. */
export const CLIENT_EVENTS = {
  share: ["native", "copy", "whatsapp", "email"],
  copy_list: ["full", "needed", "link"],
  calendar: ["google", "ics"],
  install: [""],
} as const

export type ClientEvent = keyof typeof CLIENT_EVENTS

export const PAGE_KINDS = ["home", "new", "sheet", "edit", "my", "legal", "other"] as const
export type PageKind = (typeof PAGE_KINDS)[number]

/** Maps a pathname to a coarse page kind. Sheet slugs are never stored. */
export function pageKind(pathname: string): PageKind | null {
  const p = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/"
  if (p.startsWith("/admin") || p.startsWith("/api")) return null
  if (p === "/") return "home"
  if (p === "/new") return "new"
  if (/^\/s\/[a-z0-9]{6,16}\/edit$/.test(p)) return "edit"
  if (/^\/s\/[a-z0-9]{6,16}$/.test(p)) return "sheet"
  if (p === "/my") return "my"
  if (p === "/privacy" || p === "/terms") return "legal"
  return "other"
}

export type Breakdown = { key: string; count: number }[]

export type DailyPoint = {
  day: string
  visitors: number
  pageviews: number
  sheets: number
  signups: number
}

export type PeriodTotals = {
  visitors: number
  pageviews: number
  sheets: number
  signups: number
  installs: number
  shares: number
}

export type StatsDTO = {
  range: { days: number; from: string; to: string }
  period: PeriodTotals
  previous: PeriodTotals
  allTime: PeriodTotals & { since: string | null }
  daily: DailyPoint[]
  funnel: { visitors: number; createViews: number; sheetsCreated: number; sheetsWithSignups: number }
  breakdowns: {
    pages: Breakdown
    entry: Breakdown
    referrers: Breakdown
    countries: Breakdown
    devices: Breakdown
    templates: Breakdown
    shares: Breakdown
    copies: Breakdown
    calendar: Breakdown
    signupTypes: Breakdown
  }
  live: {
    sheetsStored: number
    activeThisWeek: number
    signupsStored: number
    avgSignupsPerSheet: number
    sheetsWithSignupsPct: number
    closedSheets: number
  }
  generatedAt: string
}
