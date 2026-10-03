import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useToast } from '../../components/toast/toastContext'
import { api, ApiError } from '../../lib/apiClient'
import type { VideoDetail } from '../../lib/types'
import { useAuth } from '../auth/authContext'

// Prompt 54 — like / unlike, OPTIMISTIC (the same recipe as Watch later in Prompt 42):
//   1. flip the thumb and the count on screen immediately
//   2. send POST (like) or DELETE (unlike) — one at a time per video, in click order
//   3a. server agrees → use ITS count (others may have liked meanwhile)
//   3b. server refuses → go back to the last confirmed state, and say why

interface LikeState {
  likedByMe: boolean
  likes: number
}

export function useLike(
  video: VideoDetail | null,
  update: (change: (video: VideoDetail) => VideoDetail) => void,
) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const videoId = video?.id
  const confirmed = useRef<LikeState | null>(null) // what the server last agreed to
  const latestWish = useRef<boolean | null>(null) // updated the instant a click happens
  const clickNumber = useRef(0)
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  // A newly loaded video: its fetched like state is the confirmed starting point.
  // (Only when the id changes — later changes to `video` are our own optimistic edits.)
  const loadedLiked = video?.likedByMe
  const loadedLikes = video?.likes
  useEffect(() => {
    confirmed.current =
      loadedLiked === undefined || loadedLikes === undefined
        ? null
        : { likedByMe: loadedLiked, likes: loadedLikes }
    latestWish.current = null
    clickNumber.current = 0
    queue.current = Promise.resolve()
    // Deliberately keyed on the video id ONLY: re-running on every optimistic like would
    // overwrite "what the server confirmed" with our own guess.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  function toggle() {
    if (!video) return
    if (!user) {
      toast.info('Sign in to like videos.', {
        action: {
          label: 'Sign in',
          onClick: () => navigate('/login', { state: { from: location } }),
        },
      })
      return
    }

    const id = video.id
    const want = !(latestWish.current ?? video.likedByMe)
    latestWish.current = want
    const myClick = ++clickNumber.current
    const isLatest = () => clickNumber.current === myClick
    const onThisVideo = (change: (v: VideoDetail) => VideoDetail) =>
      update((v) => (v.id === id ? change(v) : v))

    // 1. Now: flip the thumb, nudge the count by one.
    onThisVideo((v) =>
      v.likedByMe === want
        ? v
        : { ...v, likedByMe: want, likes: Math.max(0, v.likes + (want ? 1 : -1)) },
    )

    // 2. In the background, after any earlier like/unlike of this video.
    const path = `/videos/${encodeURIComponent(id)}/like`
    const send = () => (want ? api.post<LikeState>(path) : api.delete<LikeState>(path))
    const request = queue.current.then(send, send)
    queue.current = request.catch(() => {})

    request.then(
      (server) => {
        confirmed.current = server
        if (!isLatest()) return // a newer click is still travelling; let it decide
        latestWish.current = null
        onThisVideo((v) => ({ ...v, likedByMe: server.likedByMe, likes: server.likes }))
      },
      (err: unknown) => {
        if (!isLatest()) return
        latestWish.current = null
        const back = confirmed.current
        if (back) onThisVideo((v) => ({ ...v, ...back }))
        toast.error(
          `Couldn’t ${want ? 'like' : 'unlike'} this video. ${err instanceof ApiError ? err.message : 'Please try again.'}`,
        )
      },
    )
  }

  return toggle
}
