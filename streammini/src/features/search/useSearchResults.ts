import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { Video } from '../../lib/types'

// Prompt 58 — asks the server for the videos matching a search. Same recipe as useHomeFeed:
// explicit states, late answers ignored (typing fast means old searches finish late), retry.

export type SearchState =
  | { status: 'idle' } // nothing searched yet
  // Prompt 64 — `previous`: the last results, kept on screen (faded) while the next search
  // loads, so typing doesn't flash skeletons on every pause ("stale-while-revalidate").
  | { status: 'loading'; previous?: Video[] }
  | { status: 'error'; message: string }
  | { status: 'ready'; videos: Video[] }

/** What was on screen, to keep showing while the next search loads. */
function lastResults(state: SearchState): Video[] | undefined {
  if (state.status === 'ready') return state.videos
  if (state.status === 'loading') return state.previous
  return undefined
}

export interface SearchRequest {
  q: string
  category?: string | null
}

export function useSearchResults({ q, category = null }: SearchRequest) {
  const [state, setState] = useState<SearchState>({ status: q || category ? 'loading' : 'idle' })
  const [attempt, setAttempt] = useState(0)
  const key = `${q}|${category ?? ''}`

  // New search terms → "loading" straight away (decided during render, not in an effect).
  const [stateFor, setStateFor] = useState(key)
  if (stateFor !== key) {
    setStateFor(key)
    setState(
      q || category ? { status: 'loading', previous: lastResults(state) } : { status: 'idle' },
    )
  }

  useEffect(() => {
    if (!q && !category) return
    let cancelled = false // a newer search started: this answer is out of date
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    params.set('sort', 'popular')
    api
      .get<Video[]>(`/videos?${params}`)
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
  }, [q, category, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
