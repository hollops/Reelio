import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useToast } from '../../components/toast/toastContext'
import { api, ApiError } from '../../lib/apiClient'
import type { Video } from '../../lib/types'
import { useAuth } from '../auth/authContext'
import { WatchLaterContext, type WatchLaterContextValue } from './watchLaterContext'

// Prompt 42 — owns the Watch later list and makes changes OPTIMISTIC: the ✓ appears the instant
// you click, the request goes to the server in the background, and only if the server refuses
// does the button flip back (with a message saying why).
//
// Two layers of truth:
//   confirmed — what the server has agreed to
//   pending   — clicks still on their way (videoId → wanted saved?)
// The screen shows `pending` when there is one, otherwise `confirmed`. A failure just deletes its
// pending entry, which "rolls back" to the confirmed value — nothing else to undo.
//
// The list remembers WHOSE it is (`owner`). When the person changes it starts again empty, and a
// late answer meant for the previous person is ignored — one user's list never leaks into the next.

/** Prompt 84 — `quiet`: skip the confirmation toast (the caller shows its own). */
interface ChangeOptions {
  quiet?: boolean
}

interface ListState {
  owner: string | null
  confirmed: Set<string>
  pending: Map<string, boolean>
}

const emptyList = (owner: string | null): ListState => ({
  owner,
  confirmed: new Set(),
  pending: new Map(),
})

export function WatchLaterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [list, setList] = useState<ListState>(() => emptyList(userId))
  const [status, setStatus] = useState<'loading' | 'ready'>(userId ? 'loading' : 'ready')
  // Numbers each click per video, so a slow answer to an OLD click can't overrule a newer one.
  const clickNumber = useRef(new Map<string, number>())
  // The LATEST wish per video, updated the instant a click happens. A double-click fires two
  // clicks before React re-renders, so reading state would give both clicks the same stale answer.
  const latestWish = useRef(new Map<string, boolean>())
  // One queue per video: requests go to the server one at a time, in click order. Sent together,
  // "save" and "remove" could arrive in the wrong order and leave the server disagreeing.
  const queue = useRef(new Map<string, Promise<unknown>>())

  // A different person (sign in / out / switch)? Start again from an empty list — decided during
  // render by comparing with the owner we have, the same pattern as the Viora logo's spin.
  if (list.owner !== userId) {
    setList(emptyList(userId))
    setStatus(userId ? 'loading' : 'ready')
  }

  // --- Prompt 83: keep OTHER TABS up to date ------------------------------------------------
  // A BroadcastChannel is like a walkie-talkie shared by every tab of this site. After a change
  // is confirmed, this tab says "Watch later changed"; the others reload their list. `version`
  // counts those reloads, so pages holding their own copy (the Watch later page) can reload too.
  const [version, setVersion] = useState(0)
  const channel = useRef<BroadcastChannel | null>(null)
  useEffect(() => {
    if (!userId || typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel('viora-watch-later')
    ch.onmessage = (e: MessageEvent<{ userId: string }>) => {
      if (e.data?.userId === userId) setVersion((n) => n + 1) // same person, another tab
    }
    channel.current = ch
    return () => {
      ch.close()
      channel.current = null
    }
  }, [userId])

  // Signed in → fetch that person's saved list (and again whenever another tab changed it).
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api
      .get<Video[]>('/watch-later')
      .then((videos) => {
        if (cancelled) return
        setList((prev) =>
          prev.owner === userId ? { ...prev, confirmed: new Set(videos.map((v) => v.id)) } : prev,
        )
        setStatus('ready')
      })
      .catch(() => {
        // Not fatal: buttons just start as "not saved"; saving still works.
        if (!cancelled) setStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [userId, version])

  const isSaved = useCallback(
    (videoId: string) => list.pending.get(videoId) ?? list.confirmed.has(videoId),
    [list],
  )

  // One function does the work; toggle / save / remove are thin doors into it (below).
  // `wanted` given = an EXPLICIT save/remove: no "what's the current state?" question to get
  // wrong. That matters for Undo (Prompt 78): its button is created at removal time, so asking
  // a toggle later would use that moment's stale answer ("still saved") and remove it again.
  // Prompt 84 — the one Watch later toast currently showing, so a new one REPLACES it
  // (five quick clicks = one updating toast, not a stack of five).
  const lastToast = useRef<string | null>(null)
  // The latest `change`, for the toast's Undo button (created now, clicked later).
  const changeRef = useRef<typeof change | null>(null)

  const change = useCallback(
    (
      video: Pick<Video, 'id' | 'title'>,
      wanted?: boolean,
      { quiet = false }: ChangeOptions = {},
    ) => {
      if (!userId) {
        // YouTube-style: the button works for everyone, but explains that saving needs an account.
        toast.info('Sign in to save videos for later.', {
          action: {
            label: 'Sign in',
            onClick: () => navigate('/login', { state: { from: location } }),
          },
        })
        return
      }

      const key = `${userId}:${video.id}` // per person, so a sign-out can't leave stale wishes
      const want = wanted ?? !(latestWish.current.get(key) ?? isSaved(video.id))
      latestWish.current.set(key, want)
      const myClick = (clickNumber.current.get(key) ?? 0) + 1
      clickNumber.current.set(key, myClick)
      const isLatest = () => clickNumber.current.get(key) === myClick
      const settle = () => {
        if (isLatest()) latestWish.current.delete(key)
      }

      // 1. Change the screen NOW.
      setList((prev) => ({ ...prev, pending: new Map(prev.pending).set(video.id, want) }))

      // Prompt 84 — a small confirmation, unless the caller shows its own (the Watch later page).
      let myToast: string | null = null
      if (!quiet) {
        if (lastToast.current) toast.dismiss(lastToast.current)
        myToast = want
          ? toast.info('Saved to Watch later.', {
              action: { label: 'View', onClick: () => navigate('/watch-later') },
            })
          : toast.info('Removed from Watch later.', {
              // EXPLICIT save (Prompt 78's lesson): never a toggle from an old button.
              action: { label: 'Undo', onClick: () => changeRef.current?.(video, true) },
            })
        lastToast.current = myToast
      }

      // 2. Tell the server in the background — after any earlier request for this video.
      const send = () =>
        want
          ? api.post('/watch-later', { videoId: video.id })
          : api.delete(`/watch-later/${encodeURIComponent(video.id)}`)
      const request = (queue.current.get(key) ?? Promise.resolve()).then(send, send)
      queue.current.set(
        key,
        request.catch(() => {}),
      )

      request.finally(settle).then(
        () => {
          // 3a. Server agreed: make it "confirmed". Clear the pending mark only if no newer
          //     click on this video has happened since (that one is still travelling).
          const latest = isLatest()
          channel.current?.postMessage({ userId }) // Prompt 83: tell the other tabs
          setList((prev) => {
            if (prev.owner !== userId) return prev // someone else is signed in now: ignore
            const confirmed = new Set(prev.confirmed)
            if (want) confirmed.add(video.id)
            else confirmed.delete(video.id)
            const pending = new Map(prev.pending)
            if (latest) pending.delete(video.id)
            return { ...prev, confirmed, pending }
          })
        },
        (err: unknown) => {
          // 3b. Server refused: roll back (drop the pending mark) — unless a newer click
          //     already replaced this one, in which case that click decides.
          if (!isLatest()) return
          setList((prev) => {
            if (prev.owner !== userId) return prev
            const pending = new Map(prev.pending)
            pending.delete(video.id)
            return { ...prev, pending }
          })
          // Take back the hopeful "Saved" — it isn't true — and say what really happened.
          if (myToast) toast.dismiss(myToast)
          const reason = err instanceof ApiError ? err.message : 'Please try again.'
          toast.error(`Couldn’t ${want ? 'save' : 'remove'} “${video.title}”. ${reason}`)
        },
      )
    },
    [userId, isSaved, toast, navigate, location],
  )

  // Layout effect: up to date the moment a render is committed, before any click can land.
  useLayoutEffect(() => {
    changeRef.current = change
  })

  // Prompt 98 — these three keep the SAME identity forever (they call the latest `change`
  // through changeRef). They used to be rebuilt on every save — and since every card on Home
  // receives `toggle`, one save re-rendered all ~30 cards even though only one had changed.
  const toggle = useCallback((video: Pick<Video, 'id' | 'title'>) => changeRef.current?.(video), [])
  const save = useCallback(
    (video: Pick<Video, 'id' | 'title'>, options?: ChangeOptions) =>
      changeRef.current?.(video, true, options),
    [],
  )
  const remove = useCallback(
    (video: Pick<Video, 'id' | 'title'>, options?: ChangeOptions) =>
      changeRef.current?.(video, false, options),
    [],
  )

  const value = useMemo<WatchLaterContextValue>(
    () => ({ status, isSaved, toggle, save, remove, version }),
    [status, isSaved, toggle, save, remove, version],
  )

  return <WatchLaterContext.Provider value={value}>{children}</WatchLaterContext.Provider>
}
