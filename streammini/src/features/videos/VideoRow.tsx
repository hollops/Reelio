import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { Video } from '../../lib/types'
import { ROW_CARD_WIDTH } from './rowLayout'
import { VideoCard, type VideoCardProps } from './VideoCard'

// Prompt 36 — a YouTube-style "shelf": one titled row of cards that scrolls sideways.
//
//   Trending                                   (optional action, e.g. "See all")
//   ‹ [card] [card] [card] [card] [card] …  ›
//
// The scrolling itself is plain CSS (overflow-x + scroll-snap), so touch swipes, trackpads and
// Shift+wheel all work for free. JavaScript only adds the ‹ › buttons for mouse users, and hides
// each one when there's nothing more to scroll to on that side.

export interface VideoRowProps {
  title: string
  videos: Video[]
  /** Shown at the right of the title, e.g. a "See all" link. */
  action?: ReactNode
  /** Passed to every card (Watch later state and handler). */
  cardProps?: (video: Video) => Omit<VideoCardProps, 'video'>
}

export function VideoRow({ title, videos, action, cardProps }: VideoRowProps) {
  const headingId = useId()
  const listId = useId()
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  // Prompt 45 — "roving tabindex": the whole row is ONE Tab stop. Only the current card can be
  // reached with Tab; ← → Home End move "current" between cards. Remembered while you're away.
  const hintId = useId()
  const [active, setActive] = useState(0)
  const current = Math.min(active, videos.length - 1) // still valid if the list gets shorter

  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const items = Array.from(scrollerRef.current?.children ?? []) as HTMLElement[]
    // Which card is focus in right now? (Its link, or its Watch later button.)
    const index = items.findIndex((li) => li.contains(document.activeElement))
    if (index === -1) return

    let next: number
    if (e.key === 'ArrowRight') next = Math.min(index + 1, items.length - 1)
    else if (e.key === 'ArrowLeft') next = Math.max(index - 1, 0)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else return // any other key (Tab, Enter…) keeps its normal meaning

    e.preventDefault() // the arrow keys would otherwise scroll the page
    setActive(next)
    // Focusing it also scrolls it into view, and snapping lines it up neatly.
    items[next].querySelector('a')?.focus()
  }

  /** Is there more to see on the left / on the right? */
  const updateArrows = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    // 2px of slack: browsers can land a fraction of a pixel short of the very end.
    setCanPrev(el.scrollLeft > 2)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  // Re-check whenever the row's size changes (window resized, cards loaded, fonts arrived…).
  // A ResizeObserver also reports once as soon as it starts watching, which sets the first state.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const observer = new ResizeObserver(updateArrows)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateArrows, videos.length])

  function scrollByPage(direction: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 90% of the visible width: the last card of this "page" stays in view as a landmark.
    // 'instant', not 'auto': 'auto' means "whatever the CSS says", which could still animate.
    el.scrollBy({
      left: direction * el.clientWidth * 0.9,
      behavior: reduceMotion ? 'instant' : 'smooth',
    })
  }

  if (videos.length === 0) return null // an empty shelf is just noise (Prompt 43 handles messages)

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <h2 id={headingId} className="text-title font-semibold">
          {title}
        </h2>
        {action}
      </div>

      {/* --card-w: ONE number that sizes every card and positions the arrows (see below). */}
      <div className={`group/row relative ${ROW_CARD_WIDTH}`}>
        <ul
          id={listId}
          ref={scrollerRef}
          onScroll={updateArrows}
          onKeyDown={onKeyDown}
          // snap: every scroll comes to rest exactly on a card's edge, never halfway through one.
          // scroll-px-1 matches the px-1 padding: without it, snapping lines the first card up with
          // the box's very edge, silently scrolling 4px on load (and showing a useless ‹ arrow).
          // The scrollbar is hidden (arrows and swipes replace it); scrolling itself still works.
          // Prompt 44 — overscroll-x-contain: a hard swipe at the END of a row stays in the row,
          // instead of dragging the page or triggering the browser's swipe-to-go-back gesture.
          // (No touch-action lock: an up/down swipe that starts on a row still scrolls the page.)
          className="-mx-1 flex snap-x snap-mandatory scroll-px-1 [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain px-1 pb-2 [&::-webkit-scrollbar]:hidden"
        >
          {videos.map((video, i) => (
            // onFocus: clicking or tabbing into a card makes it the row's "current" card.
            <li
              key={video.id}
              className="w-(--card-w) shrink-0 snap-start"
              onFocus={() => setActive(i)}
            >
              <VideoCard
                video={video}
                {...cardProps?.(video)}
                tabbable={i === current}
                describedBy={hintId}
              />
            </li>
          ))}
        </ul>
        <p id={hintId} className="sr-only">
          Use the left and right arrow keys to move between videos.
        </p>

        <ArrowButton
          side="prev"
          show={canPrev}
          label={`Scroll ${title} left`}
          controls={listId}
          onClick={() => scrollByPage(-1)}
        />
        <ArrowButton
          side="next"
          show={canNext}
          label={`Scroll ${title} right`}
          controls={listId}
          onClick={() => scrollByPage(1)}
        />
      </div>
    </section>
  )
}

function ArrowButton({
  side,
  show,
  label,
  controls,
  onClick,
}: {
  side: 'prev' | 'next'
  show: boolean
  label: string
  controls: string
  onClick: () => void
}) {
  // Nothing more that way → no button at all (not just invisible, so Tab skips it too).
  if (!show) return null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-controls={controls}
      // Mouse helpers only: keyboard users move through the row with ← → (Prompt 45), so these
      // don't need to be Tab stops as well. Still clickable, and still findable by screen readers.
      tabIndex={-1}
      // Vertically centred on the THUMBNAILS, not the whole card: a 16:9 thumbnail is
      // width × 9/16 tall, so its middle is width × 9/32 from the top.
      // Shown when the row is hovered or the button is keyboard-focused; never on touch
      // screens (pointer-coarse), where swiping is the natural way.
      className={`absolute top-[calc(var(--card-w)*9/32)] z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-elevated/95 text-fg opacity-0 shadow-xl group-hover/row:opacity-100 hover:bg-line focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent-text motion-safe:transition-opacity pointer-coarse:hidden ${
        side === 'prev' ? '-left-3' : '-right-3'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        <path
          d={side === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
