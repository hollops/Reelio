import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toast/toastContext'
import { api } from '../../lib/apiClient'
import type { Video } from '../../lib/types'
import { VideoForm } from './VideoForm'

// Prompt 88 — edit a video's details in a pop-up: the SAME VideoForm as uploading (86), but
// pre-filled. Saves with PUT /videos/:id — the server allows the uploader OR an admin (403
// otherwise). Used by the Admin dashboard and by "Your videos".

export function EditVideoModal({
  video,
  onClose,
  onSaved,
}: {
  /** The video being edited, or null when the pop-up is closed. */
  video: Video | null
  onClose: () => void
  /** Hands back the server's updated video, so the page can update that row in place. */
  onSaved: (updated: Video) => void
}) {
  const toast = useToast()
  return (
    <Modal open={video !== null} onClose={onClose} title="Edit video details" size="md">
      {video && (
        // key: a different video = a fresh form with ITS values (not the previous one's).
        <VideoForm
          key={video.id}
          initialValues={{
            title: video.title,
            description: video.description,
            category: video.category,
          }}
          submitLabel="Save changes"
          duration={video.duration}
          onCancel={onClose}
          onSubmit={async (details) => {
            const updated = await api.put<Video>(`/videos/${encodeURIComponent(video.id)}`, details)
            onSaved(updated)
            toast.success(`Saved changes to “${updated.title}”.`)
            onClose()
          }}
        />
      )}
    </Modal>
  )
}
