import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, PlusIcon } from '../../components/icons'
import { newChapter, type Chapter, type ChapterErrors } from './chapters'

// Prompt 91 — the chapters editor (the prompt's "episode manager", YouTube-style): add, reorder
// and remove "0:00 Intro"-style rows. It only edits the list; VideoForm owns it and writes it
// into the description on save.
// Keyboard care: focus follows a moved row, lands somewhere sensible after a removal, and jumps
// into a newly added row; a screen reader hears what moved where.

type Field = 'time' | 'title' | 'up' | 'down' | 'remove'

const ICON_BUTTON =
  'grid size-9 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-elevated hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-text disabled:opacity-40 disabled:hover:bg-transparent'

export function ChaptersEditor({
  chapters,
  onChange,
  errors,
}: {
  chapters: Chapter[]
  onChange: (next: Chapter[]) => void
  errors: Record<string, ChapterErrors>
}) {
  const id = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const [announcement, setAnnouncement] = useState('')
  // Where focus should go once the list has re-rendered (set by add / move / remove).
  const focusNext = useRef<{ id: string; field: Field } | 'add' | null>(null)

  useEffect(() => {
    const target = focusNext.current
    focusNext.current = null
    if (target === 'add') return addRef.current?.focus()
    if (!target) return
    const row = listRef.current?.querySelector(`[data-chapter="${target.id}"]`)
    const el = row?.querySelector<HTMLElement>(`[data-field="${target.field}"]`)
    // A moved row reaching the top/bottom disables that arrow — use the other one instead.
    const fallback = row?.querySelector<HTMLElement>(
      `[data-field="${target.field === 'up' ? 'down' : 'up'}"]`,
    )
    if (el && !(el as HTMLButtonElement).disabled) el.focus()
    else fallback?.focus()
  }, [chapters])

  const label = (c: Chapter, i: number) => c.title.trim() || `chapter ${i + 1}`

  function update(index: number, patch: Partial<Chapter>) {
    onChange(chapters.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function add() {
    // The first chapter must start at 0:00 — so fill that in for you.
    const chapter = newChapter(chapters.length === 0 ? '0:00' : '')
    focusNext.current = { id: chapter.id, field: chapters.length === 0 ? 'title' : 'time' }
    onChange([...chapters, chapter])
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by
    if (to < 0 || to >= chapters.length) return
    const next = [...chapters]
    ;[next[index], next[to]] = [next[to], next[index]]
    focusNext.current = { id: chapters[index].id, field: by < 0 ? 'up' : 'down' }
    setAnnouncement(
      `Moved “${label(chapters[index], index)}” to position ${to + 1} of ${chapters.length}.`,
    )
    onChange(next)
  }

  function remove(index: number) {
    const after = chapters[index + 1] ?? chapters[index - 1]
    focusNext.current = after ? { id: after.id, field: 'title' } : 'add'
    setAnnouncement(`Removed “${label(chapters[index], index)}”.`)
    onChange(chapters.filter((_, i) => i !== index))
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <div>
        <h2 id={`${id}-heading`} className="text-small font-medium">
          Chapters <span className="font-normal text-fg-muted">(optional)</span>
        </h2>
        <p id={`${id}-hint`} className="text-caption text-fg-muted">
          Split your video into named parts. The first starts at 0:00; times go up from top to
          bottom.
        </p>
      </div>

      {chapters.length > 0 && (
        <ol ref={listRef} className="space-y-2" aria-describedby={`${id}-hint`}>
          {chapters.map((c, i) => {
            const e = errors[c.id]
            const timeErr = e?.time && `${id}-${c.id}-time-error`
            const titleErr = e?.title && `${id}-${c.id}-title-error`
            const n = i + 1
            return (
              <li key={c.id} data-chapter={c.id} className="space-y-1">
                {/* On a phone the arrow buttons wrap onto a second line, so the name box stays usable. */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    data-field="time"
                    value={c.time}
                    onChange={(ev) => update(i, { time: ev.target.value })}
                    aria-label={`Chapter ${n} start time`}
                    aria-invalid={e?.time ? true : undefined}
                    aria-describedby={timeErr || undefined}
                    placeholder={i === 0 ? '0:00' : '1:30'}
                    inputMode="numeric"
                    autoComplete="off"
                    className={`h-10 w-20 shrink-0 rounded-md border bg-surface px-2 text-center text-body text-fg tabular-nums placeholder:text-fg-subtle focus:outline-2 focus:outline-offset-1 focus:outline-accent-text ${
                      e?.time ? 'border-danger' : 'border-line-strong'
                    }`}
                  />
                  <input
                    data-field="title"
                    value={c.title}
                    onChange={(ev) => update(i, { title: ev.target.value })}
                    aria-label={`Chapter ${n} name`}
                    aria-invalid={e?.title ? true : undefined}
                    aria-describedby={titleErr || undefined}
                    placeholder={i === 0 ? 'Intro' : 'Chapter name'}
                    autoComplete="off"
                    className={`h-10 min-w-0 flex-1 basis-40 rounded-md border bg-surface px-3 text-body text-fg placeholder:text-fg-subtle focus:outline-2 focus:outline-offset-1 focus:outline-accent-text ${
                      e?.title ? 'border-danger' : 'border-line-strong'
                    }`}
                  />
                  <div className="ml-auto flex">
                    <button
                      type="button"
                      data-field="up"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move “${label(c, i)}” up`}
                      className={ICON_BUTTON}
                    >
                      <ArrowUpIcon className="size-5" />
                    </button>
                    <button
                      type="button"
                      data-field="down"
                      onClick={() => move(i, 1)}
                      disabled={i === chapters.length - 1}
                      aria-label={`Move “${label(c, i)}” down`}
                      className={ICON_BUTTON}
                    >
                      <ArrowDownIcon className="size-5" />
                    </button>
                    <button
                      type="button"
                      data-field="remove"
                      onClick={() => remove(i)}
                      aria-label={`Remove “${label(c, i)}”`}
                      className={`${ICON_BUTTON} hover:text-danger`}
                    >
                      <CloseIcon className="size-5" />
                    </button>
                  </div>
                </div>
                {e?.time && (
                  <p id={timeErr || undefined} className="text-small text-danger">
                    {e.time}
                  </p>
                )}
                {e?.title && (
                  <p id={titleErr || undefined} className="text-small text-danger">
                    {e.title}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <Button ref={addRef} size="sm" variant="secondary" onClick={add}>
        <PlusIcon className="size-4" />
        Add chapter
      </Button>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  )
}
