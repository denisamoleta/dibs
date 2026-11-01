import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SheetView } from "@/components/sheet/sheet-view"
import { SheetSkeleton } from "@/components/skeletons"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { formatWhen, pluralize } from "@/lib/format"
import { sheetProgress } from "@/lib/types"
import { loadSheet } from "./data"

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const sheet = await loadSheet(slug)
  if (!sheet) return { title: "Sheet not found", robots: { index: false, follow: false } }

  const { open, total } = sheetProgress(sheet)
  const when = formatWhen(sheet)
  const status = open === 0 ? "All spots are covered" : `${pluralize(open, "spot")} open of ${total}`
  const description = [when, sheet.location, `${status} — tap to call dibs. No sign-up needed.`]
    .filter(Boolean)
    .join(" · ")

  return {
    title: sheet.title,
    description,
    // Sheets are unlisted: reachable by link, never indexed.
    robots: { index: false, follow: false },
    openGraph: { title: sheet.title, description, url: `/s/${slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: sheet.title, description },
  }
}

export default function SheetPage({ params }: PageProps<"/s/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<SheetSkeleton />}>
          <SheetLoader params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}

async function SheetLoader({ params }: Pick<PageProps<"/s/[slug]">, "params">) {
  const { slug } = await params
  const sheet = await loadSheet(slug)
  if (!sheet) notFound()
  return <SheetView initialSheet={sheet} />
}
