import { useState } from 'react'
import { Link } from 'react-router'
import { buttonStyles } from '../components/buttonStyles'
import { EmptyState } from '../components/EmptyState'
import { AlertIcon, UploadIcon, VideoIcon } from '../components/icons'
import { Container, PageHeader } from '../components/layout'
import { Skeleton } from '../components/Skeleton'
import { RowActions } from '../features/admin/RowActions'
import { VideoTable } from '../features/admin/VideoTable'
import { DeleteVideoModal } from '../features/videos/DeleteVideoModal'
import { EditVideoModal } from '../features/videos/EditVideoModal'
import { useMyVideos } from '../features/videos/useMyVideos'
import type { Video } from '../lib/types'
import { usePageTitle } from '../components/usePageTitle'

// "Your videos" — the signed-in person's own uploads, in the same table as the Admin dashboard,
// with the same Edit pop-up (Prompt 88). The server lets you change ONLY your own videos.

export default function MyVideosPage() {
  usePageTitle('Your videos')
  const mine = useMyVideos()
  const [editing, setEditing] = useState<Video | null>(null)
  const [deleting, setDeleting] = useState<Video | null>(null)

  return (
    <Container className="space-y-6 pb-16">
      <PageHeader
        title="Your videos"
        description={
          mine.status === 'ready'
            ? `${mine.videos.length} ${mine.videos.length === 1 ? 'upload' : 'uploads'}`
            : undefined
        }
        actions={
          <Link to="/upload" className={buttonStyles({ size: 'sm' })}>
            <UploadIcon className="size-5" />
            Upload
          </Link>
        }
      />

      {mine.status === 'loading' && (
        <div aria-busy="true">
          <p role="status" className="sr-only">
            Loading your videos…
          </p>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      )}

      {mine.status === 'error' && (
        <EmptyState
          icon={<AlertIcon className="size-7 text-danger" />}
          title="We couldn’t load your videos"
          description={mine.message}
          action={{ label: 'Try again', onClick: mine.retry }}
        />
      )}

      {mine.status === 'ready' &&
        (mine.videos.length === 0 ? (
          <EmptyState
            icon={<VideoIcon className="size-7" />}
            title="You haven’t uploaded anything yet"
            description="Your uploads appear here, ready to edit."
            action={{ label: 'Upload a video', to: '/upload' }}
          />
        ) : (
          <VideoTable
            videos={mine.videos}
            caption="Your uploads, newest first"
            actions={(video) => (
              <RowActions video={video} onEdit={setEditing} onDelete={setDeleting} />
            )}
          />
        ))}

      {/* Prompt 89 — uploaders can delete their OWN videos (DELETE /videos/:id). */}
      <DeleteVideoModal
        video={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(gone) => mine.updateVideos((list) => list.filter((v) => v.id !== gone.id))}
      />

      <EditVideoModal
        video={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) =>
          mine.updateVideos((list) => list.map((v) => (v.id === updated.id ? updated : v)))
        }
      />
    </Container>
  )
}
