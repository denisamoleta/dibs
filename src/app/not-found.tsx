import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-24 text-center">
        <p className="font-display text-7xl font-bold text-primary" aria-hidden="true">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold">Nothing to call dibs on here</h1>
        <p className="mt-2 text-muted-foreground">
          This sheet doesn&apos;t exist or was deleted. Double-check the link, or ask the host for a fresh one.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/new">Create a sheet</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </main>
    </>
  )
}
