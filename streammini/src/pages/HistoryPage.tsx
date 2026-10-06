import { useEffect, useRef } from 'react'
import { EmptyState } from '../components/EmptyState'
import { AlertIcon, HistoryIcon } from '../components/icons'
import { Container, PageHeader, VideoGrid } from '../components/layout'
import { SkeletonVideoCard } from '../components/Skeleton'
import { useToast } from '../components/toast/toastContext'
import { usePageTitle } from '../components/usePageTitle'
import { useWatchHistory } from '../features/history/useWatchHistory'
import { VideoCard } from '../features/videos/VideoCard'
import type { WatchHistoryEntry } from '../lib/types'

// Everything the user has watched, newest first, with a progress bar and a remove button.
// Same grid and the same card as Watch later and Search — one video, one look, everywhere.

/** How far through, as 0–1 — or undefined when the stored row cannot be trusted. */
function watchedFraction(progress: number, duration: number): number | undefined {
  if (!Number.isFinite(progress) || !Number.isFinite(duration) || duration <= 0) return undefined
  return Math.min(progress / duration, 1)
}

export default function HistoryPage() {
  usePageTitle('History')
  const history = useWatchHistory()
  const toast = useToast()

  // After a card is removed, move focus to whatever took its place. Without this, a keyboard
  // user's focus falls back to the top of the document and they lose their place entirely.
  const gridRef = useRef<HTMLDivElement>(null)
  const focusIndexAfterRemove = useRef<number | null>(null)

  async function remove(entry: WatchHistoryEntry, index: number) {
    focusIndexAfterRemove.current = index
    try {
      await history.remove(entry.videoId)
      toast.info(`Removed “${entry.video.title}” from History.`, {
        // EXPLICIT undo, not a toggle: this button is created now but pressed later, and a
        // toggle would read a by-then-stale "is it in history?" answer and get it backwards.
        action: { label: 'Undo', onClick: () => void history.undoRemove(entry, index) },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove that video.')
    }
  }

  useEffect(() => {
    const index = focusIndexAfterRemove.current
    if (index === null) return
    focusIndexAfterRemove.current = null
    const links = gridRef.current?.querySelectorAll<HTMLAnchorElement>('article h3 a') ?? []
    const target = links[Math.min(index, links.length - 1)]
    if (target) target.focus()
    else {
      // The list is now empty: land on the page heading instead. A heading only accepts focus
      // with tabindex="-1" — focusable by code, but never a Tab stop.
      const heading = document.querySelector<HTMLElement>('main h1')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus()
    }
  })

  const entries = history.status === 'ready' ? history.entries : []

  return (
    <Container className="pb-16">
      <PageHeader
        title="History"
        description={
          history.status === 'ready'
            ? `${entries.length} ${entries.length === 1 ? 'video' : 'videos'}`
            : undefined
        }
      />

      {history.status === 'loading' && (
        <div aria-busy="true">
          <p role="status" className="sr-only">
            Loading your watch history…
          </p>
          <VideoGrid>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonVideoCard key={i} />
            ))}
          </VideoGrid>
        </div>
      )}

      {history.status === 'error' && (
        <EmptyState
          icon={<AlertIcon className="size-7 text-danger" />}
          title="We couldn’t load your history"
          description={history.message}
          action={{ label: 'Try again', onClick: history.retry }}
        />
      )}

      {history.status === 'ready' &&
        (entries.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="size-7" />}
            title="Nothing watched yet"
            description="Videos you watch show up here, so you can pick up exactly where you left off."
            action={{ label: 'Browse videos', to: '/' }}
            secondaryAction={{ label: 'Search', to: '/search' }}
          />
        ) : (
          <div ref={gridRef}>
            <VideoGrid heading="Watched videos">
              {entries.map((entry, index) => (
                <VideoCard
                  key={entry.videoId}
                  video={entry.video}
                  // 0–1 for the bar under the thumbnail. Both numbers must be real: a
                  // duration of 0 gives Infinity, and a missing progress gives NaN — either
                  // would end up in an aria-valuenow. No bar is better than a broken one.
                  progress={watchedFraction(entry.progress, entry.duration)}
                  onRemove={() => void remove(entry, index)}
                  removeFrom="History"
                />
              ))}
            </VideoGrid>
          </div>
        ))}
    </Container>
  )
}
