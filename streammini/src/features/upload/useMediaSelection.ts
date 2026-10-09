import { useRef, useState } from 'react'
import { checkThumbnailFile, checkVideoFile, thumbnailFromVideo } from './mediaFiles'
import { readVideoDuration } from './readVideoDuration'

// Prompt 90 — what the uploader remembers: the chosen video (and its length), the thumbnail,
// and any problems. The thumbnail is YOURS if you picked one, otherwise one made from a frame
// of the video. Picking a new video while the last one is still being read? A ticket number
// makes sure only the latest choice's answers are used (the "latest click wins" idea again).

export function useMediaSelection() {
  const [video, setVideo] = useState<File | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [autoThumb, setAutoThumb] = useState<File | null>(null)
  const [customThumb, setCustomThumb] = useState<File | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [videoError, setVideoError] = useState<string>()
  const [thumbError, setThumbError] = useState<string>()
  const ticket = useRef(0)

  async function chooseVideo(file: File) {
    const problem = checkVideoFile(file)
    if (problem) {
      setVideoError(problem) // keep whatever was chosen before
      return
    }
    const mine = ++ticket.current
    setVideo(file)
    setDuration(null)
    setAutoThumb(null)
    setVideoError(undefined)
    setPreparing(true)
    try {
      const length = await readVideoDuration(file)
      if (mine !== ticket.current) return
      setDuration(length)
    } catch (err) {
      if (mine !== ticket.current) return
      setVideo(null)
      setVideoError(err instanceof Error ? err.message : 'That file can’t be read.')
      setPreparing(false)
      return
    }
    try {
      const frame = await thumbnailFromVideo(file)
      if (mine === ticket.current) setAutoThumb(frame)
    } catch {
      // No frame (unusual codec, or the seek timed out)? Fine — the upload still goes
      // ahead and the server falls back to a placeholder. A missing thumbnail must never
      // stop someone publishing a video.
    } finally {
      // finally, NOT a line after the try: an unexpected throw here used to leave the form
      // stuck on "Preparing your video…" with no error and no way forward.
      if (mine === ticket.current) setPreparing(false)
    }
  }

  function chooseThumbnail(file: File) {
    const problem = checkThumbnailFile(file)
    setThumbError(problem)
    if (!problem) setCustomThumb(file)
  }

  /** Run with the form's own checks (VideoForm's onValidate). */
  function validate() {
    if (video) return true
    setVideoError('Choose a video file to upload.')
    return false
  }

  return {
    video,
    duration,
    thumbnail: customThumb ?? autoThumb,
    thumbnailIsCustom: customThumb !== null,
    preparing,
    videoError,
    thumbError,
    chooseVideo,
    chooseThumbnail,
    backToVideoFrame: () => setCustomThumb(null), // not "use…": that prefix means "hook"
    setVideoError,
    validate,
  }
}
