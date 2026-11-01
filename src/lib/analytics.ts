import "server-only"
import { and, count, countDistinct, eq, gt, gte, inArray, lt, sql } from "drizzle-orm"
import { getDb } from "./db"
import { analyticsDaily, analyticsVisitors, claims, sheets } from "./db/schema"
import { CLIENT_EVENTS, pageKind, type Breakdown, type ClientEvent, type PeriodTotals, type StatsDTO } from "./analytics-shared"
import { hashSecret } from "./tokens"

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|skype|curl|wget|python|httpclient|headless|lighthouse|pingdom|uptime/i

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10)

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return utcDay(d)
}

type Row = { metric: string; dim?: string; count?: number }

/** Increments daily counters in one statement (rows with the same key are merged first). */
export async function recordEvents(rows: Row[], day = utcDay()) {
  if (!rows.length) return
  const merged = new Map<string, { day: string; metric: string; dim: string; count: number }>()
  for (const r of rows) {
    const dim = (r.dim ?? "").slice(0, 96)
    const key = `${r.metric}\u0000${dim}`
    const existing = merged.get(key)
    if (existing) existing.count += r.count ?? 1
    else merged.set(key, { day, metric: r.metric.slice(0, 32), dim, count: r.count ?? 1 })
  }
  const db = await getDb()
  await db
    .insert(analyticsDaily)
    .values([...merged.values()])
    .onConflictDoUpdate({
      target: [analyticsDaily.day, analyticsDaily.metric, analyticsDaily.dim],
      set: { count: sql`${analyticsDaily.count} + excluded.count` },
    })
}

/** Never let stats break the product: log and move on. */
export async function recordEventsSafely(rows: Row[]) {
  try {
    await recordEvents(rows)
  } catch (err) {
    console.error("analytics: failed to record", err)
  }
}

function deviceOf(ua: string): string {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return "tablet"
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile"
  return "desktop"
}

const REFERRER_ALIASES: [RegExp, string][] = [
  [/(^|\.)facebook\.com$|^fb\.me$|^m\.me$/, "facebook.com"],
  [/(^|\.)instagram\.com$/, "instagram.com"],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, "x.com"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)bing\.com$/, "bing.com"],
  [/(^|\.)reddit\.com$/, "reddit.com"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin.com"],
  [/(^|\.)whatsapp\.(com|net)$|^wa\.me$/, "whatsapp"],
  [/(^|\.)slack\.com$/, "slack.com"],
]

function referrerOf(raw: string, ownHost: string | null): string | null {
  if (!raw) return "direct"
  let host: string
  try {
    const url = new URL(raw)
    if (!/^https?:$/.test(url.protocol)) return "direct"
    host = url.hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return "direct"
  }
  if (ownHost && host === ownHost.toLowerCase().replace(/^www\./, "").split(":")[0]) return null
  for (const [re, name] of REFERRER_ALIASES) if (re.test(host)) return name
  return host.slice(0, 96)
}

export type RequestMeta = { ip: string; ua: string; country: string | null; host: string | null }

export function isBot(ua: string) {
  return !ua || BOT_UA.test(ua)
}

export async function trackPageview(path: string, referrer: string, meta: RequestMeta) {
  const kind = pageKind(path)
  if (!kind || isBot(meta.ua)) return

  const day = utcDay()
  const salt = process.env.RATE_LIMIT_SALT ?? "dibs"
  const hash = hashSecret(`${salt}:visitor:${day}:${meta.ip}:${meta.ua}`).slice(0, 32)

  const db = await getDb()
  const inserted = await db
    .insert(analyticsVisitors)
    .values({ day, hash })
    .onConflictDoNothing()
    .returning({ hash: analyticsVisitors.hash })

  const rows: Row[] = [{ metric: "pageview", dim: kind }]
  if (inserted.length) {
    // Per-visitor dimensions are counted once per visitor per day.
    rows.push(
      { metric: "visitors" },
      { metric: "visitor_entry", dim: kind },
      { metric: "visitor_device", dim: deviceOf(meta.ua) },
      { metric: "visitor_country", dim: (meta.country ?? "??").toUpperCase().slice(0, 2) },
    )
    const ref = referrerOf(referrer, meta.host)
    if (ref) rows.push({ metric: "visitor_referrer", dim: ref })
  }
  await recordEvents(rows, day)
}

export async function trackClientEvent(event: string, dim: string, ua: string) {
  if (isBot(ua) || !(event in CLIENT_EVENTS)) return
  const allowed = CLIENT_EVENTS[event as ClientEvent] as readonly string[]
  if (!allowed.includes(dim)) return
  await recordEvents([{ metric: event === "install" ? "install" : `event_${event}`, dim }])
}

// ---------------------------------------------------------------------------

function sumWhere(rows: { metric: string; dim: string; total: number }[], metric: string) {
  return rows.filter((r) => r.metric === metric).reduce((s, r) => s + r.total, 0)
}

function breakdown(rows: { metric: string; dim: string; total: number }[], metric: string, limit = 8): Breakdown {
  const map = new Map<string, number>()
  for (const r of rows) if (r.metric === metric) map.set(r.dim || "—", (map.get(r.dim || "—") ?? 0) + r.total)
  const sorted = [...map.entries()].map(([key, c]) => ({ key, count: c })).sort((a, b) => b.count - a.count)
  if (sorted.length <= limit) return sorted
  const head = sorted.slice(0, limit - 1)
  const other = sorted.slice(limit - 1).reduce((s, r) => s + r.count, 0)
  return [...head, { key: "Other", count: other }]
}

function totals(rows: { metric: string; dim: string; total: number }[]): PeriodTotals {
  return {
    visitors: sumWhere(rows, "visitors"),
    pageviews: sumWhere(rows, "pageview"),
    sheets: sumWhere(rows, "sheet_created"),
    signups: sumWhere(rows, "claim_created"),
    installs: sumWhere(rows, "install"),
    shares: sumWhere(rows, "event_share"),
  }
}

async function aggregate(from: string, to: string) {
  const db = await getDb()
  return db
    .select({
      metric: analyticsDaily.metric,
      dim: analyticsDaily.dim,
      total: sql<number>`sum(${analyticsDaily.count})::int`,
    })
    .from(analyticsDaily)
    .where(and(gte(analyticsDaily.day, from), lt(analyticsDaily.day, shiftDay(to, 1))))
    .groupBy(analyticsDaily.metric, analyticsDaily.dim)
}

export async function getStats(days: number): Promise<StatsDTO> {
  const db = await getDb()
  const to = utcDay()
  const from = shiftDay(to, -(days - 1))
  const prevTo = shiftDay(from, -1)
  const prevFrom = shiftDay(prevTo, -(days - 1))

  const [periodRows, prevRows, allRows, firstDay, dailyRows] = await Promise.all([
    aggregate(from, to),
    aggregate(prevFrom, prevTo),
    db
      .select({
        metric: analyticsDaily.metric,
        dim: sql<string>`''`,
        total: sql<number>`sum(${analyticsDaily.count})::int`,
      })
      .from(analyticsDaily)
      .groupBy(analyticsDaily.metric),
    db.select({ day: sql<string | null>`min(${analyticsDaily.day})::text` }).from(analyticsDaily),
    db
      .select({
        day: sql<string>`${analyticsDaily.day}::text`,
        metric: analyticsDaily.metric,
        total: sql<number>`sum(${analyticsDaily.count})::int`,
      })
      .from(analyticsDaily)
      .where(
        and(
          gte(analyticsDaily.day, from),
          inArray(analyticsDaily.metric, ["visitors", "pageview", "sheet_created", "claim_created"]),
        ),
      )
      .groupBy(analyticsDaily.day, analyticsDaily.metric),
  ])

  const byDay = new Map<string, Record<string, number>>()
  for (const r of dailyRows) {
    const entry = byDay.get(r.day) ?? {}
    entry[r.metric] = r.total
    byDay.set(r.day, entry)
  }
  const daily = Array.from({ length: days }, (_, i) => {
    const day = shiftDay(from, i)
    const e = byDay.get(day) ?? {}
    return {
      day,
      visitors: e.visitors ?? 0,
      pageviews: e.pageview ?? 0,
      sheets: e.sheet_created ?? 0,
      signups: e.claim_created ?? 0,
    }
  })

  // Live numbers straight from the product tables.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const periodStart = new Date(`${from}T00:00:00Z`)
  const [[stored], [active], [signupsStored], [withSignups], [closed], [createdInPeriodWithSignups]] =
    await Promise.all([
      db.select({ n: count() }).from(sheets),
      db.select({ n: count() }).from(sheets).where(gt(sheets.updatedAt, weekAgo)),
      db.select({ n: count() }).from(claims),
      db.select({ n: countDistinct(claims.sheetId) }).from(claims),
      db.select({ n: count() }).from(sheets).where(eq(sheets.isClosed, true)),
      db
        .select({ n: countDistinct(sheets.id) })
        .from(sheets)
        .innerJoin(claims, eq(claims.sheetId, sheets.id))
        .where(gte(sheets.createdAt, periodStart)),
    ])

  const period = totals(periodRows)
  const allTime = totals(allRows)

  return {
    range: { days, from, to },
    period,
    previous: totals(prevRows),
    allTime: { ...allTime, since: firstDay[0]?.day ?? null },
    daily,
    funnel: {
      visitors: period.visitors,
      createViews: periodRows.find((r) => r.metric === "pageview" && r.dim === "new")?.total ?? 0,
      sheetsCreated: period.sheets,
      sheetsWithSignups: createdInPeriodWithSignups.n,
    },
    breakdowns: {
      pages: breakdown(periodRows, "pageview"),
      entry: breakdown(periodRows, "visitor_entry"),
      referrers: breakdown(periodRows, "visitor_referrer"),
      countries: breakdown(periodRows, "visitor_country"),
      devices: breakdown(periodRows, "visitor_device"),
      templates: breakdown(periodRows, "sheet_created"),
      shares: breakdown(periodRows, "event_share"),
      copies: breakdown(periodRows, "event_copy_list"),
      calendar: breakdown(periodRows, "event_calendar"),
      signupTypes: breakdown(periodRows, "claim_created"),
    },
    live: {
      sheetsStored: stored.n,
      activeThisWeek: active.n,
      signupsStored: signupsStored.n,
      avgSignupsPerSheet: stored.n ? Math.round((signupsStored.n / stored.n) * 10) / 10 : 0,
      sheetsWithSignupsPct: stored.n ? Math.round((withSignups.n / stored.n) * 100) : 0,
      closedSheets: closed.n,
    },
    generatedAt: new Date().toISOString(),
  }
}

/** Visitor hashes are only needed for today's/yesterday's dedupe. */
export async function pruneVisitorHashes() {
  const db = await getDb()
  const deleted = await db
    .delete(analyticsVisitors)
    .where(lt(analyticsVisitors.day, shiftDay(utcDay(), -2)))
    .returning({ day: analyticsVisitors.day })
  return deleted.length
}
