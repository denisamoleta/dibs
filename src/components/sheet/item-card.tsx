"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CheckIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Avatar } from "@/components/avatar"
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
import { LIMITS } from "@/lib/validation"
import type { ClaimDTO, ItemDTO } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Burst } from "./burst"

export type ClaimFields = { name: string; comment: string }

type Props = {
  item: ItemDTO
  myClaimIds: ReadonlySet<string>
  isAdmin: boolean
  isClosed: boolean
  defaultName: string
  freshClaimId: string | null
  onClaim: (item: ItemDTO, fields: ClaimFields) => Promise<void>
  onUpdateClaim: (claim: ClaimDTO, comment: string) => Promise<void>
  onRemoveClaim: (claim: ClaimDTO, item: ItemDTO) => void
}

export function ItemCard({
  item,
  myClaimIds,
  isAdmin,
  isClosed,
  defaultName,
  freshClaimId,
  onClaim,
  onUpdateClaim,
  onRemoveClaim,
}: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const taken = item.claims.length
  const open = Math.max(item.slots - taken, 0)
  const covered = open === 0
  const mineHere = item.claims.some((c) => myClaimIds.has(c.id))
  const headingId = useId()

  // If the last spot disappears while the form is open (someone else was faster), close it.
  const showForm = formOpen && !covered && !isClosed

  return (
    <li
      aria-labelledby={headingId}
      className={cn(
        "relative rounded-2xl border bg-card p-4 shadow-paper transition-colors duration-500 sm:p-5",
        covered && "border-success/25 bg-[color-mix(in_oklch,var(--card),var(--success-soft)_55%)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="text-[1.05rem] leading-snug font-semibold break-words">
            {item.title}
          </h3>
          {item.note && <p className="mt-0.5 text-sm break-words text-muted-foreground">{item.note}</p>}
          {item.addedBy && (
            <p className="mt-0.5 text-xs text-muted-foreground">Suggested by {item.addedBy}</p>
          )}
        </div>
        <SpotsBadge taken={taken} slots={item.slots} />
      </div>

      <SpotMeter slots={item.slots} taken={taken} />

      {item.claims.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label={`Signed up for ${item.title}`}>
          {item.claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              mine={myClaimIds.has(claim.id)}
              canManage={myClaimIds.has(claim.id) || isAdmin}
              fresh={claim.id === freshClaimId}
              onUpdate={(comment) => onUpdateClaim(claim, comment)}
              onRemove={() => onRemoveClaim(claim, item)}
            />
          ))}
        </ul>
      )}

      {!covered && !isClosed && !showForm && (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="group mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 px-3 py-2.5 text-sm font-semibold text-primary transition-all hover:border-primary/60 hover:bg-tomato-soft focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-[0.99]"
          aria-label={`Call dibs on ${item.title}`}
        >
          <PlusIcon className="size-4 transition-transform group-hover:rotate-90" />
          {mineHere ? "Take another spot" : "Call dibs"}
          {open > 1 && <span className="font-normal text-primary/75">· {open} spots left</span>}
        </button>
      )}

      {showForm && (
        <ClaimForm
          itemTitle={item.title}
          defaultName={defaultName}
          onCancel={() => setFormOpen(false)}
          onSubmit={async (fields) => {
            await onClaim(item, fields)
            setFormOpen(false)
          }}
        />
      )}
    </li>
  )
}

function SpotsBadge({ taken, slots }: { taken: number; slots: number }) {
  if (taken >= slots) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
        <CheckIcon className="size-3.5" strokeWidth={3} /> Covered
      </span>
    )
  }
  return (
    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
      <span className="sr-only">
        {taken} of {slots} spots taken
      </span>
      <span aria-hidden="true">
        {taken}/{slots}
      </span>
    </span>
  )
}

function SpotMeter({ slots, taken }: { slots: number; taken: number }) {
  const covered = taken >= slots
  if (slots <= 12) {
    return (
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-500",
              i < taken ? (covered ? "bg-success" : "bg-primary") : "bg-muted",
            )}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", covered ? "bg-success" : "bg-primary")}
        style={{ width: `${Math.min(100, (taken / slots) * 100)}%` }}
      />
    </div>
  )
}

function ClaimRow({
  claim,
  mine,
  canManage,
  fresh,
  onUpdate,
  onRemove,
}: {
  claim: ClaimDTO
  mine: boolean
  canManage: boolean
  fresh: boolean
  onUpdate: (comment: string) => Promise<void>
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <li
      className={cn(
        "relative -mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5",
        mine && "bg-highlight/70 dark:bg-highlight/60",
        fresh && "animate-pop",
      )}
    >
      <Avatar name={claim.name} />
      {editing ? (
        <NoteEditor
          initial={claim.comment ?? ""}
          onCancel={() => setEditing(false)}
          onSave={async (comment) => {
            await onUpdate(comment)
            setEditing(false)
          }}
        />
      ) : (
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm leading-tight font-medium">
            <span className="break-words">{claim.name}</span>
            {mine && (
              <span className="rounded-full bg-highlight-foreground/10 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-highlight-foreground uppercase">
                You
              </span>
            )}
          </p>
          {claim.comment && (
            <p className="mt-0.5 text-sm leading-snug break-words text-muted-foreground">{claim.comment}</p>
          )}
        </div>
      )}
      {canManage && !editing && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Options for ${claim.name}'s sign-up`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <PencilIcon /> {claim.comment ? "Edit note" : "Add a note"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              <Trash2Icon /> {mine ? "Remove my sign-up" : "Remove sign-up"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {fresh && <Burst />}
    </li>
  )
}

function NoteEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (comment: string) => Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="flex min-w-0 flex-1 flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        setError(null)
        try {
          await onSave(value)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't save that.")
        } finally {
          setPending(false)
        }
      }}
    >
      <div className="flex gap-2">
        <Input
          autoFocus
          value={value}
          maxLength={LIMITS.comment}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a note (e.g. gluten-free)"
          aria-label="Note"
          className="h-9"
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
        />
        <Button type="submit" size="sm" className="h-9" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-9" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}

function ClaimForm({
  itemTitle,
  defaultName,
  onSubmit,
  onCancel,
}: {
  itemTitle: string
  defaultName: string
  onSubmit: (fields: ClaimFields) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const noteRef = useRef<HTMLInputElement>(null)
  const id = useId()

  useEffect(() => {
    // Returning visitors already have a name: jump straight to the note.
    ;(defaultName ? noteRef : nameRef).current?.focus()
  }, [defaultName])

  return (
    <form
      className="animate-rise mt-3 space-y-3 rounded-xl border border-primary/25 bg-tomato-soft/50 p-3 sm:p-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError("Add your name so everyone knows who's on it.")
          nameRef.current?.focus()
          return
        }
        setPending(true)
        setError(null)
        try {
          await onSubmit({ name: name.trim(), comment: comment.trim() })
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't save that. Try again?")
        } finally {
          setPending(false)
        }
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-name`}>Your name</Label>
          <Input
            ref={nameRef}
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={LIMITS.name}
            placeholder="e.g. Alex"
            aria-invalid={error && !name.trim() ? true : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-note`}>
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            ref={noteRef}
            id={`${id}-note`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={LIMITS.comment}
            placeholder="e.g. vegan lasagna"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon strokeWidth={3} />}
          Call dibs on {itemTitle.length > 24 ? "this" : itemTitle}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
