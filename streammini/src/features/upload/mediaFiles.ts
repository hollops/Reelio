// Prompt 90 — rules for the files you upload, checked in the browser first (the backend —
// Cloudinary behind it — must check again: a renamed file can lie about its type).

export const VIDEO_MAX_BYTES = 200 * 1024 * 1024 // 200 MB
export const THUMB_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const THUMB_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1).replace(/\.0$/, '') : Math.round(mb)} MB`
}

export function checkVideoFile(file: File): string | undefined {
  if (!file.type.startsWith('video/')) return 'Choose a video file (MP4, WebM or MOV).'
  if (file.size > VIDEO_MAX_BYTES) {
    return `That video is ${formatBytes(file.size)}. Choose one under ${formatBytes(VIDEO_MAX_BYTES)}.`
  }
  return undefined
}

export function checkThumbnailFile(file: File): string | undefined {
  if (!THUMB_TYPES.includes(file.type)) return 'Choose a JPG, PNG or WebP image.'
  if (file.size > THUMB_MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. Choose one under ${formatBytes(THUMB_MAX_BYTES)}.`
  }
  return undefined
}

/**
 * Make a thumbnail from a frame of the video (1 second in, or the middle of a very short one) —
 * what YouTube does when you don't pick one. A hidden <video> jumps to that moment and a
 * canvas "photographs" it into a JPEG file.
 */
export function thumbnailFromVideo(file: File, width = 640): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const cleanUp = () => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
    }
    video.muted = true
    video.preload = 'auto'
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2)
    }
    video.onseeked = () => {
      const scale = width / (video.videoWidth || width)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = Math.round((video.videoHeight || width * 0.5625) * scale)
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          cleanUp()
          if (blob) resolve(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }))
          else reject(new Error('Could not make a thumbnail.'))
        },
        'image/jpeg',
        0.85,
      )
    }
    video.onerror = () => {
      cleanUp()
      reject(new Error('Could not read the video.'))
    }
    video.src = url
  })
}
