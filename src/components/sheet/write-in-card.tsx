"use client"

import { useId, useState } from "react"
import { CheckIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LIMITS } from "@/lib/validation"

export function WriteInCard({
  defaultName,
  onSubmit,
}: {
  defaultName: string
  onSubmit: (fields: { name: string; title: string }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [name, setName] = useState(defaultName)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setName((n) => n || defaultName)
          setOpen(true)
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <SparklesIcon className="size-4 text-primary" />
        Bringing something that&apos;s not on the list?
      </button>
    )
  }

  return (
    <form
      className="animate-rise mt-3 space-y-3 rounded-2xl border bg-card p-4 shadow-paper sm:p-5"
      noValidate
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return setError("What are you bringing?")
        if (!name.trim()) return setError("Add your name so everyone knows who's on it.")
        setPending(true)
        setError(null)
        try {
          await onSubmit({ title: title.trim(), name: name.trim() })
          setTitle("")
          setOpen(false)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't add that. Try again?")
        } finally {
          setPending(false)
        }
      }}
    >
      <h3 className="text-base font-semibold">Add your own item</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-title`}>What are you bringing?</Label>
          <Input
            id={`${id}-title`}
            autoFocus
            value={title}
            maxLength={LIMITS.itemTitle}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Homemade lemonade"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-name`}>Your name</Label>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={LIMITS.name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <CheckIcon strokeWidth={3} />}
          Add &amp; call dibs
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
