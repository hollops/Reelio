import { useEffect, useState } from 'react'
import { api } from '../../lib/apiClient'
import type { WatchHistory } from '../../lib/types'
import { useAuth } from '../auth/authContext'

// Prompt 68 — "where did I stop last time?" for one video.
//   ready = false  → still asking (the player waits, so it doesn't start at 0:00 and then jump)
//   startAt = null → start from the beginning (never watched, barely started, or finished)

const MIN_SECONDS = 5 // under 5 s in, you'd barely started: begin again
const MAX_FRACTION = 0.95 // over 95% through, you'd basically finished: begin again

export function useResumePosition(videoId: string | undefined) {
  const { status: authStatus, user } = useAuth()
  const signedIn = !!user
  const [result, setResult] = useState<{ for: string; startAt: number | null } | null>(null)

  useEffect(() => {
    if (!videoId || !signedIn) return
    let cancelled = false
    api
      .get<WatchHistory | null>(`/history/${encodeURIComponent(videoId)}`)
      .then((entry) => {
        if (cancelled) return
        const worthResuming =
          entry && entry.progress >= MIN_SECONDS && entry.progress < entry.duration * MAX_FRACTION
        setResult({ for: videoId, startAt: worthResuming ? entry.progress : null })
      })
      .catch(() => {
        // Not being able to resume is no reason to block the video: just start at 0:00.
        if (!cancelled) setResult({ for: videoId, startAt: null })
      })
    return () => {
      cancelled = true
    }
  }, [videoId, signedIn])

  // Visitors have no history → ready at once. While the session is still being checked,
  // wait: we don't yet know whether there's a history to ask about.
  if (authStatus === 'checking') return { ready: false, startAt: null }
  if (!signedIn) return { ready: true, startAt: null }
  const mine = result && result.for === videoId ? result : null // ignore another video's answer
  return { ready: mine !== null, startAt: mine?.startAt ?? null }
}
