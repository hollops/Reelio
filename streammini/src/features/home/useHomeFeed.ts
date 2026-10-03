import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { Video, WatchHistoryEntry } from '../../lib/types'
import { useAuth } from '../auth/authContext'
import type { HomeFeedData } from './HomeFeed'
import { buildHomeFeed } from './buildHomeFeed'

// Prompt 39 — fetches everything the Home page needs and groups it with buildHomeFeed.
//
// Written by hand on purpose, to show what's involved: loading/error states, ignoring answers
// that arrive too late, retrying, and refetching when the user changes. The PRD's TanStack Query
// automates exactly these chores; we can switch to it once the prompts reach shared data.

/** Exactly one of these at a time. */
export type HomeFeedState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: HomeFeedData }

export function useHomeFeed(): HomeFeedState & { retry: () => void } {
  const { status: authStatus, user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<HomeFeedState>({ status: 'loading' })
  // Bumping this number re-runs the effect below — that's what "Try again" does.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // Still checking who's signed in? Wait — otherwise we'd fetch once as "anonymous"
    // and again a moment later as the real user.
    if (authStatus === 'checking') return

    let cancelled = false // set when the user/attempt changes before this answer arrives
    async function load() {
      try {
        const [videos, history] = await Promise.all([
          // Both requests leave at the SAME time, instead of one after the other.
          api.get<Video[]>('/videos?sort=popular'),
          userId
            ? // History is a bonus row: if it fails, Home still works without it.
              api.get<WatchHistoryEntry[]>('/history').catch(() => [])
            : Promise.resolve([]),
        ])
        if (!cancelled) setState({ status: 'ready', data: buildHomeFeed(videos, history) })
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Something went wrong.',
          })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // userId (not `user`): a new name or photo shouldn't refetch the whole feed; a new PERSON should.
  }, [authStatus, userId, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
