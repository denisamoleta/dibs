"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Loader2Icon,
  MinusIcon,
  MoreVerticalIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, api } from "@/lib/api-client"
import { localStore } from "@/lib/local-store"
import { BLANK_TEMPLATE, TEMPLATES, getTemplate, type Template } from "@/lib/templates"
import type { SheetDTO } from "@/lib/types"
import { cn } from "@/lib/utils"
import { LIMITS, fieldErrors, sheetInputSchema, type SheetInput } from "@/lib/validation"

type Row = { key: string; id?: string; title: string; note: string; showNote: boolean; slots: number; taken: number }

let keySeq = 0
const nextKey = () => `row-${++keySeq}`

function rowsFromTemplate(t: Template): Row[] {
  return t.items.map((i) => ({
    key: nextKey(),
    title: i.title,
    note: i.note ?? "",
    showNote: Boolean(i.note),
    slots: i.slots,
    taken: 0,
  }))
}

function rowsFromSheet(sheet: SheetDTO): Row[] {
  return sheet.items.map((i) => ({
    key: nextKey(),
    id: i.id,
    title: i.title,
    note: i.note ?? "",
    showNote: Boolean(i.note),
    slots: i.slots,
    taken: i.claims.length,
  }))
}

type Props =
  | { mode: "create"; templateId?: string | null }
  | { mode: "edit"; sheet: SheetDTO; adminToken: string }

export function SheetEditor(props: Props) {
  const router = useRouter()
  const formId = useId()
  const initialTemplate = props.mode === "create" ? getTemplate(props.templateId) : BLANK_TEMPLATE
  const existing = props.mode === "edit" ? props.sheet : null

  const [template, setTemplate] = useState<Template>(initialTemplate)
  const [title, setTitle] = useState(existing?.title ?? "")
  const [hostName, setHostName] = useState(existing?.hostName ?? "")
  const [eventDate, setEventDate] = useState(existing?.eventDate ?? "")
  const [startTime, setStartTime] = useState(existing?.startTime ?? "")
  const [endTime, setEndTime] = useState(existing?.endTime ?? "")
  const [location, setLocation] = useState(existing?.location ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [allowWriteIns, setAllowWriteIns] = useState(existing?.allowWriteIns ?? initialTemplate.allowWriteIns)
  const [rows, setRows] = useState<Row[]>(() =>
    existing ? rowsFromSheet(existing) : rowsFromTemplate(initialTemplate),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [itemsTouched, setItemsTouched] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null)
  const [pendingRemove, setPendingRemove] = useState<number | null>(null)
  const focusRow = useRef<number | null>(null)
  const honeypot = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.mode === "create") {
      // Prefill the host's name if this device has used Dibs before.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHostName((n) => n || localStore.getName())
    }
  }, [props.mode])

  useEffect(() => {
    if (focusRow.current === null) return
    document.getElementById(`${formId}-item-${focusRow.current}`)?.focus()
    focusRow.current = null
  })

  useEffect(() => {
    if (!dirty || submitting) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, submitting])

  const touch = () => setDirty(true)
  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key]
      return next
    })

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setItemsTouched(true)
    touch()
  }

  function addRow(after = rows.length - 1) {
    setRows((rs) => {
      const next = [...rs]
      next.splice(after + 1, 0, { key: nextKey(), title: "", note: "", showNote: false, slots: 1, taken: 0 })
      return next
    })
    focusRow.current = after + 1
    setItemsTouched(true)
    touch()
  }

  function removeRow(index: number) {
    setRows((rs) => rs.filter((_, i) => i !== index))
    setErrors({})
    setItemsTouched(true)
    touch()
  }

  function moveRow(index: number, dir: -1 | 1) {
    setRows((rs) => {
      const target = index + dir
      if (target < 0 || target >= rs.length) return rs
      const next = [...rs]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setErrors({})
    touch()
  }

  function applyTemplate(t: Template) {
    setTemplate(t)
    setRows(rowsFromTemplate(t))
    setAllowWriteIns(t.allowWriteIns)
    setItemsTouched(false)
    setErrors({})
    window.history.replaceState(window.history.state, "", t.id === "blank" ? "/new" : `/new?template=${t.id}`)
  }

  function chooseTemplate(t: Template) {
    if (t.id === template.id) return
    if (itemsTouched) setPendingTemplate(t)
    else applyTemplate(t)
  }

  function payload(): SheetInput {
    return {
      title,
      hostName,
      eventDate,
      startTime,
      endTime,
      location,
      description,
      allowWriteIns,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      website: honeypot.current?.value || undefined,
      items: rows
        .filter((r) => r.title.trim() || r.id)
        .map((r) => ({ id: r.id, title: r.title, note: r.note, slots: r.slots })),
    }
  }

  function focusFirstError(errs: Record<string, string>) {
    const first = Object.keys(errs)[0]
    if (!first) return
    const match = first.match(/^items\.(\d+)\.(\w+)/)
    const id = match
      ? `${formId}-item-${match[1]}${match[2] === "title" ? "" : `-${match[2]}`}`
      : `${formId}-${first === "items" ? "add-item" : first}`
    const el = document.getElementById(id)
    el?.focus()
    el?.scrollIntoView({ block: "center", behavior: "smooth" })
  }

  // Row indexes in the payload skip empty rows; map errors back to on-screen rows.
  function remapItemErrors(errs: Record<string, string>) {
    const visible = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.title.trim() || r.id)
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(errs)) {
      const m = k.match(/^items\.(\d+)(.*)$/)
      out[m ? `items.${visible[Number(m[1])]?.i ?? m[1]}${m[2]}` : k] = v
    }
    return out
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = payload()
    const parsed = sheetInputSchema.safeParse(body)
    if (!parsed.success) {
      const errs = remapItemErrors(fieldErrors(parsed.error))
      setErrors(errs)
      focusFirstError(errs)
      return
    }

    setSubmitting(true)
    try {
      if (props.mode === "create") {
        const { adminToken, sheet } = await api.createSheet(body)
        localStore.setAdminToken(sheet.slug, adminToken)
        localStore.rememberSheet({ slug: sheet.slug, title: sheet.title, role: "host" })
        if (hostName.trim()) localStore.setName(hostName.trim())
        try {
          window.sessionStorage.setItem(`dibs:created:${sheet.slug}`, "1")
        } catch {
          /* storage unavailable */
        }
        router.push(`/s/${sheet.slug}`)
      } else {
        await api.updateSheet(props.sheet.slug, props.adminToken, body)
        toast.success("Changes saved")
        router.push(`/s/${props.sheet.slug}`)
      }
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.fields) {
        const errs = remapItemErrors(err.fields)
        setErrors(errs)
        focusFirstError(errs)
      }
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  const fieldId = (name: string) => `${formId}-${name}`
  const err = (name: string) => errors[name]

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" onChange={touch}>
      {props.mode === "create" && (
        <section aria-labelledby={fieldId("tpl-heading")}>
          <h2 id={fieldId("tpl-heading")} className="sr-only">
            Start from a template
          </h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {[...TEMPLATES, BLANK_TEMPLATE].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseTemplate(t)}
                aria-pressed={template.id === t.id}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                  template.id === t.id
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card hover:border-foreground/30",
                )}
              >
                <span aria-hidden="true">{t.emoji}</span>
                {t.id === "blank" ? "Blank" : t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <Card title="The basics" description="Only the title is required.">
        <Field id={fieldId("title")} label="What are you organizing?" error={err("title")}>
          <Input
            id={fieldId("title")}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              clearError("title")
            }}
            placeholder={template.titlePlaceholder}
            maxLength={LIMITS.title}
            aria-invalid={err("title") ? true : undefined}
            aria-describedby={err("title") ? `${fieldId("title")}-error` : undefined}
            className="h-12 text-base font-medium md:text-base"
            autoFocus={props.mode === "create"}
          />
        </Field>

        <Field id={fieldId("hostName")} label="Your name" hint="Shown as “Hosted by …”">
          <Input
            id={fieldId("hostName")}
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="e.g. Maya"
            autoComplete="name"
            maxLength={LIMITS.hostName}
            aria-describedby={`${fieldId("hostName")}-hint`}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr_1fr]">
          <Field id={fieldId("eventDate")} label="Date" error={err("eventDate")}>
            <Input
              id={fieldId("eventDate")}
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value)
                clearError("eventDate")
              }}
              aria-invalid={err("eventDate") ? true : undefined}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:contents">
            <Field id={fieldId("startTime")} label="Starts" error={err("startTime")}>
              <Input
                id={fieldId("startTime")}
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  clearError("startTime")
                  clearError("eventDate")
                }}
                aria-invalid={err("startTime") ? true : undefined}
              />
            </Field>
            <Field id={fieldId("endTime")} label="Ends" error={err("endTime")}>
              <Input
                id={fieldId("endTime")}
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  clearError("startTime")
                }}
              />
            </Field>
          </div>
        </div>

        <Field id={fieldId("location")} label="Where" error={err("location")}>
          <Input
            id={fieldId("location")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Address, park, room 12…"
            maxLength={LIMITS.location}
          />
        </Field>

        <Field id={fieldId("description")} label="Notes for everyone" error={err("description")}>
          <Textarea
            id={fieldId("description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={template.descriptionPlaceholder}
            maxLength={LIMITS.description}
            rows={3}
          />
        </Field>
      </Card>

      <Card
        title="What's needed"
        description="Add each thing people can sign up for, and how many people can take it."
      >
        <ol className="space-y-2.5">
          {rows.map((row, index) => (
            <ItemRow
              key={row.key}
              row={row}
              index={index}
              count={rows.length}
              idBase={`${formId}-item-${index}`}
              errors={{
                title: errors[`items.${index}.title`],
                slots: errors[`items.${index}.slots`],
                note: errors[`items.${index}.note`],
              }}
              onChange={(patch) => {
                updateRow(index, patch)
                if ("title" in patch) clearError(`items.${index}.title`)
                if ("slots" in patch) clearError(`items.${index}.slots`)
                clearError("items")
              }}
              onEnter={() => addRow(index)}
              onMove={(dir) => moveRow(index, dir)}
              onRemove={() => (row.taken > 0 ? setPendingRemove(index) : removeRow(index))}
            />
          ))}
        </ol>
        {err("items") && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {err("items")}
          </p>
        )}
        <Button
          id={fieldId("add-item")}
          type="button"
          variant="soft"
          onClick={() => addRow()}
          disabled={rows.length >= LIMITS.maxItems}
          className="w-full sm:w-auto"
        >
          <PlusIcon data-icon="inline-start" /> Add item
        </Button>
        <p className="text-xs text-muted-foreground">Tip: press Enter in an item to add the next one.</p>
      </Card>

      <Card title="Options">
        <label
          htmlFor={fieldId("writeins")}
          className="flex cursor-pointer items-start justify-between gap-4 rounded-xl"
        >
          <span>
            <span className="block text-sm font-semibold">Let people add their own items</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Great for potlucks: guests can add “I&apos;ll bring lemonade” if it&apos;s not on your list.
            </span>
          </span>
          <Switch
            id={fieldId("writeins")}
            checked={allowWriteIns}
            onCheckedChange={(v) => {
              setAllowWriteIns(v)
              touch()
            }}
            className="mt-1"
          />
        </label>
      </Card>

      {/* Honeypot for bots. Hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-3">
          {props.mode === "edit" && (
            <Button type="button" variant="ghost" size="lg" onClick={() => router.push(`/s/${props.sheet.slug}`)}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={submitting}>
            {submitting ? <Loader2Icon className="animate-spin" /> : null}
            {props.mode === "create" ? "Create sheet" : "Save changes"}
            {!submitting && <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingTemplate !== null}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
        title={`Switch to ${pendingTemplate?.name ?? "this template"}?`}
        description="This replaces the items you've added so far."
        confirmLabel="Replace items"
        onConfirm={async () => {
          if (pendingTemplate) applyTemplate(pendingTemplate)
        }}
      />
      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => !open && setPendingRemove(null)}
        title="Remove this item?"
        description={
          pendingRemove !== null
            ? `${rows[pendingRemove]?.taken ?? 0} ${rows[pendingRemove]?.taken === 1 ? "person has" : "people have"} signed up for “${rows[pendingRemove]?.title}”. Their sign-ups will be removed when you save.`
            : null
        }
        confirmLabel="Remove item"
        destructive
        onConfirm={async () => {
          if (pendingRemove !== null) removeRow(pendingRemove)
        }}
      />
    </form>
  )
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-paper sm:p-6">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && (
          <span id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function ItemRow({
  row,
  index,
  count,
  idBase,
  errors,
  onChange,
  onEnter,
  onMove,
  onRemove,
}: {
  row: Row
  index: number
  count: number
  idBase: string
  errors: { title?: string; slots?: string; note?: string }
  onChange: (patch: Partial<Row>) => void
  onEnter: () => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const setSlots = (n: number) => onChange({ slots: Math.max(1, Math.min(LIMITS.maxSlots, n || 1)) })
  const errorText = errors.title ?? errors.slots ?? errors.note

  return (
    <li className="animate-rise rounded-xl border bg-background/60 p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <span className="hidden w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums sm:block">
          {index + 1}
        </span>
        <Input
          id={idBase}
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onEnter()
            }
          }}
          placeholder={index === 0 ? "e.g. Dessert" : "Another item"}
          maxLength={LIMITS.itemTitle}
          aria-label={`Item ${index + 1}`}
          aria-invalid={errors.title ? true : undefined}
          className="min-w-0 flex-1"
        />
        <div
          className={cn(
            "flex h-11 shrink-0 items-center rounded-xl border bg-card",
            errors.slots && "border-destructive",
          )}
          role="group"
          aria-label={`Spots for item ${index + 1}`}
        >
          <button
            type="button"
            className="flex h-full w-8 items-center justify-center rounded-l-xl text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={() => setSlots(row.slots - 1)}
            disabled={row.slots <= Math.max(1, row.taken)}
            aria-label="Fewer spots"
          >
            <MinusIcon className="size-3.5" />
          </button>
          <input
            id={`${idBase}-slots`}
            inputMode="numeric"
            value={row.slots}
            onChange={(e) => setSlots(Number(e.target.value.replace(/\D/g, "")))}
            className="h-full w-7 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
            aria-label="Number of spots"
          />
          <button
            type="button"
            className="flex h-full w-8 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground disabled:opacity-30"
            onClick={() => setSlots(row.slots + 1)}
            disabled={row.slots >= LIMITS.maxSlots}
            aria-label="More spots"
          >
            <PlusIcon className="size-3.5" />
          </button>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={`Options for item ${index + 1}`}>
              <MoreVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onChange({ showNote: !row.showNote, note: row.showNote ? "" : row.note })}>
              <StickyNoteIcon /> {row.showNote ? "Remove note" : "Add a note"}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
              <ArrowUpIcon /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMove(1)}>
              <ArrowDownIcon /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={count <= 1} onSelect={onRemove}>
              <Trash2Icon /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {row.showNote && (
        <Input
          id={`${idBase}-note`}
          value={row.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Note, e.g. “serves 8” or “drop off by 5 PM”"
          maxLength={LIMITS.itemNote}
          aria-label={`Note for item ${index + 1}`}
          className="mt-2 h-10 sm:ml-7 sm:w-[calc(100%-1.75rem)]"
        />
      )}
      {row.taken > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground sm:ml-7">
          {row.taken} signed up — spots can&apos;t go below {row.taken}.
        </p>
      )}
      {errorText && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-destructive sm:ml-7">
          {errorText}
        </p>
      )}
    </li>
  )
}
