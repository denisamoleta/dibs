import { CalendarDaysIcon, MapPinIcon } from "lucide-react"
import { formatWhen } from "@/lib/format"
import { sheetProgress, type SheetDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

export function SheetHero({
  sheet,
  connection,
}: {
  sheet: SheetDTO
  connection?: "live" | "reconnecting"
}) {
  const when = formatWhen(sheet)
  const { filled, total } = sheetProgress(sheet)
  const allDone = total > 0 && filled >= total
  const pct = total ? Math.round((filled / total) * 100) : 0

  return (
    <header className="animate-rise">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="rounded-full bg-tomato-soft px-2.5 py-1 text-xs font-semibold text-primary">
          Sign-up sheet
        </span>
        {sheet.hostName && (
          <span>
            Hosted by <span className="font-semibold text-foreground">{sheet.hostName}</span>
          </span>
        )}
      </div>

      <h1 className="mt-3 text-[2rem] leading-[1.1] font-bold break-words sm:text-[2.6rem]">{sheet.title}</h1>

      {(when || sheet.location) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem]">
          {when && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon className="size-4 text-primary" aria-hidden="true" />
              <span className="sr-only">When: </span>
              {when}
            </span>
          )}
          {sheet.location && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sheet.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <MapPinIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="sr-only">Where: </span>
              <span className="break-words">{sheet.location}</span>
            </a>
          )}
        </div>
      )}

      {sheet.description && (
        <p className="mt-4 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
          {sheet.description}
        </p>
      )}

      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-paper">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold" aria-live="polite">
            {allDone ? (
              <span>Everything&apos;s covered 🎉</span>
            ) : (
              <span>
                <span className="tabular-nums">{filled}</span> of <span className="tabular-nums">{total}</span>{" "}
                spots filled
              </span>
            )}
          </p>
          {connection && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                connection === "live" ? "text-muted-foreground" : "text-destructive",
              )}
              title={connection === "live" ? "Updates appear automatically" : "Trying to reconnect"}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  connection === "live" ? "animate-live bg-success" : "bg-destructive",
                )}
                aria-hidden="true"
              />
              {connection === "live" ? "Live" : "Reconnecting…"}
            </span>
          )}
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Spots filled"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={filled}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              allDone ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </header>
  )
}
