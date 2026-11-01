"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LockIcon } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { LogoMark } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api-client"
import { localStore } from "@/lib/local-store"
import { etagOf, type ClaimDTO, type ItemDTO, type SheetDTO } from "@/lib/types"
import { ItemCard, type ClaimFields } from "./item-card"
import { CalendarMenu, CopyListMenu, ShareButton } from "./share-actions"
import { HostPanel } from "./host-panel"
import { SheetHero } from "./sheet-hero"
import { WriteInCard } from "./write-in-card"

const FAST_MS = 4_000
const SLOW_MS = 20_000
const IDLE_AFTER_MS = 5 * 60_000
const IDLE_MS = 60_000

type DeviceState = {
  ready: boolean
  origin: string
  adminToken: string | null
  claimTokens: Record<string, string>
  name: string
  justCreated: boolean
}

// "Just created" is a one-shot flag; memoize it so effect re-runs (Strict Mode) see the same answer.
const createdFlags = new Map<string, boolean>()
function consumeCreatedFlag(slug: string): boolean {
  if (!createdFlags.has(slug)) {
    let value = false
    try {
      value = window.sessionStorage.getItem(`dibs:created:${slug}`) === "1"
      window.sessionStorage.removeItem(`dibs:created:${slug}`)
    } catch {
      /* storage unavailable */
    }
    createdFlags.set(slug, value)
  }
  return createdFlags.get(slug)!
}

/** Reads what this device knows (manage key, own sign-ups, name). Runs after hydration. */
function readDevice(slug: string): DeviceState {
  let adminToken = localStore.getAdminToken(slug)
  // A manage key in the URL fragment is moved into storage and scrubbed from the address bar,
  // so copying the address bar never leaks it.
  const match = window.location.hash.match(/manage=([\w-]{20,128})/)
  if (match) {
    adminToken = match[1]
    localStore.setAdminToken(slug, adminToken)
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search)
  }
  return {
    ready: true,
    origin: window.location.origin,
    adminToken,
    claimTokens: localStore.getClaimTokens(),
    name: localStore.getName(),
    justCreated: consumeCreatedFlag(slug),
  }
}

export function SheetView({ initialSheet }: { initialSheet: SheetDTO }) {
  const slug = initialSheet.slug
  const router = useRouter()
  const [sheet, setSheet] = useState(initialSheet)
  const [device, setDevice] = useState<DeviceState>({
    ready: false,
    origin: "",
    adminToken: null,
    claimTokens: {},
    name: "",
    justCreated: false,
  })
  const [adminChecked, setAdminChecked] = useState(false)
  const [connection, setConnection] = useState<"live" | "reconnecting">("live")
  const [gone, setGone] = useState(false)
  const [freshClaimId, setFreshClaimId] = useState<string | null>(null)
  const [removal, setRemoval] = useState<{ claim: ClaimDTO; item: ItemDTO } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const etagRef = useRef<string | null>(etagOf(initialSheet))
  const versionRef = useRef(initialSheet.version)

  const apply = useCallback((next: SheetDTO) => {
    if (next.version < versionRef.current) return // an older poll finished after a newer write
    versionRef.current = next.version
    etagRef.current = etagOf(next)
    setSheet(next)
  }, [])

  useEffect(() => {
    // Device storage only exists in the browser; reading it here keeps SSR and hydration identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDevice(readDevice(slug))
  }, [slug])

  const { adminToken, claimTokens } = device
  // Trust a stored manage key optimistically (no guest→host flash); the first poll confirms it.
  const isHost = Boolean(adminToken) && (sheet.isAdmin || !adminChecked)

  useEffect(() => {
    if (!device.ready) return
    localStore.rememberSheet({ slug, title: sheet.title, role: adminToken ? "host" : "guest" })
  }, [device.ready, slug, sheet.title, adminToken])

  // Live updates: adaptive polling with ETags. Fast while things happen, slower when quiet,
  // paused in background tabs, and woken instantly on focus.
  useEffect(() => {
    if (!device.ready) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let delay = FAST_MS
    let lastActivity = Date.now()
    // With a manage key we need one full fetch to learn whether it's valid.
    if (adminToken) etagRef.current = null

    async function poll() {
      if (cancelled || document.visibilityState === "hidden") return
      try {
        const res = await api.getSheet(slug, adminToken, etagRef.current)
        if (cancelled) return
        setConnection("live")
        if (res.data) {
          if (adminToken) {
            setAdminChecked(true)
            if (!res.data.isAdmin) {
              localStore.clearAdminToken(slug)
              setDevice((d) => ({ ...d, adminToken: null }))
              toast.error("That manage link isn't valid for this sheet.")
            }
          }
          const changed = res.data.version !== versionRef.current
          apply(res.data)
          delay = changed ? FAST_MS : Math.min(delay * 1.5, SLOW_MS)
        } else {
          delay = Math.min(delay * 1.5, SLOW_MS)
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setGone(true)
          return
        }
        setConnection("reconnecting")
        delay = Math.min(delay * 2, SLOW_MS)
      }
      if (Date.now() - lastActivity > IDLE_AFTER_MS) delay = Math.max(delay, IDLE_MS)
      timer = setTimeout(poll, delay)
    }

    function wake() {
      if (document.visibilityState !== "visible") return
      lastActivity = Date.now()
      delay = FAST_MS
      clearTimeout(timer)
      poll()
    }
    const touch = () => {
      lastActivity = Date.now()
    }

    timer = setTimeout(poll, adminToken ? 0 : FAST_MS)
    document.addEventListener("visibilitychange", wake)
    window.addEventListener("focus", wake)
    window.addEventListener("online", wake)
    window.addEventListener("pointerdown", touch)
    window.addEventListener("keydown", touch)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("focus", wake)
      window.removeEventListener("online", wake)
      window.removeEventListener("pointerdown", touch)
      window.removeEventListener("keydown", touch)
    }
  }, [device.ready, slug, adminToken, apply])

  const refresh = useCallback(async () => {
    try {
      const res = await api.getSheet(slug, adminToken, null)
      if (res.data) apply(res.data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setGone(true)
    }
  }, [slug, adminToken, apply])

  const myClaimIds = useMemo(() => new Set(Object.keys(claimTokens)), [claimTokens])
  const guestUrl = device.origin ? `${device.origin}/s/${slug}` : ""
  const manageUrl = guestUrl && adminToken ? `${guestUrl}#manage=${adminToken}` : ""

  function rememberClaim(claimId: string, editToken: string, name: string) {
    localStore.setClaimToken(claimId, editToken)
    localStore.setName(name)
    setDevice((d) => ({ ...d, name, claimTokens: { ...d.claimTokens, [claimId]: editToken } }))
    setFreshClaimId(claimId)
    setTimeout(() => setFreshClaimId((id) => (id === claimId ? null : id)), 1200)
  }

  async function handleClaim(item: ItemDTO, fields: ClaimFields) {
    try {
      const res = await api.claim(
        slug,
        item.id,
        { name: fields.name, comment: fields.comment || undefined },
        adminToken,
      )
      apply(res.sheet)
      rememberClaim(res.claimId, res.editToken, fields.name)
      toast.success(`Dibs! You're down for ${item.title}.`)
    } catch (err) {
      if (err instanceof ApiError && ["full", "closed", "not_found"].includes(err.code)) {
        toast.error(err.message)
        await refresh()
      }
      throw err
    }
  }

  async function handleWriteIn(fields: { name: string; title: string }) {
    const res = await api.writeIn(slug, fields, adminToken)
    apply(res.sheet)
    rememberClaim(res.claimId, res.editToken, fields.name)
    toast.success(`Added ${fields.title} — thanks!`)
  }

  async function handleUpdateClaim(claim: ClaimDTO, comment: string) {
    const next = await api.updateClaim(slug, claim.id, { comment }, {
      editToken: claimTokens[claim.id],
      adminToken,
    })
    apply(next)
    toast.success("Note saved")
  }

  async function handleRemoveClaim() {
    if (!removal) return
    const { claim } = removal
    try {
      const next = await api.removeClaim(slug, claim.id, { editToken: claimTokens[claim.id], adminToken })
      apply(next)
      if (claimTokens[claim.id]) {
        localStore.removeClaimToken(claim.id)
        setDevice((d) => {
          const rest = { ...d.claimTokens }
          delete rest[claim.id]
          return { ...d, claimTokens: rest }
        })
      }
      toast.success("Sign-up removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove that sign-up.")
      throw err
    }
  }

  async function handleToggleClosed() {
    if (!adminToken) return
    try {
      const next = await api.setClosed(slug, adminToken, !sheet.isClosed)
      apply(next)
      toast.success(next.isClosed ? "Sign-ups closed" : "Sign-ups reopened")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the sheet.")
    }
  }

  async function handleDelete() {
    if (!adminToken) return
    try {
      await api.deleteSheet(slug, adminToken)
      localStore.forgetSheet(slug)
      toast.success("Sheet deleted")
      router.push("/my")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the sheet.")
      throw err
    }
  }

  if (gone) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-5xl" aria-hidden="true">
          🫥
        </p>
        <h1 className="mt-4 text-2xl font-bold">This sheet was deleted</h1>
        <p className="mt-2 text-muted-foreground">The host removed it. Nothing left to sign up for here.</p>
        <Button asChild className="mt-6">
          <Link href="/new">Make your own sheet</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-20 sm:px-6 sm:pt-10">
      <SheetHero sheet={sheet} connection={connection} />

      {!device.ready ? (
        <div className="mt-4 h-10" aria-hidden="true" />
      ) : isHost ? (
        <HostPanel
          sheet={sheet}
          guestUrl={guestUrl}
          manageUrl={manageUrl}
          justCreated={device.justCreated}
          onToggleClosed={handleToggleClosed}
          onDelete={() => setConfirmDelete(true)}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <ShareButton sheet={sheet} url={guestUrl} variant="outline" />
          <CopyListMenu sheet={sheet} url={guestUrl} />
          <CalendarMenu sheet={sheet} url={guestUrl} />
        </div>
      )}

      {sheet.isClosed && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-foreground/10 bg-muted px-4 py-3 text-sm"
        >
          <LockIcon className="size-4 shrink-0" />
          <p>
            <span className="font-semibold">Sign-ups are closed.</span>{" "}
            {isHost ? "Reopen them anytime from the host tools." : "The host has locked this sheet."}
          </p>
        </div>
      )}

      <h2 className="sr-only">Items</h2>
      <ul className="mt-6 space-y-3">
        {sheet.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            myClaimIds={myClaimIds}
            isAdmin={isHost}
            isClosed={sheet.isClosed}
            defaultName={device.name}
            freshClaimId={freshClaimId}
            onClaim={handleClaim}
            onUpdateClaim={handleUpdateClaim}
            onRemoveClaim={(claim, item) => setRemoval({ claim, item })}
          />
        ))}
      </ul>

      {sheet.allowWriteIns && !sheet.isClosed && (
        <WriteInCard defaultName={device.name} onSubmit={handleWriteIn} />
      )}

      {!isHost && (
        <aside className="mt-12 flex flex-col items-center gap-3 rounded-2xl bg-muted/60 px-6 py-8 text-center">
          <LogoMark className="size-9" />
          <p className="font-display text-lg font-semibold">Organizing something too?</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Make a sign-up sheet like this in 30 seconds. Free, no ads, no accounts.
          </p>
          <Button asChild variant="ink">
            <Link href="/new">Create your own sheet</Link>
          </Button>
        </aside>
      )}

      <ConfirmDialog
        open={removal !== null}
        onOpenChange={(open) => !open && setRemoval(null)}
        title={removal && claimTokens[removal.claim.id] ? "Remove your sign-up?" : `Remove ${removal?.claim.name}?`}
        description={
          removal ? (
            <>
              This frees up the spot for <strong>{removal.item.title}</strong> so someone else can take it.
            </>
          ) : null
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveClaim}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this sheet?"
        description="Everyone's sign-ups will be gone and the link will stop working. This can't be undone."
        confirmLabel="Delete sheet"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
