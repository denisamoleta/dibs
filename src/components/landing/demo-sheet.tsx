"use client"

import { useState } from "react"
import { RotateCcwIcon } from "lucide-react"
import { ItemCard, type ClaimFields } from "@/components/sheet/item-card"
import { sheetProgress, type ItemDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

const AT = "2026-11-01T12:00:00.000Z"

const INITIAL: ItemDTO[] = [
  {
    id: "demo-turkey",
    title: "Turkey",
    note: "Maya's got the oven",
    slots: 1,
    position: 0,
    addedBy: null,
    claims: [{ id: "c1", name: "Maya Chen", comment: "20 lb, brined", createdAt: AT }],
  },
  {
    id: "demo-sides",
    title: "Sides",
    note: null,
    slots: 3,
    position: 1,
    addedBy: null,
    claims: [
      { id: "c2", name: "Jonah", comment: "Mac & cheese", createdAt: AT },
      { id: "c3", name: "Priya S", comment: "Roasted carrots", createdAt: AT },
    ],
  },
  {
    id: "demo-pie",
    title: "Pie",
    note: "Any kind!",
    slots: 2,
    position: 2,
    addedBy: null,
    claims: [],
  },
]

/** The real sign-up UI with local state — try it right on the landing page. */
export function DemoSheet({ className }: { className?: string }) {
  const [items, setItems] = useState(INITIAL)
  const [mine, setMine] = useState<Set<string>>(new Set())
  const [fresh, setFresh] = useState<string | null>(null)
  const [seq, setSeq] = useState(0)
  const { filled, total } = sheetProgress({ items })

  async function claim(item: ItemDTO, fields: ClaimFields) {
    await new Promise((r) => setTimeout(r, 350))
    const id = `you-${seq}`
    setSeq((s) => s + 1)
    setItems((list) =>
      list.map((i) =>
        i.id === item.id
          ? { ...i, claims: [...i.claims, { id, name: fields.name, comment: fields.comment || null, createdAt: AT }] }
          : i,
      ),
    )
    setMine((m) => new Set(m).add(id))
    setFresh(id)
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 1200)
  }

  function remove(claimId: string) {
    setItems((list) => list.map((i) => ({ ...i, claims: i.claims.filter((c) => c.id !== claimId) })))
    setMine((m) => {
      const next = new Set(m)
      next.delete(claimId)
      return next
    })
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative rounded-[1.75rem] border bg-background/80 p-3 shadow-paper backdrop-blur sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1 pt-1 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">Live demo · tap a spot</p>
            <p className="truncate font-display text-xl font-bold">Friendsgiving 🦃</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {filled}/{total}
            </p>
            <p className="text-xs text-muted-foreground">filled</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              myClaimIds={mine}
              isAdmin={false}
              isClosed={false}
              defaultName=""
              freshClaimId={fresh}
              onClaim={claim}
              onUpdateClaim={async (c, comment) =>
                setItems((list) =>
                  list.map((i) => ({
                    ...i,
                    claims: i.claims.map((x) => (x.id === c.id ? { ...x, comment: comment || null } : x)),
                  })),
                )
              }
              onRemoveClaim={(c) => remove(c.id)}
            />
          ))}
        </ul>
        {mine.size > 0 && (
          <button
            type="button"
            onClick={() => {
              setItems(INITIAL)
              setMine(new Set())
            }}
            className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcwIcon className="size-3" /> Reset demo
          </button>
        )}
      </div>
    </div>
  )
}
