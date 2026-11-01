"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { KeyRoundIcon, Loader2Icon, LockIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { StatsDTO } from "@/lib/analytics-shared"
import { TEMPLATES } from "@/lib/templates"
import { setTrackingOptOut, trackingDisabled } from "@/lib/track"
import { cn } from "@/lib/utils"
import { BarList, ColumnChart, Funnel, StatTile, fmt, longDay } from "./charts"

const KEY_STORAGE = "dibs:owner-key"
const RANGES = [7, 30, 90] as const

const PAGE_NAMES: Record<string, string> = {
  home: "Homepage",
  new: "Create page",
  sheet: "Sheet pages",
  edit: "Edit page",
  my: "My sheets",
  legal: "Privacy & terms",
  other: "Other",
}
const DEVICE_NAMES: Record<string, string> = { mobile: "Phone", desktop: "Computer", tablet: "Tablet" }
const SHARE_NAMES: Record<string, string> = {
  native: "Phone share sheet",
  copy: "Copied link",
  whatsapp: "WhatsApp",
  email: "Email",
}
const COPY_NAMES: Record<string, string> = { full: "Full list", needed: "“Still needed” nudge", link: "Just the link" }
const CALENDAR_NAMES: Record<string, string> = { google: "Google Calendar", ics: "Apple / Outlook (.ics)" }
const SIGNUP_NAMES: Record<string, string> = { spot: "Took a listed spot", write_in: "Added their own item" }
const TEMPLATE_NAMES: Record<string, string> = Object.fromEntries([
  ...TEMPLATES.map((t) => [t.id, `${t.emoji} ${t.name}`]),
  ["blank", "✏️ Blank"],
])

const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null
function countryName(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return code === "Other" ? "Other" : "Unknown"
  const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
  let name = code
  try {
    name = regionNames?.of(code) ?? code
  } catch {
    /* unknown code */
  }
  return `${flag} ${name}`
}
const referrerName = (k: string) => (k === "direct" ? "Direct / chat apps" : k === "Other" ? "Other" : k)

type Status =
  | { kind: "locked"; error?: string }
  | { kind: "loading" }
  | { kind: "ready"; stats: StatsDTO }
  | { kind: "error"; message: string }

export function AdminDashboard() {
  const [key, setKey] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>({ kind: "loading" })
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)
  const [refreshing, setRefreshing] = useState(false)
  const [optOut, setOptOut] = useState(false)

  const load = useCallback(async (k: string, range: number, quiet = false) => {
    if (quiet) setRefreshing(true)
    else setStatus({ kind: "loading" })
    try {
      const res = await fetch(`/api/admin/stats?days=${range}`, { headers: { "X-Admin-Key": k }, cache: "no-store" })
      const body = await res.json().catch(() => null)
      if (res.status === 401) {
        sessionStorage.removeItem(KEY_STORAGE)
        localStorage.removeItem(KEY_STORAGE)
        setKey(null)
        setStatus({ kind: "locked", error: "That key isn't right." })
        return
      }
      if (!res.ok) {
        setStatus({ kind: "error", message: body?.error?.message ?? "Couldn't load stats." })
        return
      }
      setStatus({ kind: "ready", stats: body as StatsDTO })
    } catch {
      setStatus({ kind: "error", message: "You seem to be offline." })
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = sessionStorage.getItem(KEY_STORAGE) ?? localStorage.getItem(KEY_STORAGE)
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptOut(trackingDisabled())
    if (stored) {
      setKey(stored)
      load(stored, 30)
    } else {
      setStatus({ kind: "locked" })
    }
  }, [load])

  // Keep numbers fresh while the dashboard is open.
  useEffect(() => {
    if (!key || status.kind !== "ready") return
    const id = setInterval(() => document.visibilityState === "visible" && load(key, days, true), 60_000)
    return () => clearInterval(id)
  }, [key, days, status.kind, load])

  function unlock(k: string, remember: boolean) {
    try {
      sessionStorage.setItem(KEY_STORAGE, k)
      if (remember) localStorage.setItem(KEY_STORAGE, k)
    } catch {
      /* storage unavailable */
    }
    setKey(k)
    load(k, days)
  }

  function lock() {
    try {
      sessionStorage.removeItem(KEY_STORAGE)
      localStorage.removeItem(KEY_STORAGE)
    } catch {
      /* storage unavailable */
    }
    setKey(null)
    setStatus({ kind: "locked" })
  }

  if (status.kind === "locked") return <KeyGate error={status.error} onUnlock={unlock} />

  if (status.kind === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-paper">
        <h2 className="text-xl font-bold">Couldn&apos;t load the dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          {key && <Button onClick={() => load(key, days)}>Try again</Button>}
          <Button variant="outline" onClick={lock}>
            Use a different key
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Time range" className="inline-flex rounded-xl border bg-card p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={days === r}
              onClick={() => {
                setDays(r)
                if (key) load(key, r, true)
              }}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                days === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r} days
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={optOut}
              onCheckedChange={(v) => {
                setTrackingOptOut(v)
                setOptOut(trackingDisabled())
              }}
            />
            Don&apos;t count my visits
          </label>
          <Button variant="outline" size="sm" onClick={() => key && load(key, days, true)} disabled={refreshing}>
            <RefreshCwIcon className={cn(refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={lock}>
            <LockIcon /> Lock
          </Button>
        </div>
      </div>

      {status.kind === "loading" ? <DashboardSkeleton /> : <Dashboard stats={status.stats} />}
    </div>
  )
}

function Dashboard({ stats }: { stats: StatsDTO }) {
  const { period, previous, daily, breakdowns: b, live, funnel, range } = stats
  const vs = `vs previous ${range.days} days`
  const trend = useMemo(
    () => ({
      visitors: daily.map((d) => d.visitors),
      pageviews: daily.map((d) => d.pageviews),
      sheets: daily.map((d) => d.sheets),
      signups: daily.map((d) => d.signups),
    }),
    [daily],
  )

  return (
    <div className="space-y-8">
      <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Visitors" value={period.visitors} previous={previous.visitors} trend={trend.visitors} periodLabel={vs} hint="Unique visitors per day, added up" />
        <StatTile label="Page views" value={period.pageviews} previous={previous.pageviews} trend={trend.pageviews} periodLabel={vs} />
        <StatTile label="Sheets created" value={period.sheets} previous={previous.sheets} trend={trend.sheets} periodLabel={vs} />
        <StatTile label="Sign-ups" value={period.signups} previous={previous.signups} trend={trend.signups} periodLabel={vs} hint="People who called dibs on a spot" />
        <StatTile label="Links shared" value={period.shares} previous={previous.shares} periodLabel={vs} hint="Share, copy link, WhatsApp and email taps" />
        <StatTile label="App installs" value={period.installs} previous={previous.installs} periodLabel={vs} hint="Added to home screen / installed as an app" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Visitors per day" subtitle="Unique visitors each day">
          <ColumnChart data={daily.map((d) => ({ day: d.day, value: d.visitors }))} label="Visitors per day" unit="visitor" />
        </Panel>
        <Panel title="Page views per day">
          <ColumnChart data={daily.map((d) => ({ day: d.day, value: d.pageviews }))} label="Page views per day" unit="view" />
        </Panel>
        <Panel title="Sheets created per day">
          <ColumnChart data={daily.map((d) => ({ day: d.day, value: d.sheets }))} label="Sheets created per day" unit="sheet" />
        </Panel>
        <Panel title="Sign-ups per day">
          <ColumnChart data={daily.map((d) => ({ day: d.day, value: d.signups }))} label="Sign-ups per day" unit="sign-up" />
        </Panel>
      </section>

      <details className="group rounded-2xl border bg-card shadow-paper">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show daily numbers as a table</span>
          <span className="hidden group-open:inline">Hide table</span>
        </summary>
        <div className="max-h-96 overflow-auto border-t">
          <table className="w-full text-sm">
            <caption className="sr-only">Daily usage</caption>
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">Day</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Visitors</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Page views</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Sheets</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">Sign-ups</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...daily].reverse().map((d) => (
                <tr key={d.day} className="border-t">
                  <th scope="row" className="px-5 py-2 text-left font-normal">{longDay(d.day)}</th>
                  <td className="px-3 py-2 text-right">{fmt(d.visitors)}</td>
                  <td className="px-3 py-2 text-right">{fmt(d.pageviews)}</td>
                  <td className="px-3 py-2 text-right">{fmt(d.sheets)}</td>
                  <td className="px-5 py-2 text-right">{fmt(d.signups)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="From visit to sign-up" subtitle={`Last ${range.days} days`} className="lg:col-span-2">
          <Funnel
            steps={[
              { label: "Visitors", value: funnel.visitors, hint: "Unique visitors per day, added up" },
              { label: "Opened the create page", value: funnel.createViews, hint: "Views of /new" },
              { label: "Created a sheet", value: funnel.sheetsCreated, hint: "Sheets created" },
              { label: "Sheet got a sign-up", value: funnel.sheetsWithSignups, hint: "Sheets created in this period with at least one sign-up (still in the database)" },
            ]}
          />
        </Panel>
        <Panel title="Right now" subtitle="Live from the database">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            <LiveStat label="Sheets stored" value={fmt(live.sheetsStored)} />
            <LiveStat label="Active this week" value={fmt(live.activeThisWeek)} />
            <LiveStat label="Sign-ups stored" value={fmt(live.signupsStored)} />
            <LiveStat label="Avg sign-ups / sheet" value={String(live.avgSignupsPerSheet)} />
            <LiveStat label="Sheets with a sign-up" value={`${live.sheetsWithSignupsPct}%`} />
            <LiveStat label="Closed sheets" value={fmt(live.closedSheets)} />
          </dl>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Where visitors come from" subtitle="Referring site, first visit of the day">
          <BarList rows={b.referrers} format={referrerName} />
        </Panel>
        <Panel title="First page they saw" subtitle="Sheet pages = arrived via a shared link">
          <BarList rows={b.entry} format={(k) => PAGE_NAMES[k] ?? k} />
        </Panel>
        <Panel title="Countries">
          <BarList rows={b.countries} format={countryName} />
        </Panel>
        <Panel title="Devices">
          <BarList rows={b.devices} format={(k) => DEVICE_NAMES[k] ?? k} />
        </Panel>
        <Panel title="Most viewed pages">
          <BarList rows={b.pages} format={(k) => PAGE_NAMES[k] ?? k} />
        </Panel>
        <Panel title="Templates used" subtitle="For new sheets">
          <BarList rows={b.templates} format={(k) => TEMPLATE_NAMES[k] ?? k} empty="No sheets created yet" />
        </Panel>
        <Panel title="How links get shared">
          <BarList rows={b.shares} format={(k) => SHARE_NAMES[k] ?? k} empty="No shares yet" />
        </Panel>
        <Panel title="Copied for group chats">
          <BarList rows={b.copies} format={(k) => COPY_NAMES[k] ?? k} empty="No copies yet" />
        </Panel>
        <Panel title="Sign-ups and calendars">
          <div className="space-y-6">
            <BarList rows={b.signupTypes} format={(k) => SIGNUP_NAMES[k] ?? k} empty="No sign-ups yet" />
            <BarList rows={b.calendar} format={(k) => CALENDAR_NAMES[k] ?? k} empty="No calendar adds yet" />
          </div>
        </Panel>
      </section>

      <footer className="flex flex-wrap justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
        <span>
          All time{stats.allTime.since ? ` (since ${longDay(stats.allTime.since)})` : ""}: {fmt(stats.allTime.visitors)} visitors ·{" "}
          {fmt(stats.allTime.sheets)} sheets · {fmt(stats.allTime.signups)} sign-ups · {fmt(stats.allTime.installs)} installs
        </span>
        <span>Updated {new Date(stats.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · refreshes every minute</span>
      </footer>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  className,
  children,
}: {
  title: string
  subtitle?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-paper", className)}>
      <h2 className="font-sans text-base font-semibold tracking-normal">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function KeyGate({ error, onUnlock }: { error?: string; onUnlock: (key: string, remember: boolean) => void }) {
  const [value, setValue] = useState("")
  const [remember, setRemember] = useState(true)
  const [pending, setPending] = useState(false)

  return (
    <form
      className="mx-auto max-w-md rounded-2xl border bg-card p-6 shadow-paper sm:p-8"
      onSubmit={(e) => {
        e.preventDefault()
        if (!value.trim()) return
        setPending(true)
        onUnlock(value.trim(), remember)
      }}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-tomato-soft text-primary">
        <KeyRoundIcon className="size-5" />
      </span>
      <h2 className="mt-4 text-xl font-bold">Owner dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your <code className="rounded bg-muted px-1 py-0.5 text-xs">ADMIN_KEY</code> to see how Dibs is doing.
      </p>
      <div className="mt-5 space-y-1.5">
        <Label htmlFor="owner-key">Admin key</Label>
        <Input
          id="owner-key"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          autoFocus
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <Switch checked={remember} onCheckedChange={setRemember} />
        Remember on this device
      </label>
      <Button type="submit" className="mt-6 w-full" disabled={pending && !error}>
        {pending && !error ? <Loader2Icon className="animate-spin" /> : null}
        Unlock
      </Button>
    </form>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading stats">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[260px] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  )
}
