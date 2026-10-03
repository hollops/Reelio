import { useLocation, useNavigate, useParams } from 'react-router'
import { EmptyState } from '../components/EmptyState'
import { AlertIcon, VideoIcon } from '../components/icons'
import { WatchSkeleton } from '../features/watch/WatchSkeleton'
import { useAuth } from '../features/auth/authContext'
import { CommentsSection, type ShownComment } from '../features/watch/CommentsSection'
import { api, ApiError } from '../lib/apiClient'
import type { Comment, VideoDetail } from '../lib/types'
import { LikeButton } from '../features/watch/LikeButton'
import { UpNextList } from '../features/watch/UpNextList'
import { useLike } from '../features/watch/useLike'
import { useUpNext } from '../features/watch/useUpNext'
import { UpNextSkeleton } from '../features/watch/WatchSkeleton'
import { useVideo } from '../features/watch/useVideo'
import { useProgressReporter } from '../features/player/useProgressReporter'
import { useResumePosition } from '../features/player/useResumePosition'
import { VideoPlayer } from '../features/player/VideoPlayer'
import { WatchView } from '../features/watch/WatchView'
import { WatchLaterButton } from '../features/watchLater/WatchLaterButton'
import { usePageTitle } from '../components/usePageTitle'
import { useStableCallback } from '../lib/useStableCallback'

// The YouTube-style Watch page (/watch/:id).
// Prompt 48: read the id from the address → fetch that video → hand it to the Prompt 47 layout.

export default function WatchPage() {
  // useParams reads the ":id" part of the route "/watch/:id" — e.g. "v_afrobeats-live".
  const { id } = useParams()
  const { user } = useAuth()
  const video = useVideo(id)
  usePageTitle(
    video.status === 'ready'
      ? video.video.title // the video's own name on the tab, like YouTube
      : video.status === 'not-found'
        ? 'Video not available'
        : undefined,
  )
  // Called here, BEFORE the early returns below: React's "Rules of Hooks" say hooks must run
  // in the same order on every render, so they can never sit after an `if (…) return`.
  // Prompt 97: starts from the address's id, in parallel with the video itself.
  const upNext = useUpNext(id, video.status === 'ready' ? video.video : null)
  const nextVideo = upNext.videos[0] ?? null // the one marked "Next" in the list (Prompt 49)
  const navigate = useNavigate()
  const location = useLocation()
  const toggleLike = useLike(video.status === 'ready' ? video.video : null, video.update)
  // Prompt 68 — where did this person stop last time? (Visitors: ready at once, from 0:00.)
  const resume = useResumePosition(id)
  // Prompt 69 — and save how far in you get, so Resume and Continue watching stay up to date.
  const reportProgress = useProgressReporter(id)

  // Prompt 53 — post a comment, optimistically.
  // Prompt 98 — one unchanging function for CommentsSection (memo'd), so pressing Like doesn't
  // redraw every comment. It still runs the latest addComment below.
  const onAddComment = useStableCallback(addComment)
  async function addComment(text: string) {
    if (video.status !== 'ready' || !user) return
    const videoId = video.video.id
    const tempId = `temp-${crypto.randomUUID()}`
    const pendingComment: ShownComment = {
      id: tempId,
      videoId,
      userId: user.id,
      authorName: user.name,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    // Every change checks it's still the SAME video: if you've clicked to another one before the
    // server answers, that late answer must not land in the new video's comments.
    const onThisVideo = (change: (v: VideoDetail) => VideoDetail) => (v: VideoDetail) =>
      v.id === videoId ? change(v) : v

    // 1. Show it at the top straight away, marked "Posting…".
    video.update(onThisVideo((v) => ({ ...v, comments: [pendingComment, ...v.comments] })))
    try {
      // 2. Send it. 3a. Swap the temporary copy for the server's real one (real id and time).
      const saved = await api.post<Comment>(`/videos/${encodeURIComponent(videoId)}/comments`, {
        text,
      })
      video.update(
        onThisVideo((v) => ({
          ...v,
          comments: v.comments.map((c) => (c.id === tempId ? saved : c)),
        })),
      )
    } catch (err) {
      // 3b. Refused: take it back off the list; the form puts the text back in the box.
      video.update(
        onThisVideo((v) => ({ ...v, comments: v.comments.filter((c) => c.id !== tempId) })),
      )
      throw new Error(
        err instanceof ApiError
          ? (err.fieldErrors.text ?? err.message)
          : 'Could not post your comment.',
      )
    }
  }

  // Prompt 55 — a skeleton in the page's own shape while loading…
  if (video.status === 'loading') return <WatchSkeleton />
  if (video.status === 'not-found') {
    // …and a friendly, useful message for a wrong or deleted video: what happened, why it might
    // have happened, and two ways forward.
    return (
      <EmptyState
        icon={<VideoIcon className="size-7" />}
        headingLevel={1} // the whole page — so it's the page's main heading (Prompt 94)
        title="This video isn’t available"
        description="It may have been removed by the person who uploaded it, or the link may be wrong."
        action={{ label: 'Go to Home', to: '/' }}
        secondaryAction={{ label: 'Search videos', to: '/search' }}
      />
    )
  }
  if (video.status === 'error') {
    return (
      <EmptyState
        icon={<AlertIcon className="size-7 text-danger" />}
        headingLevel={1}
        title="We couldn’t load this video"
        description={video.message}
        action={{ label: 'Try again', onClick: video.retry }}
      />
    )
  }

  return (
    <WatchView
      video={video.video}
      // Prompt 67 — our own player (65–66) on the real Watch page, starting by itself when the
      // browser allows it.
      player={
        <VideoPlayer
          // A brand-new player per video, so "start position already applied" never carries
          // over from the previous one.
          key={video.video.id}
          src={video.video.videoUrl}
          poster={video.video.thumbnailUrl}
          title={video.video.title}
          // Prompt 68: jump to where you stopped FIRST, then play — so autoplay waits for
          // the answer instead of starting at 0:00 and then jumping.
          startAt={resume.startAt}
          autoPlay={resume.ready}
          onProgress={reportProgress}
          // Prompt 70 — the first Up next video, offered on a countdown card near the end.
          upNext={
            nextVideo && {
              title: nextVideo.title,
              channel: nextVideo.uploader.name,
              thumbnailUrl: nextVideo.thumbnailUrl,
            }
          }
          onPlayNext={() => nextVideo && navigate(`/watch/${nextVideo.id}`)}
          // Prompt 73 — Back = the page you came from inside Viora. Arrived directly (a shared
          // link)? The first page of a visit always has key "default", and going "back" would
          // leave the site — so go Home instead.
          onBack={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
        />
      }
      // Prompt 50: the shared Watch later button, beside the channel.
      actions={
        <>
          {/* Prompt 54: likes. Prompt 50: Watch later. */}
          <LikeButton
            liked={video.video.likedByMe}
            likes={video.video.likes}
            onToggle={toggleLike}
          />
          <WatchLaterButton video={video.video} />
        </>
      }
      // Prompt 51: related videos (same category, then same channel) in the Prompt 49 list.
      sidebar={
        // Prompt 97: still loading → its skeleton (never a blank column); loaded → the list.
        upNext.loading ? (
          <UpNextSkeleton />
        ) : (
          upNext.videos.length > 0 && <UpNextList videos={upNext.videos} />
        )
      }
      // Prompt 52: the comments; Prompt 53: posting them.
      below={<CommentsSection comments={video.video.comments} user={user} onAdd={onAddComment} />}
    />
  )
}
