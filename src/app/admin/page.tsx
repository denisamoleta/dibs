import type { Metadata } from "next"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminDashboard } from "./admin-dashboard"

export const metadata: Metadata = {
  title: "Owner dashboard",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Dibs home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">Owner dashboard</span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16 sm:px-6">
        <h1 className="mb-1 text-3xl font-bold">How Dibs is doing</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Anonymous, aggregate numbers. No cookies, no personal data — just counts.
        </p>
        <AdminDashboard />
      </main>
    </>
  )
}
