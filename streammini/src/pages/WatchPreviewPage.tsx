import { useState } from 'react'
import { VideoPlayer } from '../features/player/VideoPlayer'
import { CommentsSection } from '../features/watch/CommentsSection'
import { UpNextList } from '../features/watch/UpNextList'
import { WatchView } from '../features/watch/WatchView'
import type { Comment, User } from '../lib/types'
import { seedVideos } from '../lib/mockData'

// DEV ONLY (/dev/watch) — previews the Watch page pieces with sample data. Lazy-loaded from
// router.tsx, so it never reaches production.

const DEMO_NOW = new Date('2026-09-27T12:00:00Z').getTime()
const sample = {
  ...seedVideos[0],
  description: `${seedVideos[0].description}\n\nFilmed on a warm Friday evening in Lekki with a nine-piece band. Setlist: Intro jam, Lagos Nights, Sunset Groove, Jollof Riddim, and a surprise closing number with the crowd.\n\nShot on two cameras, mixed live.`,
}
const shortClip = seedVideos.find((v) => v.duration <= 10) ?? seedVideos[0]

/** test-videos.co.uk keeps each clip in several sizes: …/360/…_360_10s… → also /720/. */
function qualities(url: string) {
  if (!/\/360\//.test(url)) return undefined // not one we know how to resize: single version
  return [
    { label: '720p', src: url.replace('/360/', '/720/').replace('_360_', '_720_') },
    { label: '360p', src: url },
  ]
}
const demoUser: User = {
  id: 'u_demo',
  name: 'Demo Viewer',
  email: 'demo@example.com',
  role: 'user',
  createdAt: '2026-09-01T00:00:00Z',
}
const startingComments: Comment[] = [
  {
    id: 'c1',
    videoId: sample.id,
    userId: 'u_x',
    authorName: 'Chidi Okafor',
    text: 'This set was unreal 🔥\nThe drummer at 4:10!',
    createdAt: '2026-09-26T18:00:00Z',
  },
  {
    id: 'c2',
    videoId: sample.id,
    userId: 'u_y',
    authorName: 'Amaka',
    text: 'Please do another one in Ibadan.',
    createdAt: '2026-09-25T09:30:00Z',
  },
]

export default function WatchPreviewPage() {
  const [comments, setComments] = useState(startingComments)

  // A pretend "post" for the preview (Prompt 53 connects the real one): wait, then add locally.
  async function addLocally(text: string) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    if (text.toLowerCase().includes('fail')) throw new Error('Pretend network error — try again.')
    const comment: Comment = {
      id: `local-${Date.now()}`,
      videoId: sample.id,
      userId: demoUser.id,
      authorName: demoUser.name,
      text,
      createdAt: new Date(DEMO_NOW).toISOString(),
    }
    setComments((list) => [comment, ...list])
  }

  return (
    <WatchView
      video={sample}
      now={DEMO_NOW}
      // Prompt 65: our own player (the real Watch page switches over in Prompt 67).
      // (A 10-second clip here, so the player can be tried — and tested — without waiting for
      // the long archive.org film to buffer.)
      player={
        <VideoPlayer
          src={shortClip.videoUrl}
          poster={sample.thumbnailUrl}
          title={sample.title}
          // Prompt 72: the sample site has this clip in two sizes, so switching can be tried.
          sources={qualities(shortClip.videoUrl)}
        />
      }
      sidebar={<UpNextList videos={seedVideos.slice(1, 9)} now={DEMO_NOW} />}
      below={
        <CommentsSection comments={comments} user={demoUser} onAdd={addLocally} now={DEMO_NOW} />
      }
    />
  )
}
