import { useState } from 'react'
import { AlertIcon, VideoIcon } from '../components/icons'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/toast/toastContext'
import { HomeFeed } from '../features/home/HomeFeed'
import { HomeFeedSkeleton } from '../features/home/HomeFeedSkeleton'
import { useHomeFeed } from '../features/home/useHomeFeed'
import { useWatchLater } from '../features/watchLater/watchLaterContext'
import { api, ApiError } from '../lib/apiClient'
import type { Video } from '../lib/types'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 39 — the real Home page: fetch (useHomeFeed) → group (buildHomeFeed) → lay out (HomeFeed).
// This replaces the temporary list of links from Prompt 7.

export default function HomePage() {
  usePageTitle() // just "Viora" on Home
  const feed = useHomeFeed()
  const watchLater = useWatchLater()
  const toast = useToast()
  // Prompt 81 — videos just removed from Continue watching (hidden at once, before the server
  // has answered: optimistic).
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const setHiddenFor = (id: string, hide: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (hide) next.add(id)
      else next.delete(id)
      return next
    })

  // Prompt 40: grey placeholders in the shape of the page, instead of a spinner.
  if (feed.status === 'loading') return <HomeFeedSkeleton />

  if (feed.status === 'error') {
    return (
      <EmptyState
        icon={<AlertIcon className="size-7 text-danger" />}
        title="We couldn’t load the videos"
        description={feed.message}
        action={{ label: 'Try again', onClick: feed.retry }}
      />
    )
  }

  // Nothing uploaded yet (a brand-new site): say so, and point to the way forward.
  if (!feed.data.featured) {
    return (
      <EmptyState
        icon={<VideoIcon className="size-7" />}
        title="No videos yet"
        description="Be the first to share something."
        action={{ label: 'Upload a video', to: '/upload' }}
      />
    )
  }

  // Prompt 81 — forget how far you got in a video: gone from the row at once, the saved
  // position cleared on the server, and an Undo that re-saves EXACTLY the old position.
  async function removeFromContinue(video: Video) {
    if (feed.status !== 'ready') return
    const item = feed.data.continueWatching.find((c) => c.video.id === video.id)
    if (!item) return
    const saved = {
      videoId: video.id,
      progress: item.progress * video.duration,
      duration: video.duration,
    }
    setHiddenFor(video.id, true)
    try {
      await api.delete(`/history/${encodeURIComponent(video.id)}`)
      toast.info(`Removed “${video.title}” from Continue watching.`, {
        action: {
          label: 'Undo',
          onClick: () => {
            setHiddenFor(video.id, false)
            api.post('/history', saved).catch(() => {
              setHiddenFor(video.id, true)
              toast.error('Couldn’t put it back. Please try again.')
            })
          },
        },
      })
    } catch (err) {
      setHiddenFor(video.id, false) // the server refused: bring the card back
      toast.error(
        `Couldn’t remove it. ${err instanceof ApiError ? err.message : 'Please try again.'}`,
      )
    }
  }

  return (
    <HomeFeed
      data={{
        ...feed.data,
        continueWatching: feed.data.continueWatching.filter((c) => !hidden.has(c.video.id)),
      }}
      // Prompt 42: every card and the banner get a real, shared Watch later button.
      cardProps={(video) => ({
        inWatchLater: watchLater.isSaved(video.id),
        onToggleWatchLater: watchLater.toggle,
      })}
      onRemoveFromContinue={removeFromContinue}
    />
  )
}
