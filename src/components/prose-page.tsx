import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export function ProsePage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
      >
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="!mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="text-[0.95rem] text-foreground/90">{children}</div>
      </main>
      <SiteFooter />
    </>
  )
}
