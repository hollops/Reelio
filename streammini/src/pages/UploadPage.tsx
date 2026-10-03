import { useNavigate } from 'react-router'
import { Container, PageHeader } from '../components/layout'
import { useToast } from '../components/toast/toastContext'
import { MediaUploader } from '../features/upload/MediaUploader'
import { useFakeProgress } from '../features/upload/useFakeProgress'
import { useMediaSelection } from '../features/upload/useMediaSelection'
import { VideoForm } from '../features/videos/VideoForm'
import { api, ApiError, USE_MOCK_API } from '../lib/apiClient'
import type { Video } from '../lib/types'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 87 — uploading (the prompt's "Create Title"; in our model ANY signed-in user uploads,
// and the admin moderates). Choose a file, fill in the details, and it's sent as FormData to
// POST /videos — the envelope that can carry a file, which plain JSON can't.
// Prompt 90 — the full uploader: video + thumbnail with previews, and a progress bar.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function UploadPage() {
  usePageTitle('Upload a video')
  const navigate = useNavigate()
  const toast = useToast()
  const media = useMediaSelection()
  const upload = useFakeProgress()

  async function send(details: { title: string; description: string; category: string }) {
    if (!media.video) {
      media.validate()
      throw new Error('Choose a video file to upload.') // shown at the top of the form too
    }
    const form = new FormData()
    form.append('title', details.title)
    form.append('description', details.description)
    form.append('category', details.category)
    form.append('video', media.video)
    if (media.thumbnail) form.append('thumbnail', media.thumbnail)
    // The length was read in the browser when the file was chosen (the mock relies on it).
    form.append('duration', String(Math.round(media.duration ?? 0)))

    upload.start()
    try {
      // The mock answers in a blink; keep the (fake) bar up long enough to be seen.
      const [video] = await Promise.all([
        api.post<Video>('/videos', form),
        USE_MOCK_API ? wait(1500) : undefined,
      ])
      upload.finish()
      await wait(400) // let "Uploaded" — the full bar — register before moving on
      toast.success(`Uploaded “${video.title}”.`)
      navigate(`/watch/${video.id}`) // like YouTube: straight to your new video
    } catch (err) {
      upload.reset()
      // A file problem the server spotted belongs under the file picker.
      if (err instanceof ApiError && err.fieldErrors.video)
        media.setVideoError(err.fieldErrors.video)
      throw err
    }
  }

  return (
    <Container size="content" className="pb-16">
      <PageHeader title="Upload a video" description="Share something with Viora." />
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <VideoForm
          submitLabel="Upload"
          onSubmit={send}
          // Checked together with title and category, so all the problems show at once.
          onValidate={media.validate}
          // Still reading the file / making the thumbnail? Wait for it.
          submitDisabled={media.preparing}
          duration={media.duration}
        >
          <MediaUploader media={media} progress={upload.progress} />
        </VideoForm>
      </div>
    </Container>
  )
}
