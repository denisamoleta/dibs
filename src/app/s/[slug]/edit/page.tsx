import { Suspense } from "react"
import type { Metadata } from "next"
import { EditorSkeleton } from "@/components/skeletons"
import { SiteHeader } from "@/components/site-header"
import { EditSheet } from "./edit-sheet"

export const metadata: Metadata = {
  title: "Edit sheet",
  robots: { index: false, follow: false },
}

export default function EditPage({ params }: PageProps<"/s/[slug]/edit">) {
  return (
    <>
      <SiteHeader showCreate={false} />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Edit sheet</h1>
        <p className="mt-1.5 mb-6 text-muted-foreground">
          Changes show up for everyone right away. Existing sign-ups are kept.
        </p>
        <Suspense fallback={<EditorSkeleton />}>
          {params.then(({ slug }) => (
            <EditSheet slug={slug} />
          ))}
        </Suspense>
      </main>
    </>
  )
}
