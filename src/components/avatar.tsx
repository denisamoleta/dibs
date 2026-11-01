import { initials, nameHue } from "@/lib/format"
import { cn } from "@/lib/utils"

export function Avatar({ name, className }: { name: string; className?: string }) {
  const hue = nameHue(name)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold tracking-wide",
        "bg-[oklch(0.9_0.07_var(--h))] text-[oklch(0.35_0.09_var(--h))]",
        "dark:bg-[oklch(0.36_0.07_var(--h))] dark:text-[oklch(0.92_0.06_var(--h))]",
        className,
      )}
      style={{ "--h": hue } as React.CSSProperties}
    >
      {initials(name)}
    </span>
  )
}
