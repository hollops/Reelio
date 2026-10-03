import { Container } from '../../components/layout'
import { Skeleton } from '../../components/Skeleton'

// Prompt 55 — the Watch page while its video loads: grey shapes in the SAME grid as WatchView
// (player, title, channel row, description box, and Up next on the right), so the real page
// "fills in" instead of jumping into place.

export function WatchSkeleton() {
  return (
    <Container aria-busy="true" className="py-4 sm:py-6">
      <p role="status" className="sr-only">
        Loading video…
      </p>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:gap-8">
        <div className="min-w-0 space-y-4">
          {/* Same edge-to-edge-on-phones rule as the real player (Prompt 56). */}
          <Skeleton className="-mx-4 aspect-video rounded-none sm:mx-0 sm:rounded-xl" />
          <Skeleton className="h-7 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <UpNextSkeleton />
      </div>
    </Container>
  )
}

/**
 * Prompt 97 — the Up next column's own skeleton. Used inside the page skeleton above AND on its
 * own while just the list is still loading (the video can arrive first), so the right-hand
 * column is never an empty gap.
 */
export function UpNextSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <Skeleton className="h-7 w-24" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="aspect-video w-40 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 py-0.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
