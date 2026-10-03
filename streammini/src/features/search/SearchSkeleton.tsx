import { VideoGrid } from '../../components/layout'
import { Skeleton, SkeletonVideoCard } from '../../components/Skeleton'

// Prompt 64 — the FIRST search's loading state: the chip row's shape and a grid of card shapes,
// in the same grid as the real results. (Later searches keep the old results faded instead —
// see useSearchResults' `previous`.)

export function SearchSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Searching…
      </p>
      <div aria-hidden="true" className="flex gap-2 overflow-hidden">
        {/* Different widths, like real chips ("All", "Music (3)", "Education (3)"…). */}
        {['w-12', 'w-20', 'w-24', 'w-18', 'w-22', 'w-16'].map((width, i) => (
          <Skeleton key={i} className={`h-8 shrink-0 rounded-lg ${width}`} />
        ))}
      </div>
      <VideoGrid>
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonVideoCard key={i} />
        ))}
      </VideoGrid>
    </div>
  )
}
