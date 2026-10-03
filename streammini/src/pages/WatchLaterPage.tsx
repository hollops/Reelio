import { useEffect, useRef } from 'react'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/toast/toastContext'
import type { Video } from '../lib/types'
import { AlertIcon, ClockIcon } from '../components/icons'
import { Container, PageHeader, VideoGrid } from '../components/layout'
import { SkeletonVideoCard } from '../components/Skeleton'
import { VideoCard } from '../features/videos/VideoCard'
import { useWatchLater } from '../features/watchLater/watchLaterContext'
import { useWatchLaterVideos } from '../features/watchLater/useWatchLaterVideos'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 77 — Watch later (YouTube's "My List"): every saved video, newest saved first, in the
// same grid as Search. It also follows the SHARED memory (Prompt 42): un-save a video anywhere
// and it leaves this list at once — no refetch.

export default function WatchLaterPage() {
  usePageTitle('Watch later')
  const saved = useWatchLaterVideos()
  const watchLater = useWatchLater()
  const toast = useToast()

  // Prompt 78 — remove from the page, with Undo. The card disappears at once (optimistic,
  // through the shared memory); Undo saves it again and it returns to the same place.
  const gridRef = useRef<HTMLDivElement>(null)
  const focusIndexAfterRemove = useRef<number | null>(null)
  function remove(video: Video, index: number) {
    // EXPLICIT remove / save — not toggle. The Undo button is created now but clicked later;
    // a toggle would read this moment's (by then stale) "saved?" answer and get it backwards.
    // quiet: this page shows its own, more specific toast (with the title) — no double toasts.
    watchLater.remove(video, { quiet: true })
    focusIndexAfterRemove.current = index
    toast.info(`Removed “${video.title}” from Watch later.`, {
      action: { label: 'Undo', onClick: () => watchLater.save(video, { quiet: true }) },
    })
  }
  // Keyboard users: the card you were on just vanished — move focus to the one that took its
  // place (or the new last one), instead of letting it fall back to the top of the page.
  useEffect(() => {
    const index = focusIndexAfterRemove.current
    if (index === null) return
    focusIndexAfterRemove.current = null
    const links = gridRef.current?.querySelectorAll<HTMLAnchorElement>('article h3 a') ?? []
    const target = links[Math.min(index, links.length - 1)]
    if (target) target.focus()
    else {
      // The list is now empty: land on the page heading. A heading only takes focus with
      // tabindex="-1" (focusable by code, but not a Tab stop).
      const heading = document.querySelector<HTMLElement>('main h1')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus()
    }
  })

  // Only videos that are STILL saved. (Until the shared memory has loaded its own list, it would
  // answer "not saved" for everything — so don't filter until it's ready.)
  const videos =
    saved.status === 'ready'
      ? saved.videos.filter((v) => watchLater.status !== 'ready' || watchLater.isSaved(v.id))
      : []

  return (
    <Container className="pb-16">
      <PageHeader
        title="Watch later"
        description={
          saved.status === 'ready'
            ? `${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`
            : undefined
        }
      />

      {saved.status === 'loading' && (
        <div aria-busy="true">
          <p role="status" className="sr-only">
            Loading your saved videos…
          </p>
          <VideoGrid>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonVideoCard key={i} />
            ))}
          </VideoGrid>
        </div>
      )}

      {saved.status === 'error' && (
        <EmptyState
          icon={<AlertIcon className="size-7 text-danger" />}
          title="We couldn’t load your saved videos"
          description={saved.message}
          action={{ label: 'Try again', onClick: saved.retry }}
        />
      )}

      {saved.status === 'ready' &&
        (videos.length === 0 ? (
          // Prompt 82 — an empty page that teaches and invites: HOW to save, and where to go next.
          <EmptyState
            icon={<ClockIcon className="size-7" />}
            title="No saved videos yet"
            description="Found something you want to watch later? Tap the clock on any video and it’ll wait for you here."
            action={{ label: 'Browse videos', to: '/' }}
            secondaryAction={{ label: 'Search', to: '/search' }}
          />
        ) : (
          <div ref={gridRef}>
            <VideoGrid heading="Saved videos">
              {videos.map((video, index) => (
                <VideoCard key={video.id} video={video} onRemove={(v) => remove(v, index)} />
              ))}
            </VideoGrid>
          </div>
        ))}
    </Container>
  )
}
