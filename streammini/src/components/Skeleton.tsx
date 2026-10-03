// Grey placeholder shapes shown while content loads, in the shape of the content that's coming.
// They're hidden from screen readers ("grey box, grey box…" helps nobody); the region that is
// loading should carry aria-busy="true" instead.

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      // motion-safe: the pulse stops for users who've asked their device to reduce motion.
      className={`rounded-md bg-elevated motion-safe:animate-pulse ${className}`}
    />
  )
}

/** Lines of text; the last line is shorter, like a real paragraph. */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  )
}

/**
 * A video card in the same shape as the real VideoCard: a 16:9 thumbnail, then the channel avatar
 * beside three lines — title (20px), channel (16px, 4px gap above) and "views · date" (20px).
 * The heights match the real card exactly, so nothing jumps when the content arrives.
 */
export function SkeletonVideoCard({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-3 ${className}`}>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex-1">
          {/* Each bar is a little shorter than its line, centred in a box of the line's height. */}
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-11/12" />
          </div>
          <div className="mt-1 flex h-4 items-center">
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex h-5 items-center">
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}
