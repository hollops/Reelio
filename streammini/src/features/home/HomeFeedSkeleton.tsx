import { Container } from '../../components/layout'
import { Skeleton, SkeletonVideoCard } from '../../components/Skeleton'
import { ROW_CARD_WIDTH } from '../videos/rowLayout'

// Prompt 40 — what Home shows while its data loads: grey shapes in the EXACT layout of the real
// page (same container, same gaps, same banner height, same card width), so the page doesn't
// jump when the videos arrive — it just "fills in".

const ROWS = 3
const CARDS_PER_ROW = 6 // more than fit on any screen; the rest are clipped, like a real row

export function HomeFeedSkeleton() {
  return (
    // aria-busy: "this area is still loading". The grey shapes themselves are hidden from
    // screen readers; the one sentence below is what they hear instead.
    <Container aria-busy="true" className="space-y-10 py-6 sm:py-8">
      <p role="status" className="sr-only">
        Loading videos…
      </p>

      {/* Same shape as FeaturedBanner: on phones a 16:9 picture with text lines below it;
          from sm up, one block with the banner's minimum heights. */}
      {/* No border here: it would add 2px on top of the minimum height and make the page jump. */}
      <div aria-hidden="true" className="overflow-hidden rounded-2xl">
        <Skeleton className="aspect-video w-full rounded-none sm:aspect-auto sm:min-h-[24rem] lg:min-h-[28rem]" />
        <div className="space-y-3 p-5 sm:hidden">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      {Array.from({ length: ROWS }, (_, row) => (
        <div key={row} aria-hidden="true" className="space-y-3">
          {/* The row title: h-7 = the 28px line height of `text-title`. */}
          <div className="flex h-7 items-center">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className={`flex gap-4 overflow-hidden pb-2 ${ROW_CARD_WIDTH}`}>
            {Array.from({ length: CARDS_PER_ROW }, (_, card) => (
              <SkeletonVideoCard key={card} className="w-(--card-w) shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </Container>
  )
}
