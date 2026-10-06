import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/apiClient'
import type { WatchHistoryEntry } from '../../lib/types'

// Everything this viewer has watched (GET /history), newest first — the History page.
// The same entries drive "Continue watching" on Home (buildHomeFeed), but this page shows
// ALL of them, including the ones already finished.

export type WatchHistoryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: WatchHistoryEntry[] }

export function useWatchHistory() {
  const [state, setState] = useState<WatchHistoryState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // `cancelled` guards against a late answer landing after the page has gone — React would
    // warn, and worse, a stale list could overwrite a newer one.
    let cancelled = false
    api
      .get<WatchHistoryEntry[]>('/history')
      .then((entries) => {
        if (!cancelled) setState({ status: 'ready', entries })
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

  /**
   * Remove one video from history, optimistically.
   *
   * The card disappears immediately — waiting for the server first makes the UI feel broken.
   * If the request fails we put the entry back at the SAME position (not the top), so the
   * list the viewer is looking at does not reshuffle under them.
   */
  /** Put an entry back where it was — used by the failure path above and by Undo. */
  const restoreAt = useCallback((entry: WatchHistoryEntry, index: number) => {
    setState((prev) => {
      if (prev.status !== 'ready') return prev
      if (prev.entries.some((e) => e.videoId === entry.videoId)) return prev // already back
      const entries = [...prev.entries]
      entries.splice(Math.min(index, entries.length), 0, entry)
      return { ...prev, entries }
    })
  }, [])

  const remove = useCallback(
    async (videoId: string) => {
      // Read the current list from state, NOT from inside a setState updater: React may call
      // an updater twice (StrictMode), so an updater must stay pure — no assigning to
      // variables outside it. We need the old index anyway, to restore it if the call fails.
      if (state.status !== 'ready') return
      const index = state.entries.findIndex((e) => e.videoId === videoId)
      if (index === -1) return
      const entry = state.entries[index]!

      setState((prev) =>
        prev.status === 'ready'
          ? { ...prev, entries: prev.entries.filter((e) => e.videoId !== videoId) }
          : prev,
      )

      try {
        await api.delete(`/history/${encodeURIComponent(videoId)}`)
      } catch (err) {
        restoreAt(entry, index)
        throw new Error(
          err instanceof ApiError ? err.message : 'Could not remove that video from your history.',
        )
      }
    },
    [state, restoreAt],
  )


  /**
   * Undo a removal: put the card back AND tell the server, so a refresh keeps it.
   *
   * POST /history is the only way to recreate an entry, and it moves the video to the top of
   * the server's list. We deliberately restore it at its original index on screen — the viewer
   * expects their list to look exactly as it did a second ago. The two agree again on reload.
   */
  const undoRemove = useCallback(
    async (entry: WatchHistoryEntry, index: number) => {
      restoreAt(entry, index)
      try {
        await api.post('/history', {
          videoId: entry.videoId,
          progress: entry.progress,
          duration: entry.duration,
        })
      } catch {
        // Undo is a courtesy; if it fails the card simply goes again on the next load.
      }
    },
    [restoreAt],
  )

  return { ...state, retry, remove, undoRemove }
}
