import { memo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Badge, DurationBadge } from '../../components/Badge'
import { CheckIcon, ClockIcon, CloseIcon, PlayIcon, VideoIcon } from '../../components/icons'
import { formatTimeAgo, formatViews, isRecent } from '../../lib/format'
import type { Video } from '../../lib/types'

// Prompt 35 — the YouTube-style video card: the most repeated piece of the whole app
// (home, search, channel pages, Up next…).
//
//   ┌ thumbnail 16:9 ───────────┐  hover / keyboard focus: slight zoom + ▶ play sign,
//   │                    [🕒]   │  and a "Watch later" button (our "add to list")
//   │                    10:53  │
//   └───────────────────────────┘
//   (avatar) Title, up to two lines…
//            Channel name
//            1.2K views · 3 days ago
//
// Prompt 41 — the whole card opens /watch/:id, using a "stretched link": only the TITLE is the
// real <a> (so screen readers hear a short, clear name), and an invisible ::after layer stretches
// it over the whole card. The Watch later button sits above that layer (z-10) so it still works
// on its own — a button can't legally live INSIDE a link.

export interface VideoCardProps {
  video: Video
  /** Is this video already in the viewer's Watch later list? */
  inWatchLater?: boolean
  /** Leave out to hide the Watch later button entirely. */
  onToggleWatchLater?: (video: Video) => void
  /** "Now", for "3 days ago" and the New badge — only tests and demos need to pass it. */
  now?: number
  /** How much has been watched, 0–1 ("Continue watching"). Draws the bar under the thumbnail. */
  progress?: number
  /**
   * false = Tab skips this card (arrow keys still reach it). Used by VideoRow's "roving
   * tabindex", so a whole row is ONE Tab stop instead of one per card (Prompt 45).
   */
  tabbable?: boolean
  /** id of a hint read by screen readers with the card's link (e.g. "use the arrow keys…"). */
  describedBy?: string
  /**
   * Prompt 78 — on the Watch later page: show ✕ "Remove from Watch later" instead of the
   * clock toggle (where every video is already saved, a ✓ wouldn't read as "remove").
   */
  onRemove?: (video: Video) => void
  /** Prompt 81 — WHERE ✕ removes it from, for its label (default: "Watch later"). */
  removeFrom?: string
}

// Prompt 98 — memo: on a page of 30 cards, saving ONE re-renders only that one.
export const VideoCard = memo(function VideoCard({
  video,
  inWatchLater = false,
  onToggleWatchLater,
  now,
  progress,
  tabbable = true,
  describedBy,
  onRemove,
  removeFrom = 'Watch later',
}: VideoCardProps) {
  const tabIndex = tabbable ? undefined : -1
  // Clamp to 0–100%, whatever arrives (a player can report slightly past the end).
  // Number.isFinite also rejects NaN and Infinity: a malformed history row (missing or
  // zero duration) would otherwise reach the DOM as aria-valuenow="NaN", which is an
  // invalid ARIA value and a critical accessibility failure.
  const watchedPercent =
    progress === undefined || !Number.isFinite(progress)
      ? undefined
      : Math.round(Math.min(1, Math.max(0, progress)) * 100)
  // Remember WHICH address failed (same idea as Avatar), so a new thumbnail gets a fresh try.
  const [failedThumb, setFailedThumb] = useState<string>()
  const showThumb = video.thumbnailUrl && video.thumbnailUrl !== failedThumb

  return (
    // `group`: lets children react to the card being hovered (group-hover:) or focused inside
    // (group-focus-within:), not just to themselves being hovered.
    // `relative`: the stretched link's invisible layer covers exactly this card, nothing more.
    <article className="group relative flex min-w-0 flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-elevated">
        {showThumb ? (
          <img
            src={video.thumbnailUrl}
            // Empty alt: the title is written right below, so describing the picture would
            // make screen readers say the same thing twice.
            alt=""
            loading="lazy" // don't download cards far below the screen until they're near
            decoding="async"
            onError={() => setFailedThumb(video.thumbnailUrl)}
            className="size-full object-cover group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-300"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center text-fg-subtle"
          >
            <VideoIcon className="size-10" />
          </div>
        )}

        {/* The ▶ sign: pure decoration — the stretched title link below is what actually opens it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-focus-within:bg-black/30 group-focus-within:opacity-100 group-hover:bg-black/30 group-hover:opacity-100 motion-safe:transition"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-black/70 text-white">
            <PlayIcon className="ml-0.5 size-7" />
          </span>
        </div>

        {/* Prompt 79 — on a part-watched card, what matters is how much is LEFT ("8:12 left"),
            not the full length. */}
        {watchedPercent === undefined ? (
          <DurationBadge seconds={video.duration} />
        ) : (
          <DurationBadge
            seconds={Math.max(0, Math.round(video.duration * (1 - watchedPercent / 100)))}
            suffix="left"
            className="bottom-3"
          />
        )}

        {/* YouTube's red "you've watched this much" bar along the bottom of the thumbnail. */}
        {watchedPercent !== undefined && (
          <div
            role="progressbar"
            aria-label="Watched"
            aria-valuenow={watchedPercent}
            // Read as "25% watched", not a bare "25" (Prompt 79).
            aria-valuetext={`${watchedPercent}% watched`}
            aria-valuemin={0}
            aria-valuemax={100}
            className="absolute inset-x-0 bottom-0 h-1 bg-white/30"
          >
            <div className="h-full bg-danger" style={{ width: `${watchedPercent}%` }} />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {/* Decorative: the channel name is written right next to it. */}
        <Avatar name={video.uploader.name} src={video.uploader.avatarUrl} size="md" decorative />
        <div className="min-w-0 flex-1">
          {/* line-clamp-2: long titles stop after two lines with "…"; `title` shows it in full on hover. */}
          <h3 title={video.title} className="line-clamp-2 text-small font-semibold text-fg">
            {/* The stretched link. after:absolute after:inset-0 = an invisible layer covering the
                whole <article>, so the thumbnail and every line of text open the video too.
                Its keyboard focus ring is drawn on that layer, i.e. around the whole card. */}
            <Link
              to={`/watch/${video.id}`}
              tabIndex={tabIndex}
              aria-describedby={describedBy}
              className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-accent-text"
            >
              {video.title}
            </Link>
          </h3>
          <p className="mt-1 truncate text-caption text-fg-muted">{video.uploader.name}</p>
          {/* min-h-5: the same 20px whether or not a "New" badge is on this line, so every card
              (and its skeleton) is the same height. */}
          <p className="flex min-h-5 flex-wrap items-center gap-x-1 text-caption text-fg-muted">
            <span>{formatViews(video.views)}</span>
            <span aria-hidden="true">·</span>
            {/* <time>: the exact date for machines, the friendly one for people. */}
            <time dateTime={video.createdAt}>{formatTimeAgo(video.createdAt, now)}</time>
            {isRecent(video.createdAt, 7, now) && (
              <Badge variant="accent" className="ml-1">
                New
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* The Watch later button comes LAST in the code, so Tab reaches the video's title first
          and then its button ("which video?" before "save it"). On screen it still sits at the
          thumbnail's top-right: it's positioned against the <article>, whose top IS the thumbnail. */}
      {/* Prompt 78 — "remove" mode (the Watch later page): a plain ✕ action, not a toggle. */}
      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(video)}
          tabIndex={tabIndex}
          aria-label={`Remove “${video.title}” from ${removeFrom}`}
          title={`Remove from ${removeFrom}`}
          className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/80 text-white opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-black focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text motion-safe:transition-opacity pointer-coarse:opacity-100"
        >
          <CloseIcon className="size-5" />
        </button>
      ) : (
        onToggleWatchLater && (
          <button
            type="button"
            onClick={() => onToggleWatchLater(video)}
            tabIndex={tabIndex}
            // A toggle: screen readers say "Watch later, toggle button, pressed / not pressed".
            aria-pressed={inWatchLater}
            aria-label="Watch later"
            title={inWatchLater ? 'Remove from Watch later' : 'Save to Watch later'}
            // Hidden until the card is hovered or focused — but ALWAYS shown on touch screens
            // (pointer-coarse), which have no hover, and when already saved.
            // z-10: above the card's stretched-link layer, so this button gets its own clicks.
            className={`absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full bg-black/80 text-white group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-black focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text motion-safe:transition-opacity pointer-coarse:opacity-100 ${
              inWatchLater ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {inWatchLater ? <CheckIcon className="size-5" /> : <ClockIcon className="size-5" />}
          </button>
        )
      )}
    </article>
  )
})
