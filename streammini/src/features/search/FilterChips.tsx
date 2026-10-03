import type { ReactNode } from 'react'
import type { Video } from '../../lib/types'
import { categoryChips, DURATIONS, type SearchFilters } from './filters'

// Prompt 60 — the chip rows above the search results. Each chip is a toggle button
// (aria-pressed); each row is a labelled group, and scrolls sideways on narrow screens.

export function FilterChips({
  videos,
  filters,
  onChange,
}: {
  /** The UNFILTERED results — chip counts describe everything the search found. */
  videos: Video[]
  filters: SearchFilters
  onChange: (next: SearchFilters) => void
}) {
  const chips = categoryChips(videos, filters.category)

  return (
    <div className="space-y-3">
      <ChipRow label="Filter by category">
        <Chip
          pressed={filters.category === null}
          onClick={() => onChange({ ...filters, category: null })}
        >
          All
        </Chip>
        {chips.map(({ category, count }) => (
          <Chip
            key={category}
            pressed={filters.category === category}
            // Clicking the selected chip again switches it off (back to All).
            onClick={() =>
              onChange({ ...filters, category: filters.category === category ? null : category })
            }
          >
            {/* opacity, not a grey colour: stays readable on BOTH the dark and the light chip. */}
            {category} <span className="opacity-70">({count})</span>
          </Chip>
        ))}
      </ChipRow>

      <ChipRow label="Filter by length">
        {DURATIONS.map((d) => (
          <Chip
            key={d.id}
            pressed={filters.duration === d.id}
            onClick={() => onChange({ ...filters, duration: d.id })}
          >
            {d.label}
          </Chip>
        ))}
      </ChipRow>
    </div>
  )
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // role="group" + aria-label: screen readers announce "Filter by category, group".
    // The row scrolls sideways on phones instead of wrapping onto many lines.
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  )
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      // Selected = light chip on dark (YouTube's style); the difference is shape-and-contrast,
      // not colour alone.
      className={`h-8 shrink-0 rounded-lg px-3 text-small font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text ${
        pressed ? 'bg-fg text-canvas' : 'bg-elevated text-fg hover:bg-line'
      }`}
    >
      {children}
    </button>
  )
}
