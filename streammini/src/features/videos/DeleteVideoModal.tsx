import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/toast/toastContext'
import { api, ApiError } from '../../lib/apiClient'
import type { Video } from '../../lib/types'

// Prompt 89 — "Are you sure?" before deleting, because it can't be undone.
//   • Focus starts on CANCEL (the safe choice) — a reflex Enter or stray tap destroys nothing.
//   • NOT optimistic: the row disappears only after the server confirms. For something that
//     can't be undone, the screen must never claim "deleted" when it wasn't.
//   • `asAdmin`: admins use DELETE /admin/videos/:id; uploaders DELETE /videos/:id (own only).

export function DeleteVideoModal({
  video,
  asAdmin = false,
  onClose,
  onDeleted,
}: {
  video: Video | null
  asAdmin?: boolean
  onClose: () => void
  onDeleted: (video: Video) => void
}) {
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Opened → put focus on Cancel. (Runs after the Modal's own effect has opened the <dialog>.)
  useEffect(() => {
    if (video) cancelRef.current?.focus()
  }, [video])

  async function confirm() {
    if (!video || deleting) return
    setDeleting(true)
    setError(undefined)
    try {
      const id = encodeURIComponent(video.id)
      await api.delete(asAdmin ? `/admin/videos/${id}` : `/videos/${id}`)
      onDeleted(video)
      toast.success(`Deleted “${video.title}”.`)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t delete it. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={video !== null}
      onClose={() => !deleting && onClose()} // no closing halfway through a delete
      title={video ? `Delete “${video.title}”?` : 'Delete video?'}
      size="sm"
      footer={
        <>
          <Button ref={cancelRef} variant="ghost" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} isLoading={deleting}>
            Delete video
          </Button>
        </>
      }
    >
      <p className="text-small text-fg-muted">
        This removes the video for everyone, along with its comments, likes and watch history. It
        can’t be undone.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-small text-danger">
          {error}
        </p>
      )}
    </Modal>
  )
}
