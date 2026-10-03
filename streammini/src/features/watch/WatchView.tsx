import { useId, useState, type ReactNode } from 'react'
import { Avatar } from '../../components/Avatar'
import { Container } from '../../components/layout'
import { formatDate, formatTimeAgo, formatViews } from '../../lib/format'
import type { Video } from '../../lib/types'

// Prompt 47 — the Watch page LAYOUT (YouTube-style, replacing the prompt's Netflix "Title Detail").
//
//   wide screens                                   phones
//   ┌──────────────────────────┬──────────┐        ┌──────────┐
//   │ player (16:9)            │ Up next  │        │ player   │
//   │ Title                    │  (side-  │        │ Title    │
//   │ (avatar) Channel  [acts] │   bar)   │        │ Channel  │
//   │ ┌ 184K views · 2 days ─┐ │          │        │ Details  │
//   │ │ description… more    │ │          │        │ Up next  │
//   │ └──────────────────────┘ │          │        │ Comments │
//   │ Comments                 │          │        └──────────┘
//   └──────────────────────────┴──────────┘
//
// It only ARRANGES things. The data (Prompt 48), the player (65), the action buttons (50, 54),
// Up next (49, 51) and comments (52) are handed in through props and "slots".

export interface WatchViewProps {
  video: Video
  /** The video player. Until Prompt 65 this is the browser's own <video controls>. */
  player?: ReactNode
  /** Buttons beside the channel: Like, Watch later… */
  actions?: ReactNode
  /** The right-hand column on wide screens (Up next); below the details on phones. */
  sidebar?: ReactNode
  /** Under the description (comments). */
  below?: ReactNode
  now?: number
}

export function WatchView({ video, player, actions, sidebar, below, now }: WatchViewProps) {
  return (
    <Container className="py-4 sm:py-6">
      {/* Prompt 56 — three areas, arranged per screen size (same HTML, different layout):
            phones:        details → Up next → comments   (one column; Up next isn't buried
                                                            under a long comment thread)
            wide screens:  details  | Up next             (Up next spans both rows on the
                           comments |                      right, like YouTube)
          minmax(0,1fr): lets the main column shrink below its content's natural width,
          so a long word or the video can never push the sidebar off the screen.
          grid-rows-[auto_1fr]: any extra height from a tall sidebar goes to the comments row,
          so there's never a gap between the description and the comments. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] xl:gap-x-8">
        <div className="min-w-0 space-y-4">
          {/* Phones: the player runs edge to edge (-mx-4 cancels the page gutter), no rounded
              corners — every pixel goes to the video. Tablet and up: a rounded card again. */}
          <div className="-mx-4 overflow-hidden bg-black sm:mx-0 sm:rounded-xl">
            {player ?? <DefaultPlayer video={video} />}
          </div>

          <h1 className="text-title font-bold text-balance sm:text-[1.375rem] sm:leading-8">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* The channel ("cast" in the Netflix prompt). A channel page would link here later. */}
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                name={video.uploader.name}
                src={video.uploader.avatarUrl}
                size="md"
                decorative
              />
              <p className="truncate font-semibold">{video.uploader.name}</p>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>

          <Description video={video} now={now} />
        </div>

        {sidebar && (
          <aside
            aria-label="Up next"
            className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            {sidebar}
          </aside>
        )}

        {below && <div className="min-w-0 lg:col-start-1">{below}</div>}
      </div>
    </Container>
  )
}

/** The browser's own player, until our custom VideoPlayer arrives in Prompt 65. */
function DefaultPlayer({ video }: { video: Video }) {
  return (
    <div className="aspect-video">
      <video
        // key: a new video id = a brand-new <video> element, so the old one's position and
        // buffered data are thrown away instead of briefly carrying over.
        key={video.id}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        controls
        playsInline // iPhones: play inside the page instead of forcing full screen
        preload="metadata" // fetch only the length + first frame until Play is pressed
        className="size-full"
      />
    </div>
  )
}

/** YouTube's grey description box: stats line, #category, text clamped with Show more / less. */
function Description({ video, now }: { video: Video; now?: number }) {
  const [expanded, setExpanded] = useState(false)
  const textId = useId()
  const text = video.description.trim()
  // Long enough to be cut off? (A simple, predictable rule: many characters or many lines.)
  const isLong = text.length > 180 || text.split('\n').length > 3

  return (
    <section aria-label="Video details" className="rounded-xl bg-surface p-4 text-small">
      <p className="flex flex-wrap gap-x-2 font-semibold">
        <span>{formatViews(video.views)}</span>
        {/* title attribute: the exact date on hover; the text says how long ago. */}
        <time dateTime={video.createdAt} title={formatDate(video.createdAt)}>
          {formatTimeAgo(video.createdAt, now)}
        </time>
        <span className="text-accent-text">#{video.category}</span>
      </p>

      {text ? (
        <p
          id={textId}
          className={`mt-2 whitespace-pre-line text-fg-muted ${isLong && !expanded ? 'line-clamp-3' : ''}`}
        >
          {text}
        </p>
      ) : (
        <p className="mt-2 text-fg-subtle italic">No description.</p>
      )}

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={textId}
          className="mt-2 rounded font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent-text"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </section>
  )
}
