import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { VideoDetail } from '../../lib/types'
import { useAuth } from '../auth/authContext'

// Prompt 48 — loads ONE video (with its comments and "did I like it?") for the Watch page.
// Same recipe as useHomeFeed: explicit states, late answers ignored, a retry.

export type VideoState =
  | { status: 'loading' }
  | { status: 'not-found' } // 404: the video doesn't exist (or was deleted)
  | { status: 'error'; message: string } // anything else: offline, server trouble…
  | { status: 'ready'; video: VideoDetail }

export function useVideo(videoId: string | undefined): VideoState & {
  retry: () => void
  /** Replace the loaded video (e.g. after a like or a new comment) without refetching. */
  update: (change: (video: VideoDetail) => VideoDetail) => void
} {
  const { status: authStatus, user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<VideoState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // A new id means a different video: show "loading" instead of the previous video's page.
  // (Decided during render by remembering which id the current state belongs to.)
  const [stateFor, setStateFor] = useState(videoId)
  if (stateFor !== videoId) {
    setStateFor(videoId)
    setState({ status: 'loading' })
  }

  useEffect(() => {
    // Wait for the session check: "did I like this?" depends on who's asking.
    if (authStatus === 'checking' || !videoId) return
    let cancelled = false // set if the id changes before this answer arrives
    api
      .get<VideoDetail>(`/videos/${encodeURIComponent(videoId)}`)
      .then((video) => {
        if (!cancelled) setState({ status: 'ready', video })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setState({ status: 'not-found' })
        else {
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Something went wrong.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [videoId, authStatus, userId, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const update = useCallback((change: (video: VideoDetail) => VideoDetail) => {
    setState((prev) =>
      prev.status === 'ready' ? { status: 'ready', video: change(prev.video) } : prev,
    )
  }, [])

  return { ...state, retry, update }
}
