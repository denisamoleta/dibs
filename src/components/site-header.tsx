import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SiteHeader({ showCreate = true, className }: { showCreate?: boolean; className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" aria-label="Dibs home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/my">My sheets</Link>
          </Button>
          <ThemeToggle />
          {showCreate && (
            <Button asChild>
              <Link href="/new">
                <PlusIcon data-icon="inline-start" />
                <span className="hidden min-[380px]:inline">Create a sheet</span>
                <span className="min-[380px]:hidden">New</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
