import { memo, useState } from 'react'
import { Link } from 'react-router'
import { Badge, DurationBadge } from '../../components/Badge'
import { PlayIcon, VideoIcon } from '../../components/icons'
import { formatTimeAgo, formatViews } from '../../lib/format'
import type { Video } from '../../lib/types'

// Prompt 49 — the "Up next" column (replacing the prompt's Netflix episode list, per the team's
// YouTube decision). Compact cards: small thumbnail left, text right. The whole item is one
// stretched link (same trick as VideoCard). The FIRST item is what autoplay picks (Prompts 70–71).
//
// Which videos go in here is decided elsewhere (Prompt 51); this only draws them.

export interface UpNextListProps {
  videos: Video[]
  now?: number
}

// Prompt 98 — memo: pressing Like on the video doesn't redraw the 12 suggestions.
export const UpNextList = memo(function UpNextList({ videos, now }: UpNextListProps) {
  if (videos.length === 0) return null
  return (
    <div className="space-y-3">
      <h2 className="text-title font-semibold">Up next</h2>
      <ol className="space-y-3">
        {videos.map((video, i) => (
          <li key={video.id}>
            <UpNextItem video={video} isNext={i === 0} now={now} />
          </li>
        ))}
      </ol>
    </div>
  )
})

function UpNextItem({ video, isNext, now }: { video: Video; isNext: boolean; now?: number }) {
  const [failedThumb, setFailedThumb] = useState<string>()
  const showThumb = video.thumbnailUrl && video.thumbnailUrl !== failedThumb

  return (
    <article className="group relative flex gap-3 rounded-lg">
      {/* self-start: in a flex row, children stretch to the row's height by default — which would
          override 16:9 and turn a long title into a taller, squashed thumbnail. */}
      <div className="relative aspect-video w-40 shrink-0 self-start overflow-hidden rounded-lg bg-elevated">
        {showThumb ? (
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedThumb(video.thumbnailUrl)}
            className="size-full object-cover group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-300"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center text-fg-subtle"
          >
            <VideoIcon className="size-7" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 motion-safe:transition-opacity"
        >
          <PlayIcon className="size-7 text-white" />
        </div>
        <DurationBadge seconds={video.duration} />
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <h3 title={video.title} className="line-clamp-2 text-small font-semibold">
          <Link
            to={`/watch/${video.id}`}
            className="outline-none after:absolute after:-inset-1 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-accent-text"
          >
            {video.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-caption text-fg-muted">{video.uploader.name}</p>
        <p className="flex flex-wrap items-center gap-x-1 text-caption text-fg-muted">
          <span>{formatViews(video.views)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={video.createdAt}>{formatTimeAgo(video.createdAt, now)}</time>
        </p>
        {isNext && (
          <Badge variant="accent" className="mt-1.5">
            Next
          </Badge>
        )}
      </div>
    </article>
  )
}
