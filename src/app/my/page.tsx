import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { MySheets } from "./my-sheets"

export const metadata: Metadata = {
  title: "My sheets",
  robots: { index: false, follow: true },
}

export default function MySheetsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <h1 className="text-3xl font-bold sm:text-4xl">My sheets</h1>
        <p className="mt-1.5 mb-8 text-muted-foreground">Sheets you&apos;ve made or opened on this device.</p>
        <MySheets />
      </main>
      <SiteFooter />
    </>
  )
}
