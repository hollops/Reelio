import { Link } from 'react-router'
import { Container } from '../../components/layout'
import type { Category, Video } from '../../lib/types'
import { FeaturedBanner } from '../videos/FeaturedBanner'
import type { VideoCardProps } from '../videos/VideoCard'
import { VideoRow } from '../videos/VideoRow'

// Prompt 38 — the Home page LAYOUT. It receives finished, sorted lists and only arranges them:
//
//   [ Featured banner ]
//   Continue watching   ‹ … ›   (signed in + started something)
//   Trending            ‹ … ›
//   Music               ‹ … ›   See all
//   Gaming              ‹ … ›   See all
//   …
//
// Fetching and grouping the data is Prompt 39's job. Keeping "how it looks" apart from "where
// the data comes from" means each can be changed — and previewed, see /dev/home — on its own.

export interface ContinueItem {
  video: Video
  /** 0–1 */
  progress: number
}

export interface HomeFeedData {
  featured: Video | null
  continueWatching: ContinueItem[]
  trending: Video[]
  categories: { category: Category; videos: Video[] }[]
}

export interface HomeFeedProps {
  data: HomeFeedData
  /** Watch later state + handler for each card and the banner (connected in Prompt 42). */
  cardProps?: (video: Video) => Omit<VideoCardProps, 'video'>
  /** Prompt 81 — ✕ on Continue watching cards: forget how far you got in this video. */
  onRemoveFromContinue?: (video: Video) => void
  now?: number
}

export function HomeFeed({ data, cardProps, onRemoveFromContinue, now }: HomeFeedProps) {
  const propsFor = (video: Video) => ({ now, ...cardProps?.(video) })

  return (
    <Container className="space-y-10 py-6 sm:py-8">
      {/* YouTube's home has no visible title, but every page needs ONE h1: screen-reader users
          jump to it to learn where they are. The rows below are h2s, so they can hop row to row. */}
      <h1 className="sr-only">Viora home</h1>

      {data.featured && <FeaturedBanner video={data.featured} {...propsFor(data.featured)} />}

      {/* Prompt 43 — nothing started yet (a visitor, a new account, or everything finished)?
          Then there's no row at all, like YouTube: an empty "Continue watching" would waste the
          best spot on the page. It appears by itself as soon as a video is part-watched. */}
      {data.continueWatching.length > 0 && (
        <VideoRow
          title="Continue watching"
          videos={data.continueWatching.map((item) => item.video)}
          cardProps={(video) => ({
            ...propsFor(video),
            progress: data.continueWatching.find((item) => item.video.id === video.id)?.progress,
            // Prompt 81 — here the card's corner button is ✕ "Remove from Continue watching".
            onRemove: onRemoveFromContinue,
            removeFrom: 'Continue watching',
          })}
        />
      )}

      <VideoRow title="Trending" videos={data.trending} cardProps={propsFor} />

      {data.categories.map(({ category, videos }) => (
        <VideoRow
          key={category}
          title={category}
          videos={videos}
          cardProps={propsFor}
          action={
            <Link
              to={`/search?${new URLSearchParams({ category })}`}
              // min-h-6: at least 24px tall, an easy finger target (Prompt 93).
              className="inline-flex min-h-6 shrink-0 items-center rounded text-small font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent-text"
            >
              See all <span className="sr-only">{category} videos</span>
            </Link>
          }
        />
      ))}
    </Container>
  )
}
