import { memo, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { formatDate, formatTimeAgo } from '../../lib/format'
import type { Comment, User } from '../../lib/types'
import { countRender } from '../../__renderCount' // TEMP-98

// Prompt 52 — YouTube-style comments: a count, an "Add a comment…" box, and the list (newest
// first). Posting is handed in as `onAdd`; without it, the list is shown on its own.
// Prompt 53 — posting is optimistic: the box clears at once and the new comment shows as
// "Posting…" until the server confirms. If it fails, the text goes back into the box.

const COMMENT_MAX_LENGTH = 500 // the backend's limit (see the mock's POST /comments)
const COUNTER_FROM = COMMENT_MAX_LENGTH - 100 // show "412 / 500" only once it's relevant

/** A comment as shown on screen: `pending` = on its way to the server, not confirmed yet. */
export type ShownComment = Comment & { pending?: boolean }

export interface CommentsSectionProps {
  comments: ShownComment[]
  /** The signed-in user, or null for visitors (they see "Sign in to comment"). */
  user: User | null
  /** Post a comment. Resolve when saved; throw to keep the text and show an error. */
  onAdd?: (text: string) => Promise<void>
  now?: number
}

// Prompt 98 — memo: a long comment list isn't redrawn when something else on the page changes.
export const CommentsSection = memo(function CommentsSection({
  comments,
  user,
  onAdd,
  now,
}: CommentsSectionProps) {
  countRender('CommentsSection') // TEMP-98
  const headingId = useId()
  const location = useLocation()
  const count = comments.length

  return (
    <section aria-labelledby={headingId} className="space-y-6 pt-2">
      <h2 id={headingId} className="text-title font-semibold">
        {count === 1 ? '1 comment' : `${count.toLocaleString()} comments`}
      </h2>

      {user && onAdd ? (
        <CommentForm user={user} onAdd={onAdd} />
      ) : !user ? (
        <p className="text-small text-fg-muted">
          <Link
            to="/login"
            state={{ from: location }}
            className="font-semibold text-accent-text hover:underline"
          >
            Sign in
          </Link>{' '}
          to comment.
        </p>
      ) : null}

      {count === 0 ? (
        <p className="text-small text-fg-muted">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <ul className="space-y-5">
          {comments.map((comment) => (
            <li
              key={comment.id}
              // Faded while unconfirmed; aria-busy tells screen readers it isn't final yet.
              aria-busy={comment.pending || undefined}
              className={`flex gap-3 ${comment.pending ? 'opacity-60' : ''}`}
            >
              <Avatar name={comment.authorName} size="sm" decorative />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-small">
                  <span className="font-semibold">{comment.authorName}</span>
                  {comment.pending ? (
                    <span className="text-caption text-fg-subtle">Posting…</span>
                  ) : (
                    <time
                      dateTime={comment.createdAt}
                      title={formatDate(comment.createdAt)}
                      className="text-caption text-fg-subtle"
                    >
                      {formatTimeAgo(comment.createdAt, now)}
                    </time>
                  )}
                </p>
                {/* pre-line keeps the line breaks people typed; break-words stops a very long
                    word (or link) from pushing the page sideways. */}
                <p className="mt-1 text-small break-words whitespace-pre-line">{comment.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
})

function CommentForm({ user, onAdd }: { user: User; onAdd: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false) // focused once → show the buttons, like YouTube
  const [error, setError] = useState<string>()
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const inputId = useId()
  const errorId = useId()
  const counterId = useId()

  const trimmed = text.trim()
  const tooLong = text.length > COMMENT_MAX_LENGTH

  function cancel() {
    setText('')
    setError(undefined)
    setActive(false)
    boxRef.current?.blur()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || tooLong) return
    const typed = text // exactly what they wrote, so a failure can put it back untouched

    // Optimistic (Prompt 53): empty the box NOW — the comment already shows as "Posting…".
    setError(undefined)
    setText('')
    setActive(false)
    boxRef.current?.blur()
    try {
      await onAdd(trimmed)
    } catch (err) {
      // Put their words back — losing a long comment to a network blip is infuriating.
      setText(typed)
      setActive(true)
      setError(err instanceof Error ? err.message : 'Could not post your comment.')
      boxRef.current?.focus()
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-3">
      <Avatar name={user.name} src={user.avatarUrl} size="sm" decorative />
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">
          Add a comment
        </label>
        <textarea
          id={inputId}
          ref={boxRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setActive(true)}
          placeholder="Add a comment…"
          rows={active ? 3 : 1}
          aria-invalid={tooLong || error ? true : undefined}
          aria-describedby={
            [error && errorId, text.length >= COUNTER_FROM && counterId]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="w-full resize-none border-b border-line-strong bg-transparent pb-1 text-small text-fg placeholder:text-fg-subtle focus:border-fg focus:shadow-[0_1px_0_0_var(--color-fg)] focus:outline-none"
        />

        {active && (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            {text.length >= COUNTER_FROM && (
              <span
                id={counterId}
                className={`mr-auto text-caption tabular-nums ${tooLong ? 'font-semibold text-danger' : 'text-fg-muted'}`}
              >
                {text.length} / {COMMENT_MAX_LENGTH}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!trimmed || tooLong}>
              Comment
            </Button>
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-2 text-small text-danger">
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
