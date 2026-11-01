"use client"

import { useEffect, useId, useRef, useState } from "react"
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Chart primitives for the owner dashboard. One hue (chart-accent) for data, recessive
// grid/axes, text in text tokens, hover tooltips on every mark, and a table fallback.

const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const fullFmt = new Intl.NumberFormat("en-US")

export const fmt = (n: number) => (Math.abs(n) >= 10_000 ? compactFmt.format(n) : fullFmt.format(n))

const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const dayLongFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
export const shortDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`))
export const longDay = (iso: string) => dayLongFmt.format(new Date(`${iso}T00:00:00Z`))

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Rounds a max up to a clean axis value (1, 2, 5 × 10^n). */
function niceMax(value: number): number {
  if (value <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 2.5, 5, 10]) if (step * pow >= value) return step * pow
  return 10 * pow
}

/** Column with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return ""
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

export function DeltaBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground">No change {label}</span>
  }
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
        <ArrowUpRightIcon className="size-3.5" aria-hidden="true" /> New {label}
      </span>
    )
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const Icon = pct > 0 ? ArrowUpRightIcon : pct < 0 ? ArrowDownRightIcon : MinusIcon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        pct > 0 ? "text-success" : pct < 0 ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {pct > 0 ? "+" : ""}
      {pct}% <span className="font-normal text-muted-foreground">{label}</span>
    </span>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const w = 96
  const h = 28
  const max = Math.max(1, ...values)
  const step = values.length > 1 ? w / (values.length - 1) : w
  const pts = values.map((v, i) => [i * step, h - 3 - (v / max) * (h - 6)] as const)
  const last = pts.at(-1)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        style={{ stroke: "var(--chart-muted)" }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={4}
          style={{ fill: "var(--chart-accent)", stroke: "var(--card)" }}
          strokeWidth={2}
        />
      )}
    </svg>
  )
}

export function StatTile({
  label,
  value,
  previous,
  trend,
  periodLabel,
  hint,
}: {
  label: string
  value: number
  previous: number
  trend?: number[]
  periodLabel: string
  hint?: string
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border bg-card p-4 shadow-paper" title={hint}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="font-sans text-3xl leading-none font-semibold tracking-tight">{fmt(value)}</p>
        {trend && trend.length > 1 && <Sparkline values={trend} />}
      </div>
      <DeltaBadge current={value} previous={previous} label={periodLabel} />
    </div>
  )
}

export function ColumnChart({
  data,
  label,
  unit,
  height = 180,
}: {
  data: { day: string; value: number }[]
  label: string
  unit: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const titleId = useId()

  const padLeft = 32
  const padBottom = 22
  const padTop = 8
  const plotW = Math.max(0, width - padLeft)
  const plotH = height - padBottom - padTop
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const slot = data.length ? plotW / data.length : 0
  const barW = Math.max(2, Math.min(24, slot - 2))
  const ticks = [0, max / 2, max]
  const total = data.reduce((s, d) => s + d.value, 0)
  const labelIdx = data.length > 1 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0]
  const hovered = hover !== null ? data[hover] : null

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          onMouseLeave={() => setHover(null)}
        >
          <title id={titleId}>{`${label}: ${fmt(total)} total over ${data.length} days`}</title>
          {ticks.map((t) => {
            const y = padTop + plotH - (t / max) * plotH
            return (
              <g key={t}>
                <line x1={padLeft} x2={width} y1={y} y2={y} style={{ stroke: "var(--chart-grid)" }} strokeWidth={1} />
                <text
                  x={padLeft - 6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {fmt(Math.round(t))}
                </text>
              </g>
            )
          })}
          {data.map((d, i) => {
            const h = (d.value / max) * plotH
            const x = padLeft + i * slot + (slot - barW) / 2
            const y = padTop + plotH - h
            return (
              <g key={d.day}>
                <path
                  d={columnPath(x, y, barW, h)}
                  style={{ fill: "var(--chart-accent)" }}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
                {/* Hit target: the whole slot, taller than the mark. */}
                <rect
                  x={padLeft + i * slot}
                  y={padTop}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={-1}
                />
              </g>
            )
          })}
          {labelIdx.map((i) => (
            <text
              key={i}
              x={padLeft + i * slot + slot / 2}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground text-[10px]"
            >
              {data[i] ? shortDay(data[i].day) : ""}
            </text>
          ))}
        </svg>
      )}
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
          style={{ left: Math.min(Math.max(padLeft + hover * slot + slot / 2, 60), width - 60) }}
        >
          <p className="text-muted-foreground">{longDay(hovered.day)}</p>
          <p className="font-semibold tabular-nums">
            {fmt(hovered.value)} {hovered.value === 1 ? unit : `${unit}s`}
          </p>
        </div>
      )}
      {width > 0 && total === 0 && (
        <p className="absolute inset-0 flex items-center justify-center pl-8 text-sm text-muted-foreground">
          No data in this period yet
        </p>
      )}
    </div>
  )
}

export function BarList({
  rows,
  format = (k) => k,
  empty = "Nothing yet",
}: {
  rows: { key: string; count: number }[]
  format?: (key: string) => string
  empty?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  const max = Math.max(...rows.map((r) => r.count))
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = total ? Math.round((r.count / total) * 100) : 0
        return (
          <li
            key={r.key}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
            onMouseEnter={() => setHover(r.key)}
            onMouseLeave={() => setHover(null)}
            title={`${format(r.key)}: ${fmt(r.count)} (${pct}%)`}
          >
            <span className="truncate text-sm">{format(r.key)}</span>
            <span className="text-sm font-medium tabular-nums">
              {fmt(r.count)}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">{pct}%</span>
            </span>
            <span className="col-span-2 h-2 overflow-hidden rounded-full bg-chart-muted/40">
              <span
                className="block h-full rounded-full transition-opacity"
                style={{
                  width: `${Math.max(2, (r.count / max) * 100)}%`,
                  background: "var(--chart-accent)",
                  opacity: hover === null || hover === r.key ? 1 : 0.45,
                }}
              />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function Funnel({ steps }: { steps: { label: string; value: number; hint: string }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value))
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null
        const rate = prev ? Math.round((s.value / prev) * 100) : null
        return (
          <li key={s.label} title={s.hint}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span>{s.label}</span>
              <span className="font-medium tabular-nums">
                {fmt(s.value)}
                {rate !== null && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{rate}% of previous</span>
                )}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-chart-muted/40">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(1.5, (s.value / max) * 100)}%`, background: "var(--chart-accent)" }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
