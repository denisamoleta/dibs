import { Suspense } from "react"
import type { Metadata } from "next"
import { SheetEditor } from "@/components/editor/sheet-editor"
import { EditorSkeleton } from "@/components/skeletons"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Create a sign-up sheet",
  description:
    "Make a free sign-up sheet for a potluck, volunteer shifts, a meal train or team snacks in 30 seconds. No account needed.",
  alternates: { canonical: "/new" },
}

export default function NewSheetPage({ searchParams }: PageProps<"/new">) {
  return (
    <>
      <SiteHeader showCreate={false} />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Create a sign-up sheet</h1>
        <p className="mt-1.5 mb-6 text-muted-foreground">
          Takes about 30 seconds. No account needed — for you or your guests.
        </p>
        <Suspense fallback={<EditorSkeleton />}>
          <NewSheetForm searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  )
}

async function NewSheetForm({ searchParams }: Pick<PageProps<"/new">, "searchParams">) {
  const { template } = await searchParams
  return <SheetEditor mode="create" templateId={typeof template === "string" ? template : null} />
}
