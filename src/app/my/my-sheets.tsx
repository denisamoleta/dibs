"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRightIcon, CrownIcon, LockIcon, PlusIcon, XIcon } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api-client"
import { formatDate } from "@/lib/format"
import { localStore, type RememberedSheet } from "@/lib/local-store"
import type { SheetSummaryDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

type Row = RememberedSheet & { summary?: SheetSummaryDTO; missing?: boolean }

export function MySheets() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [forget, setForget] = useState<Row | null>(null)

  useEffect(() => {
    const remembered = localStore.getSheets()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(remembered)
    if (!remembered.length) return
    api
      .lookup(remembered.map((s) => s.slug))
      .then((summaries) => {
        const bySlug = new Map(summaries.map((s) => [s.slug, s]))
        setRows(remembered.map((s) => ({ ...s, summary: bySlug.get(s.slug), missing: !bySlug.has(s.slug) })))
      })
      .catch(() => setOffline(true))
  }, [])

  if (rows === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed px-6 py-14 text-center">
        <p className="text-4xl" aria-hidden="true">
          🗒️
        </p>
        <h2 className="mt-3 text-xl font-bold">No sheets on this device yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Sheets you create or open show up here, so you can find them again without an account.
        </p>
        <Button asChild className="mt-6">
          <Link href="/new">
            <PlusIcon data-icon="inline-start" /> Create your first sheet
          </Link>
        </Button>
      </div>
    )
  }

  const hosting = rows.filter((r) => r.role === "host")
  const joined = rows.filter((r) => r.role !== "host")

  return (
    <div className="space-y-10">
      {offline && (
        <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm">
          Couldn&apos;t load the latest progress — you might be offline. Your sheets are still listed below.
        </p>
      )}
      {hosting.length > 0 && <Group title="You're hosting" rows={hosting} onForget={setForget} />}
      {joined.length > 0 && <Group title="You've joined or viewed" rows={joined} onForget={setForget} />}
      <p className="text-xs text-muted-foreground">
        This list lives only in this browser. Clearing your browsing data removes it — keep your manage links
        somewhere safe.
      </p>

      <ConfirmDialog
        open={forget !== null}
        onOpenChange={(open) => !open && setForget(null)}
        title="Remove from this device?"
        description={
          forget?.role === "host"
            ? "The sheet stays online, but this device forgets its manage link. You'll need the link to edit it again."
            : "The sheet stays online — this just removes it from your list."
        }
        confirmLabel="Remove"
        destructive={forget?.role === "host"}
        onConfirm={async () => {
          if (!forget) return
          localStore.forgetSheet(forget.slug)
          setRows((rs) => rs?.filter((r) => r.slug !== forget.slug) ?? null)
          toast.success("Removed from this device")
        }}
      />
    </div>
  )
}

function Group({ title, rows, onForget }: { title: string; rows: Row[]; onForget: (r: Row) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className="space-y-3">
        {rows.map((r) => (
          <SheetRow key={r.slug} row={r} onForget={() => onForget(r)} />
        ))}
      </ul>
    </section>
  )
}

function SheetRow({ row, onForget }: { row: Row; onForget: () => void }) {
  const s = row.summary
  const pct = s && s.total ? Math.round((s.filled / s.total) * 100) : 0
  const done = s ? s.total > 0 && s.filled >= s.total : false

  return (
    <li className="group relative flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-paper transition-colors hover:border-foreground/20">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {row.role === "host" && <CrownIcon className="size-4 shrink-0 text-primary" aria-label="You host this" />}
          <Link
            href={`/s/${row.slug}`}
            className="truncate font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
          >
            {s?.title ?? row.title}
          </Link>
          {s?.isClosed && <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Closed" />}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {row.missing
            ? "Deleted or expired"
            : s
              ? [s.eventDate ? formatDate(s.eventDate) : null, done ? "All covered 🎉" : `${s.filled}/${s.total} spots filled`]
                  .filter(Boolean)
                  .join(" · ")
              : "Loading…"}
        </p>
        {s && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative z-10"
        onClick={onForget}
        aria-label={`Remove ${row.title} from this device`}
      >
        <XIcon />
      </Button>
    </li>
  )
}
