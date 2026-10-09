import { describe, expect, it } from 'vitest'
import { buildHomeFeed, CONTINUE_MIN_SECONDS } from './buildHomeFeed'
import type { Video, WatchHistoryEntry } from '../../lib/types'

/**
 * Regression cover for the orphaned-history bug.
 *
 * Deleting a video used to leave its watch-history rows behind. The server populates such a
 * row as `video: null`, but WatchHistoryEntry declares `video: Video` — so nothing downstream
 * checked, the null travelled into a VideoCard, and reading `.title` off it threw. That took
 * down the whole Home page, not just one card: to the viewer, "some videos stopped working".
 *
 * The real fix is in the API (the delete now cascades, and history filters orphans out). This
 * covers the second line of defence, which is what protects a viewer whose history already
 * holds such a row.
 */

const video = (id: string, over: Partial<Video> = {}): Video => ({
  id,
  title: 'Video ' + id,
  description: '',
  category: 'Music',
  thumbnailUrl: 'https://example.test/' + id + '.jpg',
  videoUrl: 'https://example.test/' + id + '.mp4',
  duration: 600,
  views: 100,
  likes: 10,
  uploader: { id: 'u1', name: 'Someone' },
  createdAt: '2026-10-01T00:00:00.000Z',
  ...over,
})

const entry = (v: Video | null, over: Partial<WatchHistoryEntry> = {}): WatchHistoryEntry =>
  ({
    videoId: v ? v.id : 'gone',
    progress: 120,
    duration: 600,
    updatedAt: '2026-10-08T00:00:00.000Z',
    video: v,
    ...over,
  }) as WatchHistoryEntry

describe('buildHomeFeed — history rows whose video was deleted', () => {
  it('drops an entry whose video is null instead of throwing', () => {
    const kept = video('a')
    const history = [entry(null), entry(kept)]

    // Before the fix this threw inside the sort/map chain rather than returning a feed.
    const feed = buildHomeFeed([kept], history)

    expect(feed.continueWatching).toHaveLength(1)
    expect(feed.continueWatching[0]!.video.id).toBe('a')
  })

  it('every video it hands back is a real object', () => {
    const feed = buildHomeFeed([video('a')], [entry(null), entry(null), entry(video('a'))])

    for (const item of feed.continueWatching) {
      expect(item.video).toBeTruthy()
      expect(typeof item.video.title).toBe('string')
    }
  })

  it('a history of nothing but deleted videos gives an empty row, not a crash', () => {
    const feed = buildHomeFeed([video('a')], [entry(null), entry(null)])

    expect(feed.continueWatching).toEqual([])
  })

  it('still keeps the rules it had: too-early and finished videos stay out', () => {
    const v = video('a')
    const barelyStarted = entry(v, { progress: CONTINUE_MIN_SECONDS - 1, videoId: 'a' })
    const feed = buildHomeFeed([v], [entry(null), barelyStarted])

    expect(feed.continueWatching).toEqual([])
  })
})
