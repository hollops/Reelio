import { useState } from 'react'
import { HomeFeed, type HomeFeedData } from '../features/home/HomeFeed'
import { CATEGORIES } from '../lib/types'
import { seedVideos } from '../lib/mockData'

// DEV ONLY (/dev/home) — previews the Home layout with sample data, before Prompt 39 connects
// the real API. Loaded lazily from router.tsx, so the seed data never reaches production.
// The grouping below is deliberately rough; Prompt 39 writes the real, tested version.

const DEMO_NOW = new Date('2026-09-27T12:00:00Z').getTime()

const sample: HomeFeedData = {
  featured: seedVideos[0],
  continueWatching: [
    { video: seedVideos[3], progress: 0.35 },
    { video: seedVideos[8], progress: 0.8 },
    { video: seedVideos[12], progress: 0.1 },
  ],
  trending: [...seedVideos].sort((a, b) => b.views - a.views).slice(0, 10),
  categories: CATEGORIES.map((category) => ({
    category,
    videos: seedVideos.filter((v) => v.category === category),
  })),
}

export default function HomePreviewPage() {
  const [saved, setSaved] = useState<string[]>([])
  return (
    <HomeFeed
      data={sample}
      now={DEMO_NOW}
      cardProps={(video) => ({
        inWatchLater: saved.includes(video.id),
        onToggleWatchLater: (v) =>
          setSaved((ids) =>
            ids.includes(v.id) ? ids.filter((id) => id !== v.id) : [...ids, v.id],
          ),
      })}
    />
  )
}
