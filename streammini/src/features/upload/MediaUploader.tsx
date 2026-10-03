import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { Button } from '../../components/Button'
import { UploadIcon } from '../../components/icons'
import { Spinner } from '../../components/Spinner'
import { formatDuration } from '../../lib/format'
import { formatBytes, THUMB_TYPES } from './mediaFiles'
import type { useMediaSelection } from './useMediaSelection'

// Prompt 90 — the uploader: a video (drag it in or choose it) with a preview player, a
// thumbnail with its preview, and a progress bar while uploading. It only SHOWS things;
// what's chosen lives in useMediaSelection, and the progress comes from the Upload page.

type Selection = ReturnType<typeof useMediaSelection>

export function MediaUploader({
  media,
  progress,
}: {
  media: Selection
  /** 0–100 while uploading, null otherwise. */
  progress: number | null
}) {
  const videoInput = useRef<HTMLInputElement>(null)
  const thumbInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const id = useId()
  const videoErrorId = `${id}-video-error`
  const thumbErrorId = `${id}-thumb-error`

  function onDrop(e: DragEvent) {
    e.preventDefault() // otherwise the browser opens the file in the tab
    setDragging(false)
    if (progress !== null) return // no swapping files mid-upload
    const file = e.dataTransfer.files[0]
    if (file) void media.chooseVideo(file)
  }

  return (
    <div className="space-y-5">
      {/* The real file boxes are hidden; the buttons below open them. */}
      <input
        ref={videoInput}
        type="file"
        name="video"
        accept="video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void media.chooseVideo(file)
          e.target.value = '' // so choosing the same file again still counts as a change
        }}
      />
      <input
        ref={thumbInput}
        type="file"
        name="thumbnail"
        accept={THUMB_TYPES.join(',')}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) media.chooseThumbnail(file)
          e.target.value = ''
        }}
      />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
        {/* ── The video ─────────────────────────────────────────── */}
        <section aria-labelledby={`${id}-video`} className="space-y-2">
          <h2 id={`${id}-video`} className="text-small font-medium">
            Video file
          </h2>
          <div
            onDragOver={(e) => {
              e.preventDefault() // "yes, you may drop here"
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
              dragging
                ? 'border-accent bg-accent/10'
                : media.videoError
                  ? 'border-danger'
                  : 'border-line'
            }`}
          >
            {media.video ? (
              <FilePreview kind="video" file={media.video} />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center">
                <UploadIcon className="size-8 text-fg-muted" />
                <p className="text-small text-fg-muted">Drag a video here, or</p>
                <Button
                  size="sm"
                  onClick={() => videoInput.current?.click()}
                  aria-describedby={media.videoError ? videoErrorId : `${id}-video-hint`}
                  aria-invalid={media.videoError ? true : undefined}
                >
                  Choose a video
                </Button>
                <p id={`${id}-video-hint`} className="text-xs text-fg-muted">
                  MP4, WebM or MOV · up to 200 MB
                </p>
              </div>
            )}
          </div>

          {media.video && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-small text-fg-muted">
                <span className="block truncate font-medium text-fg">{media.video.name}</span>
                {formatBytes(media.video.size)}
                {media.duration !== null && ` · ${formatDuration(media.duration)}`}
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => videoInput.current?.click()}
                aria-describedby={media.videoError ? videoErrorId : undefined}
              >
                Change video
              </Button>
            </div>
          )}
          {media.preparing && (
            <p role="status" className="flex items-center gap-2 text-small text-fg-muted">
              <Spinner size="sm" label={null} /> Preparing your video…
            </p>
          )}
          {media.videoError && (
            <p id={videoErrorId} role="alert" className="text-small text-danger">
              {media.videoError}
            </p>
          )}
        </section>

        {/* ── The thumbnail ─────────────────────────────────────── */}
        <section aria-labelledby={`${id}-thumb`} className="space-y-2">
          <h2 id={`${id}-thumb`} className="text-small font-medium">
            Thumbnail
          </h2>
          <div className="overflow-hidden rounded-xl border border-line bg-elevated">
            {media.thumbnail ? (
              <FilePreview
                kind="image"
                file={media.thumbnail}
                // Prompt 94 — say WHICH thumbnail it is, not just that there's a picture.
                alt={`Thumbnail preview: ${media.thumbnailIsCustom ? 'your image' : 'a frame from your video'}`}
              />
            ) : (
              <p className="flex aspect-video items-center justify-center p-4 text-center text-xs text-fg-muted">
                {media.video
                  ? 'Making one from your video…'
                  : 'Made from your video, or choose your own'}
              </p>
            )}
          </div>
          {media.thumbnail && (
            <p className="text-xs text-fg-muted">
              {media.thumbnailIsCustom ? 'Your image' : 'A frame from your video'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => thumbInput.current?.click()}
              aria-describedby={media.thumbError ? thumbErrorId : `${id}-thumb-hint`}
              aria-invalid={media.thumbError ? true : undefined}
            >
              {media.thumbnailIsCustom ? 'Change image' : 'Choose image'}
            </Button>
            {media.thumbnailIsCustom && media.video && (
              <Button size="sm" variant="ghost" onClick={media.backToVideoFrame}>
                Use a frame from the video
              </Button>
            )}
          </div>
          <p id={`${id}-thumb-hint`} className="text-xs text-fg-muted">
            JPG, PNG or WebP · up to 5 MB
          </p>
          {media.thumbError && (
            <p id={thumbErrorId} role="alert" className="text-small text-danger">
              {media.thumbError}
            </p>
          )}
        </section>
      </div>

      {progress !== null && <UploadProgress value={progress} />}
    </div>
  )
}

function UploadProgress({ value }: { value: number }) {
  const percent = Math.round(value)
  const label = percent >= 100 ? 'Uploaded' : `Uploading… ${percent}%`
  return (
    <div className="space-y-1.5">
      {/* Hidden from screen readers: the progressbar below already says it (aria-valuetext). */}
      <p aria-hidden="true" className="text-small tabular-nums">
        {label}
      </p>
      <div
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={label}
        className="h-2 overflow-hidden rounded-full bg-elevated"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Shows a file from this computer. The temporary address is made when the preview appears and
 * given back when it goes (or the file changes) — set straight on the element, no state needed.
 */
function FilePreview({ kind, file, alt }: { kind: 'video' | 'image'; file: File; alt?: string }) {
  const ref = useRef<HTMLVideoElement & HTMLImageElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const url = URL.createObjectURL(file)
    el.src = url
    return () => {
      el.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [file])

  return kind === 'video' ? (
    <video
      ref={ref}
      controls
      muted
      playsInline
      preload="metadata"
      aria-label={`Preview of ${file.name}`}
      className="aspect-video w-full bg-black"
    />
  ) : (
    <img ref={ref} alt={alt ?? ''} className="aspect-video w-full object-cover" />
  )
}
