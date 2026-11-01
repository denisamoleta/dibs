"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-24 text-center">
      <p className="text-5xl" aria-hidden="true">
        🫠
      </p>
      <h1 className="mt-4 text-2xl font-bold">Something went sideways</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn&apos;t load this page. It&apos;s probably temporary — give it another try.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  )
}
