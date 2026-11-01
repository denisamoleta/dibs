import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <circle cx="14" cy="18.5" r="6.2" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.6" />
      <rect x="18.6" y="6.5" width="3.6" height="18.4" rx="1.8" fill="var(--primary-foreground)" />
      <circle cx="8.6" cy="8.6" r="2.4" fill="#FFD84D" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-7" />
      <span className="font-display text-[1.35rem] leading-none font-bold tracking-tight">dibs</span>
    </span>
  )
}
