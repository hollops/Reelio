import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { Video } from '../../lib/types'
import { useWatchLater } from './watchLaterContext'

// Prompt 77 — the full saved videos (GET /watch-later), for the Watch later page.
// (The shared memory from Prompt 42 only knows WHICH ids are saved; the page also needs each
// video's title, thumbnail, channel…, so it asks for the full list.)

export type WatchLaterVideosState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; videos: Video[] }

export function useWatchLaterVideos() {
  const [state, setState] = useState<WatchLaterVideosState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // Prompt 83 — another tab saved or removed something: reload this page's copy too.
  const { version } = useWatchLater()

  useEffect(() => {
    let cancelled = false
    api
      .get<Video[]>('/watch-later')
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
  }, [attempt, version])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
