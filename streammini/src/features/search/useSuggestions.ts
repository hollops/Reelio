import { useEffect, useState } from 'react'
import { api } from '../../lib/apiClient'
import type { Video } from '../../lib/types'

// Prompt 62 — up to 5 quick matches for the NavBar dropdown. Give it the DEBOUNCED text,
// so it asks the server at most once per typing pause.

export const SUGGESTION_COUNT = 5
export const SUGGEST_FROM_LENGTH = 2 // one letter matches almost everything — not useful

export function useSuggestions(query: string, enabled: boolean): Video[] {
  const [results, setResults] = useState<{ for: string; videos: Video[] }>({ for: '', videos: [] })
  const active = enabled && query.length >= SUGGEST_FROM_LENGTH

  useEffect(() => {
    if (!active) return
    let cancelled = false // typing moved on: this answer is stale
    api
      .get<Video[]>(`/videos?${new URLSearchParams({ q: query, sort: 'popular' })}`)
      .then((videos) => {
        if (!cancelled) setResults({ for: query, videos: videos.slice(0, SUGGESTION_COUNT) })
      })
      .catch(() => {
        // Suggestions are a nicety: on failure, just show none (Enter still searches).
        if (!cancelled) setResults({ for: query, videos: [] })
      })
    return () => {
      cancelled = true
    }
  }, [query, active])

  // Only show answers that belong to the CURRENT text.
  return active && results.for === query ? results.videos : []
}
