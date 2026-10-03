// Prompt 87 — how long is this video file? Worked out in the browser BEFORE uploading: load it
// into a hidden <video>, read its duration, let go of it. Nothing is played or shown.
// (The real backend can read it too; the mock relies on the browser telling it.)

export function readVideoDuration(file: File, timeoutMs = 10_000): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file) // a temporary address for the file on this computer
    const video = document.createElement('video')
    const finish = (result: number | Error) => {
      clearTimeout(timer)
      URL.revokeObjectURL(url) // give the memory back (Prompt 31's lesson)
      video.removeAttribute('src')
      if (result instanceof Error) reject(result)
      else resolve(result)
    }
    const timer = setTimeout(() => finish(new Error('Timed out reading the video.')), timeoutMs)
    video.preload = 'metadata' // only the length and first frame, not the whole file
    video.onloadedmetadata = () =>
      Number.isFinite(video.duration)
        ? finish(video.duration)
        : finish(new Error('Could not read the video length.'))
    video.onerror = () => finish(new Error('This file doesn’t look like a video we can play.'))
    video.src = url
  })
}
