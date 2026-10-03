import { useId } from 'react'
import { buttonStyles } from '../../components/buttonStyles'
import { ThumbUpIcon } from '../../components/icons'
import { formatCount } from '../../lib/format'

// Prompt 54 — the 👍 pill. Its NAME stays "Like" and aria-pressed says on/off; the count is
// read as a DESCRIPTION ("1.2K likes"), so the name doesn't change every time the number does.

export function LikeButton({
  liked,
  likes,
  onToggle,
}: {
  liked: boolean
  likes: number
  onToggle: () => void
}) {
  const countId = useId()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label="Like"
      aria-describedby={countId}
      title={liked ? 'Unlike' : 'I like this'}
      className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'rounded-full' })}
    >
      {/* Filled thumb when liked — the shape changes, not just the colour. */}
      <ThumbUpIcon
        className={`size-5 ${liked ? 'text-accent-text' : ''}`}
        fill={liked ? 'currentColor' : 'none'}
      />
      <span id={countId} className="tabular-nums">
        {formatCount(likes)}
        <span className="sr-only"> {likes === 1 ? 'like' : 'likes'}</span>
      </span>
    </button>
  )
}
