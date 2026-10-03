import type { Video } from '../../lib/types'

// Prompts 88–89 — the ✎ Edit and 🗑 Delete buttons in a table row. Their accessible names
// include the video's title ("Edit “Afrobeats…”"), because "Edit, Edit, Edit…" down a column
// tells a screen-reader user nothing about WHICH video each button is for.

export function RowActions({
  video,
  onEdit,
  onDelete,
}: {
  video: Video
  onEdit?: (video: Video) => void
  onDelete?: (video: Video) => void
}) {
  const base =
    'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-small font-semibold focus-visible:outline-2 focus-visible:outline-accent-text'
  return (
    <div className="inline-flex gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(video)}
          aria-label={`Edit “${video.title}”`}
          className={`${base} bg-elevated hover:bg-line`}
        >
          <span aria-hidden="true">✎</span> Edit
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(video)}
          aria-label={`Delete “${video.title}”`}
          className={`${base} text-danger hover:bg-danger/15`}
        >
          <span aria-hidden="true">🗑</span> Delete
        </button>
      )}
    </div>
  )
}
