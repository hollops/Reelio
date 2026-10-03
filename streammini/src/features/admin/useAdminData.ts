import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { User, Video } from '../../lib/types'

// Prompt 85 — everything the Admin dashboard shows: every video (newest first) and every user.
// Both requests leave at the same time (Promise.all), like the Home page.

export type AdminData =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; videos: Video[]; users: User[] }

export function useAdminData() {
  const [state, setState] = useState<AdminData>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.get<Video[]>('/admin/videos'), api.get<User[]>('/admin/users')])
      .then(([videos, users]) => {
        if (!cancelled) setState({ status: 'ready', videos, users })
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

  /** Load again (after an edit or delete elsewhere), keeping the table on screen meanwhile. */
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  /** Change the loaded list directly (e.g. remove a deleted row at once — optimistic). */
  const updateVideos = useCallback((change: (videos: Video[]) => Video[]) => {
    setState((prev) => (prev.status === 'ready' ? { ...prev, videos: change(prev.videos) } : prev))
  }, [])

  return { ...state, reload, retry, updateVideos }
}
