import { useCallback, useRef } from 'react'
import { api } from '../../lib/apiClient'
import { useAuth } from '../auth/authContext'

// Prompt 69 — saves "how far in" to the server (POST /history), which is what Resume (68) and
// Continue watching (Home) read back. The PLAYER only announces the time; this hook decides
// whether to send it — so the player stays reusable and knows nothing about servers.

export function useProgressReporter(videoId: string | undefined) {
  const { user } = useAuth()
  const lastSent = useRef<{ videoId: string; second: number } | null>(null)

  return useCallback(
    (seconds: number, duration: number) => {
      // Visitors have no history; a zero or unknown length can't be saved sensibly.
      if (!user || !videoId || !Number.isFinite(duration) || duration <= 0) return
      const second = Math.floor(seconds)
      // Same second as last time (e.g. pause right after a 10-second report)? Don't send twice.
      if (lastSent.current?.videoId === videoId && lastSent.current.second === second) return
      lastSent.current = { videoId, second }
      // Fire and forget: a failed save must never interrupt the video.
      api
        .post('/history', { videoId, progress: Math.min(seconds, duration), duration })
        .catch(() => {})
    },
    [user, videoId],
  )
}
