"use client"

import { useState } from "react"
import { enUS } from "react-day-picker/locale"
import { CalendarDaysIcon, ChevronDownIcon, ClockIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateLong, formatTime, fromIsoDate, toIsoDate } from "@/lib/format"
import { cn } from "@/lib/utils"

// Native date/time inputs follow the visitor's OS language (e.g. "дд.мм.гггг").
// These always render in English, matching how dates appear on the sheet itself.

export function DatePicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = fromIsoDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            className={cn(
              "h-11 w-full justify-start rounded-xl px-3.5 text-base font-normal md:text-sm",
              !value && "text-muted-foreground/80",
              value && "pr-10",
            )}
          >
            <CalendarDaysIcon data-icon="inline-start" className="text-muted-foreground" />
            {value ? formatDateLong(value) : "Pick a date"}
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear date"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          locale={enUS}
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : "")
            setOpen(false)
          }}
          className="[--cell-size:--spacing(10)]"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0")
  const m = String((i % 4) * 15).padStart(2, "0")
  return `${h}:${m}`
})

export function TimeSelect({
  id,
  value,
  onChange,
  emptyLabel,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  emptyLabel: string
  invalid?: boolean
}) {
  // Keep an existing off-grid value (e.g. 18:10 from an older sheet) selectable.
  const options = value && !TIMES.includes(value) ? [...TIMES, value].sort() : TIMES

  return (
    <div className="relative">
      <ClockIcon
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-input bg-card pr-9 pl-10 text-base transition-[color,box-shadow,border-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/20",
          !value && "text-muted-foreground/80",
        )}
      >
        <option value="">{emptyLabel}</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {formatTime(t).replace(/^(\d+) /, "$1:00 ")}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  )
}
