import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { SearchIcon } from '../../components/icons'
import { formatDuration } from '../../lib/format'
import type { Video } from '../../lib/types'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useSuggestions } from './useSuggestions'

// Prompt 57 — the search box (NavBar, and the Search page on phones).
//   Enter            → go to /search?q=…
//   while typing     → onDebouncedChange(text), at most once per 300 ms pause
// Prompt 59 — on /search itself, a pause while typing ALSO updates the address (?q=…), so the
// results follow as you type. The address stays the single source of truth for what's searched.
// Prompt 62 — `withSuggestions`: a dropdown of up to 5 matching videos (W3C "combobox" pattern):
//   ↓ ↑ move · Enter opens the highlighted video (or searches) · Escape closes · click opens

export interface SearchBarProps {
  /** Called with the trimmed text once typing pauses. */
  onDebouncedChange?: (query: string) => void
  /** Show quick-match suggestions under the box (the NavBar does; not on /search itself). */
  withSuggestions?: boolean
  autoFocus?: boolean
  className?: string
}

export function SearchBar({
  onDebouncedChange,
  withSuggestions = false,
  autoFocus,
  className = '',
}: SearchBarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const onSearchPage = pathname === '/search'
  const urlQuery = onSearchPage ? (params.get('q') ?? '') : ''
  const [query, setQuery] = useState(urlQuery)

  // Who owns the box? While you're TYPING in it (it has focus), you do: the address never
  // overwrites it — otherwise an older search catching up in the address could wipe letters
  // you've typed since (a real bug the tests caught: "afrobeats" became "xeats").
  // When you're not typing, the address wins, so Back, links and fresh loads fill the box in.
  const [editing, setEditing] = useState(false)
  const [copiedFrom, setCopiedFrom] = useState(urlQuery)
  if (!editing && copiedFrom !== urlQuery) {
    setCopiedFrom(urlQuery)
    // Skip it when the address merely matches what's typed — the trimmed copy would eat a
    // trailing space ("rock " → "rock", and then "roll" lands as "rockroll").
    if (urlQuery !== query.trim()) setQuery(urlQuery)
  }

  const debounced = useDebouncedValue(query.trim())

  // Report the settled text. The callback is kept in a ref so a parent passing a new function
  // on every render doesn't make this effect fire again.
  const report = useRef(onDebouncedChange)
  useEffect(() => {
    report.current = onDebouncedChange
  })
  useEffect(() => {
    report.current?.(debounced)
  }, [debounced])

  // Prompt 59 — search as you type (only on /search, and only if the address is out of date).
  useEffect(() => {
    if (!onSearchPage) return
    setParams(
      (current) => {
        if ((current.get('q') ?? '') === debounced) return current // nothing new: no navigation
        const next = new URLSearchParams(current) // keep any other settings (filters)
        if (debounced) next.set('q', debounced)
        else next.delete('q')
        return next
      },
      // replace: Back shouldn't step through "l", "la", "lag"… one search at a time.
      { replace: true },
    )
    // Only a new settled query should update the address — not every render of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Prompt 62 — suggestions.
  const listId = useId()
  const optionId = (i: number) => `${listId}-option-${i}`
  const suggestions = useSuggestions(debounced, withSuggestions && !onSearchPage)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1) // -1 = nothing highlighted
  // Suggestions for OLD text never show: the list only belongs to what's typed right now.
  const showList = open && editing && suggestions.length > 0 && debounced === query.trim()
  const optionCount = suggestions.length + 1 // + the "Search for …" row

  function close() {
    setOpen(false)
    setActive(-1)
  }

  function openVideo(video: Video) {
    close()
    navigate(`/watch/${video.id}`)
  }

  function searchFor(q: string) {
    close()
    if (onSearchPage) {
      // Already here: search right now, skipping the 300 ms wait.
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (q) next.set('q', q)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
      return
    }
    // URLSearchParams encodes safely: "rock & roll" → q=rock+%26+roll
    navigate(q ? `/search?${new URLSearchParams({ q })}` : '/search')
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault() // stop the browser's own full-page form submission
    // Enter on a highlighted suggestion opens it; otherwise it's a normal search.
    if (showList && active >= 0 && active < suggestions.length) openVideo(suggestions[active])
    else searchFor(query.trim())
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!withSuggestions) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showList) {
        if (suggestions.length > 0) setOpen(true)
        return
      }
      e.preventDefault() // keep the cursor where it is in the text
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => {
        const next = i + step
        if (next >= optionCount) return -1 // past the last row → back to the text box
        if (next < -1) return optionCount - 1 // above the text box → wrap to the last row
        return next
      })
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault()
      close()
    }
  }

  return (
    <div className={`relative w-full ${className}`}>
      <form role="search" onSubmit={onSubmit} className="flex w-full items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => {
            setEditing(true)
            setOpen(true)
          }}
          onBlur={() => {
            setEditing(false)
            close()
          }}
          onKeyDown={onKeyDown}
          placeholder="Search videos"
          aria-label="Search videos"
          autoFocus={autoFocus}
          // The combobox pattern: "this box has a list; here's which item is highlighted".
          role={withSuggestions ? 'combobox' : undefined}
          aria-autocomplete={withSuggestions ? 'list' : undefined}
          aria-expanded={withSuggestions ? showList : undefined}
          aria-controls={withSuggestions ? listId : undefined}
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off" // the browser's own history dropdown would cover ours
          className="h-10 min-w-0 flex-1 rounded-l-full border border-line-strong bg-surface px-4 text-small text-fg placeholder:text-fg-subtle focus:border-accent-text focus:shadow-[0_0_0_1px_var(--color-accent-text)] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex h-10 w-14 items-center justify-center rounded-r-full border border-l-0 border-line-strong bg-elevated text-fg-muted hover:bg-line hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-text"
        >
          <SearchIcon className="size-5" />
        </button>
      </form>

      {withSuggestions && (
        <>
          {/* Screen readers hear how many suggestions appeared (the list itself isn't read out). */}
          <p role="status" className="sr-only">
            {showList
              ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} available. Use up and down arrows to choose.`
              : ''}
          </p>
          <ul
            id={listId}
            role="listbox"
            aria-label="Search suggestions"
            hidden={!showList}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-elevated py-2 shadow-2xl"
          >
            {suggestions.map((video, i) => (
              <li
                key={video.id}
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                // pointerdown + preventDefault: keep focus in the box, so its blur doesn't
                // close the list before the click lands.
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => openVideo(video)}
                onPointerEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${active === i ? 'bg-line' : ''}`}
              >
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  className="aspect-video w-16 shrink-0 rounded bg-surface object-cover"
                />
                {/* Title AND channel, both with the match in bold — so it's clear WHY a video
                    was suggested (e.g. "lag" matched the channel "Laugh Out Lagos"). */}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small">
                    <Highlight text={video.title} match={debounced} />
                  </span>
                  <span className="block truncate text-caption text-fg-muted">
                    <Highlight text={video.uploader.name} match={debounced} />
                  </span>
                </span>
                <span className="text-caption text-fg-subtle tabular-nums">
                  {formatDuration(video.duration)}
                </span>
              </li>
            ))}
            <li
              id={optionId(suggestions.length)}
              role="option"
              aria-selected={active === suggestions.length}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => searchFor(query.trim())}
              onPointerEnter={() => setActive(suggestions.length)}
              className={`flex cursor-pointer items-center gap-3 border-t border-line px-3 py-2 text-small text-fg-muted ${active === suggestions.length ? 'bg-line text-fg' : ''}`}
            >
              <SearchIcon className="size-4" />
              Search for “{query.trim()}”
            </li>
          </ul>
        </>
      )}
    </div>
  )
}

/** The title with the typed part in bold — the first match, whatever its capitals. */
function Highlight({ text, match }: { text: string; match: string }) {
  const at = match ? text.toLowerCase().indexOf(match.toLowerCase()) : -1
  if (at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-bold text-fg">{text.slice(at, at + match.length)}</mark>
      {text.slice(at + match.length)}
    </>
  )
}
