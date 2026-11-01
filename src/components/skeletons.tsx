import { Skeleton } from "@/components/ui/skeleton"

export function SheetSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-20 sm:px-6 sm:pt-10" aria-busy="true" aria-label="Loading sheet">
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="mt-4 h-10 w-4/5" />
      <Skeleton className="mt-3 h-5 w-1/2" />
      <Skeleton className="mt-6 h-[84px] w-full rounded-2xl" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[124px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function EditorSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-[420px] w-full rounded-2xl" />
      <Skeleton className="h-[320px] w-full rounded-2xl" />
    </div>
  )
}
