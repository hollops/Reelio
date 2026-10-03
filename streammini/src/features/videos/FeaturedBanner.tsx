import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Badge } from '../../components/Badge'
import { buttonStyles } from '../../components/buttonStyles'
import { CheckIcon, ClockIcon, PlayIcon } from '../../components/icons'
import { formatDuration, formatTimeAgo, formatViews } from '../../lib/format'
import type { Video } from '../../lib/types'

// Prompt 37 — the big spotlight at the top of Home (the prompt's "HeroBanner", YouTube-style).
//
//   ┌──────────────────────────────────────────────────────────┐
//   │ FEATURED · Music                      (background image) │
//   │ Afrobeats Live Session — Full Rooftop Set                │
//   │ (LB) Lagos Beats · 184K views · 2 days ago · 10:53       │
//   │ Description, at most three lines…                        │
//   │ [▶ Watch now]  [🕒 Watch later]                          │
//   └──────────────────────────────────────────────────────────┘
//
// "Watch now" is a LINK (it goes to another page); "Watch later" is a BUTTON (it does something
// here). The prompt's "More info" is dropped: our single Watch page is where the info lives.

export interface FeaturedBannerProps {
  video: Video
  inWatchLater?: boolean
  /** Leave out to hide the Watch later button. */
  onToggleWatchLater?: (video: Video) => void
  now?: number
}

export function FeaturedBanner({
  video,
  inWatchLater = false,
  onToggleWatchLater,
  now,
}: FeaturedBannerProps) {
  return (
    <section
      aria-label={`Featured video: ${video.title}`}
      // Two layouts (Prompt 46):
      //   phones  — picture on top as its own 16:9 block, text BELOW on the solid card, so the
      //             text is readable whatever the picture looks like (a bright sky, a white wall…)
      //   sm and up — picture fills the banner, text on the left over a dark fade
      className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface sm:flex sm:min-h-[24rem] sm:items-center lg:min-h-[28rem]"
    >
      {/* The picture: decoration (the title says what it is). It's the biggest thing on the page,
          so it downloads FIRST (fetchPriority) instead of waiting like the lazy card thumbnails. */}
      <img
        src={video.thumbnailUrl}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="aspect-video w-full bg-elevated object-cover sm:absolute sm:inset-0 sm:-z-20 sm:aspect-auto sm:size-full"
      />
      {/* The fade that keeps the text readable over the picture — only needed when the text
          actually sits ON the picture (sm and up). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 hidden bg-linear-to-r from-canvas from-30% via-canvas/80 to-transparent sm:block"
      />

      <div className="w-full max-w-2xl space-y-4 p-5 sm:p-10">
        <p className="flex items-center gap-2 text-caption font-semibold tracking-wider text-accent-text uppercase">
          Featured
          <span aria-hidden="true" className="text-fg-subtle">
            ·
          </span>
          <Badge className="tracking-normal normal-case">{video.category}</Badge>
        </p>

        <h2 className="text-heading font-bold text-balance sm:text-hero">{video.title}</h2>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-fg-muted">
          <Avatar name={video.uploader.name} src={video.uploader.avatarUrl} size="xs" decorative />
          <span className="font-medium text-fg">{video.uploader.name}</span>
          <span aria-hidden="true">·</span>
          <span>{formatViews(video.views)}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={video.createdAt}>{formatTimeAgo(video.createdAt, now)}</time>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatDuration(video.duration)}</span>
        </div>

        {video.description && (
          <p className="line-clamp-3 max-w-xl text-fg-muted">{video.description}</p>
        )}

        {/* Phones: two full-width buttons, one above the other (deliberate, not accidental
            wrapping). sm and up: side by side at their natural width. */}
        <div className="grid gap-3 pt-1 sm:flex">
          <Link to={`/watch/${video.id}`} className={buttonStyles({ size: 'lg' })}>
            <PlayIcon className="size-5" />
            Watch now
          </Link>
          {onToggleWatchLater && (
            <button
              type="button"
              onClick={() => onToggleWatchLater(video)}
              // A toggle keeps ONE label; "pressed" carries the state. (Changing the words too
              // would make screen readers announce the state twice: "Saved, pressed".)
              aria-pressed={inWatchLater}
              className={buttonStyles({ variant: 'secondary', size: 'lg' })}
            >
              {inWatchLater ? <CheckIcon className="size-5" /> : <ClockIcon className="size-5" />}
              Watch later
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
