import { CATEGORIES, type Category, type Video } from '../../lib/types'

// Prompt 60 — narrowing search results in the browser (no new request), YouTube-style.
// The prompt's "Movie/Series" type doesn't exist here, so YouTube's own duration filter
// takes its place.

export const DURATIONS = [
  { id: 'any', label: 'Any length', test: () => true },
  { id: 'short', label: 'Under 4 minutes', test: (s: number) => s < 4 * 60 },
  { id: 'medium', label: '4–20 minutes', test: (s: number) => s >= 4 * 60 && s <= 20 * 60 },
  { id: 'long', label: 'Over 20 minutes', test: (s: number) => s > 20 * 60 },
] as const

export type DurationFilter = (typeof DURATIONS)[number]['id']

export interface SearchFilters {
  category: Category | null // null = all categories
  duration: DurationFilter
}

export const NO_FILTERS: SearchFilters = { category: null, duration: 'any' }

// --- Prompt 63: the filters live in the ADDRESS, so a filtered search can be shared, bookmarked
// and refreshed.   /search?q=a&category=Comedy&duration=short
// Anything unrecognised in the address (a typo, an old link) is simply ignored.

/** Read the filters out of the address. */
export function readFilters(params: URLSearchParams): SearchFilters {
  const category = CATEGORIES.find((c) => c === params.get('category')) ?? null
  const duration = DURATIONS.find((d) => d.id === params.get('duration'))?.id ?? 'any'
  return { category, duration }
}

/** A copy of the address with these filters written in (defaults are left out, to keep it short). */
export function writeFilters(params: URLSearchParams, { category, duration }: SearchFilters) {
  const next = new URLSearchParams(params) // keep ?q= and anything else
  if (category) next.set('category', category)
  else next.delete('category')
  if (duration !== 'any') next.set('duration', duration)
  else next.delete('duration')
  return next
}

/** Keep only the videos that pass BOTH filters. A pure function: easy to test. */
export function filterResults(videos: Video[], { category, duration }: SearchFilters): Video[] {
  const lengthOk = DURATIONS.find((d) => d.id === duration)?.test ?? (() => true)
  return videos.filter((v) => (!category || v.category === category) && lengthOk(v.duration))
}

/**
 * Category chips worth showing: the ones present in the results, in the app's usual order,
 * with a count each — plus the selected one even if it has none (so it can be switched off).
 */
export function categoryChips(videos: Video[], selected: Category | null) {
  return CATEGORIES.map((category) => ({
    category,
    count: videos.filter((v) => v.category === category).length,
  })).filter((chip) => chip.count > 0 || chip.category === selected)
}
