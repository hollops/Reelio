import type { Video } from '../../lib/types'

// Prompt 92 — filter + sort for the Admin table, done in the browser on the list already
// loaded (fine for hundreds of videos; with thousands, the server would do it instead).
// Pure functions — easy to test, and the URL holds the choices (?q=ada&sort=views&dir=desc).

export type SortKey = 'title' | 'channel' | 'category' | 'views' | 'uploaded'
export type SortDir = 'asc' | 'desc'

export const SORT_KEYS: SortKey[] = ['title', 'channel', 'category', 'views', 'uploaded']
export const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: 'uploaded', dir: 'desc' }
/** First click on a column: words A→Z, numbers and dates biggest/newest first. */
export const FIRST_DIR: Record<SortKey, SortDir> = {
  title: 'asc',
  channel: 'asc',
  category: 'asc',
  views: 'desc',
  uploaded: 'desc',
}

/** For people: "sorted by views, highest first". */
export function describeSort(key: SortKey, dir: SortDir) {
  const words: Record<SortKey, [string, string, string]> = {
    title: ['title', 'A to Z', 'Z to A'],
    channel: ['channel', 'A to Z', 'Z to A'],
    category: ['category', 'A to Z', 'Z to A'],
    views: ['views', 'lowest first', 'highest first'],
    uploaded: ['upload date', 'oldest first', 'newest first'],
  }
  const [name, up, down] = words[key]
  return `sorted by ${name}, ${dir === 'asc' ? up : down}`
}

// "Café" matches "cafe"; case doesn't matter.
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Rows whose title, channel or category contain EVERY word typed ("ada music"). */
export function filterVideos(videos: Video[], query: string): Video[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return videos
  return videos.filter((v) => {
    const haystack = fold(`${v.title} ${v.uploader.name} ${v.category}`)
    return words.every((w) => haystack.includes(w))
  })
}

const text = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/** A sorted COPY (never sorts the original list in place). Ties: newest first. */
export function sortVideos(videos: Video[], key: SortKey, dir: SortDir): Video[] {
  const value = (v: Video) =>
    key === 'title'
      ? v.title
      : key === 'channel'
        ? v.uploader.name
        : key === 'category'
          ? v.category
          : key === 'views'
            ? v.views
            : v.createdAt
  const sign = dir === 'asc' ? 1 : -1
  return [...videos].sort((a, b) => {
    const [x, y] = [value(a), value(b)]
    const order =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : key === 'uploaded'
          ? String(x).localeCompare(String(y)) // ISO dates sort correctly as text
          : text.compare(String(x), String(y))
    return order * sign || b.createdAt.localeCompare(a.createdAt)
  })
}

/** Read the choices from the URL, ignoring anything unknown (a mistyped or old link). */
export function readListParams(params: URLSearchParams) {
  const sort = params.get('sort') as SortKey | null
  const key = sort && SORT_KEYS.includes(sort) ? sort : DEFAULT_SORT.key
  const dirParam = params.get('dir')
  const dir: SortDir =
    dirParam === 'asc' || dirParam === 'desc'
      ? dirParam
      : key === DEFAULT_SORT.key
        ? DEFAULT_SORT.dir
        : FIRST_DIR[key]
  return { q: params.get('q') ?? '', key, dir }
}
