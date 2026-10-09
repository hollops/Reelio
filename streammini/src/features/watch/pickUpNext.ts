import type { Video } from '../../lib/types'

// Prompt 51 — which videos go in "Up next" (the prompt's "similar titles sharing a genre").
// A PURE function, like buildHomeFeed: easy to test, no fetching.
//
//   same category  +2   ← the prompt's rule: "shares a genre"
//   same channel   +1   ← YouTube also favours more from the channel you're watching
//   tie?           most views first

export const UP_NEXT_COUNT = 12

/** Only what the ranking reads — so callers can memoize on exactly these fields (Prompt 98). */
export interface UpNextFor {
  id: string
  category: Video['category']
  uploader: { id: string }
}

export function pickUpNext(current: UpNextFor, all: Video[], count = UP_NEXT_COUNT): Video[] {
  const score = (v: Video) =>
    (v.category === current.category ? 2 : 0) + (v.uploader.id === current.uploader.id ? 1 : 0)

  return all
    .filter((v) => v.id !== current.id) // never suggest the video you're already watching
    .map((v) => ({ v, score: score(v) }))
    .sort((a, b) => b.score - a.score || b.v.views - a.v.views)
    .slice(0, count)
    .map(({ v }) => v)
}
