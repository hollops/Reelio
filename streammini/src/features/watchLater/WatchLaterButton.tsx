import { buttonStyles } from '../../components/buttonStyles'
import { CheckIcon, ClockIcon } from '../../components/icons'
import type { Video } from '../../lib/types'
import { useWatchLater } from './watchLaterContext'

// Prompt 50 — a labelled "Watch later" pill button (Watch page, and anywhere else that wants one).
// It reads and changes the SHARED list from Prompt 42, so saving here is instantly reflected on
// every card and banner — and all the optimistic / roll-back behaviour comes with it.

export function WatchLaterButton({ video }: { video: Pick<Video, 'id' | 'title'> }) {
  const { isSaved, toggle } = useWatchLater()
  const saved = isSaved(video.id)
  return (
    <button
      type="button"
      onClick={() => toggle(video)}
      // One constant label; aria-pressed says whether it's on (see FeaturedBanner for why).
      aria-pressed={saved}
      className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'rounded-full' })}
    >
      {saved ? <CheckIcon className="size-5" /> : <ClockIcon className="size-5" />}
      Watch later
    </button>
  )
}
