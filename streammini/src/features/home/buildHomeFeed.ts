import { CATEGORIES, type Video, type WatchHistoryEntry } from '../../lib/types'
import type { HomeFeedData } from './HomeFeed'

// Prompt 39 — turns the server's flat lists into the Home page's rows. A PURE function:
// same input → same output, no fetching, no clock reading (pass `now`), so it's easy to test.

const DAY = 24 * 60 * 60 * 1000
export const FEATURED_WINDOW_DAYS = 14
export const TRENDING_COUNT = 10
export const PER_CATEGORY = 12
export const CONTINUE_COUNT = 10
/**
 * Started but not finished — the SAME rule as resuming (Prompt 68), so the two always agree:
 * at least 5 SECONDS in (a percentage failed on long videos: 5% of an 11-minute film is 33 s,
 * yet the player would already resume from 11 s), and under 95% (effectively finished).
 */
export const CONTINUE_MIN_SECONDS = 5
export const CONTINUE_MAX = 0.95

const byViews = (a: Video, b: Video) => b.views - a.views
const byNewest = (a: Video, b: Video) => b.createdAt.localeCompare(a.createdAt)

export function buildHomeFeed(
  videos: Video[],
  history: WatchHistoryEntry[] = [],
  now: number = Date.now(),
): HomeFeedData {
  const popular = [...videos].sort(byViews) // copy first: never re-order the caller's array

  // Featured: the most-watched RECENT upload keeps the banner fresh; fall back to the all-time top.
  const recent = popular.filter(
    (v) => now - new Date(v.createdAt).getTime() <= FEATURED_WINDOW_DAYS * DAY,
  )
  const featured = recent[0] ?? popular[0] ?? null

  // Trending: the top of the chart, minus the featured video (no showing it twice in a row).
  const trending = popular.filter((v) => v.id !== featured?.id).slice(0, TRENDING_COUNT)

  // Prompt 80 — most recently watched first, sorted HERE rather than trusting the server's order:
  // the mock happens to send newest-first, but a real database returns records in whatever order
  // it likes unless told otherwise. (Copy first — never re-order the caller's array.)
  const continueWatching = [...history]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((entry) => entry.duration > 0 && entry.progress >= CONTINUE_MIN_SECONDS)
    .map((entry) => ({ video: entry.video, progress: entry.progress / entry.duration }))
    .filter((item) => item.progress < CONTINUE_MAX)
    .slice(0, CONTINUE_COUNT) // the 10 most recent

  // One row per category, in the app's fixed category order; empty categories are skipped.
  const categories = CATEGORIES.map((category) => ({
    category,
    videos: videos
      .filter((v) => v.category === category)
      .sort(byNewest)
      .slice(0, PER_CATEGORY),
  })).filter((row) => row.videos.length > 0)

  return { featured, continueWatching, trending, categories }
}
