import { memo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '../../components/Badge'
import { formatCount, formatDate, formatDuration, formatTimeAgo } from '../../lib/format'
import type { Video } from '../../lib/types'
import type { SortDir, SortKey } from './adminListView'
import { countRender } from '../../__renderCount' // TEMP-98

// Prompt 85 — the admin's table of videos. A REAL <table> (not a grid of boxes), so screen
// readers can say "row 3, Channel column" and move around it like a spreadsheet.
// On phones it scrolls sideways INSIDE its box; the page itself never scrolls sideways.

export interface VideoTableProps {
  videos: Video[]
  /** The Actions column (Edit / Delete — Prompts 88–89). Leave out to hide the column. */
  actions?: (video: Video) => ReactNode
  /** Shown above the table for screen readers, e.g. "All videos, newest first". */
  caption: string
  /** Prompt 92 — pass both to make the headers clickable sort buttons. */
  sort?: { key: SortKey; dir: SortDir }
  onSort?: (key: SortKey) => void
}

// Prompt 98 — memo: opening the Edit or Delete pop-up doesn't redraw every row of the table.
export const VideoTable = memo(function VideoTable({
  videos,
  actions,
  caption,
  sort,
  onSort,
}: VideoTableProps) {
  countRender('VideoTable') // TEMP-98
  const header = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <SortHeader column={key} label={label} align={align} sort={sort} onSort={onSort} />
  )

  return (
    // tabIndex + role="region" + label: keyboard users can focus the box and scroll it sideways.
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-line focus-visible:outline-2 focus-visible:outline-accent-text"
    >
      <table className="w-full min-w-[46rem] text-left text-small">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-caption tracking-wide text-fg-muted uppercase">
          <tr>
            {header('title', 'Video')}
            {header('channel', 'Channel')}
            {header('category', 'Category')}
            {header('views', 'Views', 'right')}
            {header('uploaded', 'Uploaded')}
            {actions && (
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {videos.map((video) => (
            <tr key={video.id} className="hover:bg-surface/60">
              {/* scope="row": this cell names the row ("Afrobeats Live Session…"). min-w-64: on a
                  phone the box scrolls sideways rather than squeezing titles to one word. */}
              <th scope="row" className="min-w-64 px-4 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-20 shrink-0 rounded bg-elevated object-cover"
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/watch/${video.id}`}
                      // py-0.5: a one-line title is still a 24px-tall target (Prompt 93); the
                      // two-line clamp sits on the inner span so the padding can't show a 3rd line.
                      className="block py-0.5 font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent-text"
                    >
                      <span className="line-clamp-2">{video.title}</span>
                    </Link>
                    <span className="text-caption text-fg-subtle tabular-nums">
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                </div>
              </th>
              <td className="px-4 py-3 text-fg-muted">{video.uploader.name}</td>
              <td className="px-4 py-3">
                <Badge>{video.category}</Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCount(video.views)}</td>
              <td className="px-4 py-3 text-fg-muted">
                <time dateTime={video.createdAt} title={formatDate(video.createdAt)}>
                  {formatTimeAgo(video.createdAt)}
                </time>
              </td>
              {actions && (
                <td className="px-4 py-3 text-right whitespace-nowrap">{actions(video)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

/**
 * A column header. With sorting on, it holds a button (click = sort by it, again = flip), and
 * aria-sort on the ACTIVE column tells screen readers "sorted ascending/descending".
 */
function SortHeader({
  column,
  label,
  align,
  sort,
  onSort,
}: {
  column: SortKey
  label: string
  align: 'left' | 'right'
  sort?: { key: SortKey; dir: SortDir }
  onSort?: (key: SortKey) => void
}) {
  const active = sort?.key === column
  const base = `px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : ''}`
  if (!sort || !onSort) {
    return (
      <th scope="col" className={base}>
        {label}
      </th>
    )
  }
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`${base} py-1.5`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group -mx-2 inline-flex items-center gap-1 rounded px-2 py-1.5 tracking-wide uppercase hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-text ${
          active ? 'text-fg' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {/* The arrow is just a picture of aria-sort; faint on columns you could sort by. */}
        <span
          aria-hidden="true"
          className={`w-3 text-center ${active ? '' : 'opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50'}`}
        >
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲'}
        </span>
      </button>
    </th>
  )
}
