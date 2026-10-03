import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { Video } from '../../lib/types'

// Prompt 88 (bonus) — the signed-in person's own uploads, newest first (GET /videos/my-videos).

export type MyVideosState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; videos: Video[] }

export function useMyVideos() {
  const [state, setState] = useState<MyVideosState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .get<Video[]>('/videos/my-videos')
      .then((videos) => {
        if (!cancelled) setState({ status: 'ready', videos })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Something went wrong.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])
  const updateVideos = useCallback((change: (videos: Video[]) => Video[]) => {
    setState((prev) => (prev.status === 'ready' ? { ...prev, videos: change(prev.videos) } : prev))
  }, [])

  return { ...state, retry, updateVideos }
}
