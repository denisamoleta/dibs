"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { KeyRoundIcon } from "lucide-react"
import { SheetEditor } from "@/components/editor/sheet-editor"
import { EditorSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/lib/api-client"
import { localStore } from "@/lib/local-store"
import type { SheetDTO } from "@/lib/types"

type State =
  | { status: "loading" }
  | { status: "ready"; sheet: SheetDTO; token: string }
  | { status: "forbidden" }
  | { status: "missing" }
  | { status: "error"; message: string }

export function EditSheet({ slug }: { slug: string }) {
  const [state, setState] = useState<State>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const token = localStore.getAdminToken(slug)
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: "forbidden" })
      return
    }
    api
      .getSheet(slug, token, null)
      .then((res) => {
        if (cancelled) return
        if (!res.data?.isAdmin) setState({ status: "forbidden" })
        else setState({ status: "ready", sheet: res.data, token })
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setState({ status: "missing" })
        else setState({ status: "error", message: err instanceof Error ? err.message : "Couldn't load the sheet." })
      })
    return () => {
      cancelled = true
    }
  }, [slug, attempt])

  if (state.status === "loading") return <EditorSkeleton />

  if (state.status === "ready") {
    return <SheetEditor mode="edit" sheet={state.sheet} adminToken={state.token} />
  }

  const copy = {
    forbidden: {
      title: "Only the host can edit this sheet",
      body: "Open your private manage link on this device first — it unlocks editing. You got it when you created the sheet.",
    },
    missing: { title: "This sheet doesn't exist", body: "It may have been deleted by the host." },
    error: { title: "Couldn't load the sheet", body: state.status === "error" ? state.message : "" },
  }[state.status]

  return (
    <div className="rounded-2xl border bg-card p-6 text-center shadow-paper sm:p-10">
      <KeyRoundIcon className="mx-auto size-8 text-primary" aria-hidden="true" />
      <h2 className="mt-3 text-xl font-bold">{copy.title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{copy.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {state.status === "error" ? (
          <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={state.status === "missing" ? "/new" : `/s/${slug}`}>
              {state.status === "missing" ? "Create a new sheet" : "Back to the sheet"}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
