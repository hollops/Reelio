import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeMutedIcon,
} from '../../components/icons'
import { Spinner } from '../../components/Spinner'
import { formatDuration, formatDurationSpoken } from '../../lib/format'
import { QualityMenu, type QualityOption } from './QualityMenu'

// Prompt 65 — Viora's own video player: the plain <video> element (no browser controls) with
// our control bar on top, so it looks the same in every browser.
//
// The <video> element stays the SINGLE SOURCE OF TRUTH. We never "set playing = true" ourselves:
//   button pressed → tell the video (video.play(), video.currentTime = 42…)
//   video reports  → its events (play, pause, timeupdate, volumechange…) update our state
// So the buttons can never disagree with what the video is actually doing.

export interface VideoPlayerProps {
  src: string
  poster?: string
  /** For screen readers: "Video player: <title>". */
  title: string
  /**
   * Try to start by itself (Prompt 67). Browsers allow sound-on autoplay only after the person
   * has interacted with the site (e.g. clicked the card that led here); if it's blocked, the
   * big ▶ simply stays — no error.
   */
  autoPlay?: boolean
  /**
   * Prompt 68 — begin here (seconds) instead of 0:00, e.g. where you stopped last time.
   * Applied once, before the first play. Give the player a new `key` per video.
   */
  startAt?: number | null
  /**
   * Prompt 69 — called with (seconds, length) every 10 s while playing, and on pause, at the
   * end, when the tab is hidden and when the player goes away — so "how far in" can be saved.
   */
  onProgress?: (seconds: number, duration: number) => void
  /** Prompt 70 — the video that comes next; near the end a countdown card offers it. */
  upNext?: UpNextInfo | null
  /** Prompt 70 — "Play now" on that card (and, in Prompt 71, the end of the countdown). */
  onPlayNext?: () => void
  /**
   * Prompt 72 — the same video in different qualities, best first. Leave out when there's only
   * one version (`src`); the ⚙ menu then says so honestly.
   */
  sources?: QualityOption[]
  /** Prompt 73 — show a ← Back button in the player's top-left corner. */
  onBack?: () => void
  className?: string
}

export interface UpNextInfo {
  title: string
  channel: string
  thumbnailUrl: string
}

/** Prompt 70 — the card shows for the last 20 s, or the last 30% of a short video. */
function upNextWindow(duration: number) {
  return Math.min(20, duration * 0.3)
}

/** How often to report progress while playing (Prompt 69). */
const REPORT_EVERY_MS = 10_000
/** Prompt 76 — with no activity for this long while playing, the controls fade away. */
const HIDE_CONTROLS_AFTER_MS = 3000

export function VideoPlayer({
  src,
  poster,
  title,
  autoPlay = false,
  startAt = null,
  onProgress,
  upNext = null,
  onPlayNext,
  sources,
  onBack,
  className = '',
}: VideoPlayerProps) {
  // --- Prompt 72: quality -----------------------------------------------------------------
  const options: QualityOption[] = sources?.length ? sources : [{ label: 'Auto', src }]
  const [quality, setQuality] = useState(options[0].label)
  const playingSrc = options.find((o) => o.label === quality)?.src ?? options[0].src
  // Switching files makes the browser start the new one from 0:00. So note where we were
  // (and whether it was playing), and put both back once the new file has loaded.
  const resumeAfterSwitch = useRef<{ time: number; play: boolean } | null>(null)
  // --- Prompt 76: controls fade out while playing, come back on any activity ---------------
  // ONE timer: every movement / tap / key calls wake(), which shows the controls and RESTARTS
  // the countdown (the same idea as the debounce in Prompt 57). Hidden only while playing.
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function wake() {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), HIDE_CONTROLS_AFTER_MS)
  }
  useEffect(() => () => clearTimeout(idleTimer.current), [])
  // On touch screens, the first tap on the picture only brings the controls back (YouTube's
  // app does this) — otherwise you couldn't reach them without pausing. Decided at pointerdown,
  // because by the time the click arrives, wake() has already shown them.
  const tapOnlyWakes = useRef(false)

  // --- Prompt 75: buffering (ran out of downloaded video, waiting for more) ----------------
  const [buffering, setBuffering] = useState(false)

  // --- Prompt 74: when the file can't be played ---------------------------------------------
  const [loadError, setLoadError] = useState<string | null>(null)
  /** The browser's MediaError code → words a person understands. */
  function describeError(code: number | undefined) {
    // When the connection is gone BEFORE any data arrives, browsers report it as "can't be
    // played" (code 4) — so check whether the device is offline first, and say the true reason.
    if (code === 2 || !navigator.onLine) {
      return 'The video stopped loading. Check your connection and try again.' // NETWORK
    }
    if (code === 3) return 'This video file seems to be damaged.' // DECODE
    if (code === 4) return 'This video file can’t be played.' // SRC_NOT_SUPPORTED (also a missing file)
    return 'Something went wrong while playing this video.'
  }
  function retry() {
    const v = videoRef.current
    if (!v) return
    setLoadError(null)
    // Reload the file, then carry on from the same second — same trick as a quality switch.
    resumeAfterSwitch.current = {
      time: v.currentTime || lastKnown.current?.seconds || 0,
      play: true,
    }
    v.load()
  }

  function pickQuality(option: QualityOption) {
    const v = videoRef.current
    if (v) resumeAfterSwitch.current = { time: v.currentTime, play: !v.paused }
    setQuality(option.label)
    show(`Quality: ${option.label}`)
  }
  // Prompt 70 — "Cancel" on the Up next card: don't offer (or autoplay) it for this video.
  const [upNextCancelled, setUpNextCancelled] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // --- Prompt 69: progress reports ---------------------------------------------------------
  // The latest callback, in a ref: the timer below mustn't restart each time the page re-renders.
  const progressRef = useRef(onProgress)
  useEffect(() => {
    progressRef.current = onProgress
  })
  // The last known position, kept up to date while the video plays. Needed for the final
  // "goodbye" report: when the player is removed, React empties videoRef BEFORE running effect
  // cleanups, so by then there's no <video> left to ask (a real bug the tests caught).
  const lastKnown = useRef<{ seconds: number; duration: number } | null>(null)
  function reportNow() {
    const v = videoRef.current
    if (v && v.duration) lastKnown.current = { seconds: v.currentTime, duration: v.duration }
    if (lastKnown.current)
      progressRef.current?.(lastKnown.current.seconds, lastKnown.current.duration)
  }
  const reportRef = useRef(reportNow)
  useEffect(() => {
    reportRef.current = reportNow
  })
  // Leaving: the tab is hidden (switched away, closed, phone locked) → save now, or up to
  // 10 seconds of watching would be forgotten. Also when this player goes away (another video).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') reportRef.current()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      reportRef.current()
    }
  }, [])

  // --- Prompt 68: start position + autoplay, in the right ORDER (jump first, then play) ---
  // Both can only happen once the video knows its length (metadata loaded), AND the page may
  // turn autoPlay on a moment later (after it has asked the server where you stopped). So we
  // try at both moments, and remember what's already been done so nothing happens twice.
  const didStart = useRef(false) // the start position has been applied
  const didAutoPlay = useRef(false)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)
  function tryStart() {
    const v = videoRef.current
    if (!v || v.readyState < 1) return // length not known yet: wait for loadedmetadata
    if (!didStart.current && startAt && startAt < v.duration) {
      didStart.current = true
      seek(startAt) // the same "jump" helper the controls use
      setResumedFrom(startAt)
    }
    if (autoPlay && !didAutoPlay.current) {
      didAutoPlay.current = true
      // Ask to start; if the browser says no (no interaction yet), the big ▶ stays.
      v.play().catch(() => {})
    }
  }
  useEffect(() => {
    tryStart()
  })
  // The "Resumed from…" note fades after 6 seconds.
  useEffect(() => {
    if (resumedFrom === null) return
    const timer = setTimeout(() => setResumedFrom(null), 6000)
    return () => clearTimeout(timer)
  }, [resumedFrom])

  // Mirrors of the video's own state (only ever set from its events).
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [started, setStarted] = useState(false) // show the big ▶ until the first play
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  // While you drag the seek bar ("scrubbing"), the bar shows YOUR position — not the video's
  // old one. Without this, every re-render snapped the thumb back to the old time mid-drag and
  // the final "change" event seeked back there (a real bug the tests caught). Cleared once the
  // video confirms it has arrived (its `seeked` event).
  const [scrub, setScrub] = useState<number | null>(null)

  // Every 10 seconds, but only WHILE playing (a paused video isn't moving, nothing new to save).
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => reportRef.current(), REPORT_EVERY_MS)
    return () => clearInterval(timer)
  }, [playing])

  // Fullscreen can also be left with Esc or the browser's own UI, so listen for the change
  // instead of assuming our button was the only way out.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // --- Commands: tell the video; its events will update the screen. ---
  const video = () => videoRef.current
  function togglePlay() {
    const v = video()
    if (!v) return
    // play() returns a promise that rejects if the browser blocks it — nothing to crash over.
    if (v.paused || v.ended) v.play().catch(() => {})
    else v.pause()
  }
  function seek(seconds: number) {
    const v = video()
    if (v) v.currentTime = Math.min(Math.max(seconds, 0), v.duration || 0)
  }
  function toggleMute() {
    const v = video()
    if (v) v.muted = !v.muted
  }
  function changeVolume(value: number) {
    const v = video()
    if (!v) return
    v.volume = value
    v.muted = value === 0 // dragging to zero = muted; dragging up again = sound back
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen()
  }

  // --- Prompt 66: keyboard shortcuts (YouTube's keys) -----------------------------------
  // A short on-screen (and screen-reader) confirmation of what a key just did.
  const [flash, setFlash] = useState<{ text: string; id: number } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  function show(text: string) {
    clearTimeout(flashTimer.current)
    setFlash({ text, id: Date.now() })
    flashTimer.current = setTimeout(() => setFlash(null), 700)
  }
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  function nudge(seconds: number) {
    const v = video()
    if (!v || !v.duration) return
    seek(v.currentTime + seconds)
    show(seconds > 0 ? `⏩ +${seconds}s` : `⏪ ${seconds}s`)
  }

  function onShortcut(e: KeyboardEvent) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return // Ctrl+F = find, etc.
    const target = e.target as HTMLElement | null
    const inPlayer = !!target && !!containerRef.current?.contains(target)
    const onPage = !target || target === document.body
    // Only when focus is ON the player, or nowhere in particular (like YouTube). Focus on a link
    // elsewhere keeps its normal keys (arrows scroll the page, and so on).
    if (!inPlayer && !onPage) return
    // Never steal typing: an "f" in a comment box is a letter, not full screen.
    const tag = target?.tagName
    const isSlider = tag === 'INPUT' && (target as HTMLInputElement).type === 'range'
    if (
      (tag === 'INPUT' && !isSlider) ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      target?.isContentEditable
    ) {
      return
    }
    const key = e.key.toLowerCase()
    // A focused button already presses on Space/Enter — toggling play too would happen twice.
    if (tag === 'BUTTON' && (key === ' ' || key === 'enter')) return
    // A focused slider already moves with the arrow keys.
    if (
      isSlider &&
      [
        'arrowleft',
        'arrowright',
        'arrowup',
        'arrowdown',
        'home',
        'end',
        'pageup',
        'pagedown',
      ].includes(key)
    )
      return

    const v = video()
    if (!v) return
    let handled = true
    if (key === ' ' || key === 'k') {
      togglePlay()
    } else if (key === 'arrowleft') nudge(-5)
    else if (key === 'arrowright') nudge(5)
    else if (key === 'j') nudge(-10)
    else if (key === 'l') nudge(10)
    else if (key === 'm') {
      show(v.muted ? '🔊 Sound on' : '🔇 Muted')
      toggleMute()
    } else if (key === 'f') toggleFullscreen()
    else if ((key === 'arrowup' || key === 'arrowdown') && inPlayer) {
      // Only inside the player: on the page, ↑/↓ should still scroll.
      const next =
        Math.round(Math.min(1, Math.max(0, v.volume + (key === 'arrowup' ? 0.05 : -0.05))) * 100) /
        100
      changeVolume(next)
      show(`Volume ${Math.round(next * 100)}%`)
    } else if (/^[0-9]$/.test(key) && v.duration) {
      seek((v.duration * Number(key)) / 10) // 3 → 30% of the way in
      show(`${Number(key) * 10}%`)
    } else handled = false
    if (handled) {
      e.preventDefault() // e.g. stop Space from scrolling the page
      wake() // Prompt 76: a shortcut is activity too — show the controls
    }
  }

  // The listener lives on the document; it always calls the LATEST onShortcut via this ref.
  const shortcutRef = useRef(onShortcut)
  useEffect(() => {
    shortcutRef.current = onShortcut
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => shortcutRef.current(e)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  // Prompt 70 — is it time for the Up next card? (Near the end, not cancelled, something next.)
  const remaining = Math.max(0, duration - current)
  const showUpNext =
    !!upNext && !upNextCancelled && started && duration > 0 && remaining <= upNextWindow(duration)
  const countdown = Math.ceil(remaining)

  // Prompt 76 — hidden only while actually playing (paused, ended or broken → always shown).
  const controlsHidden = idle && playing && !loadError

  const shownTime = scrub ?? current
  const spokenPosition = `${formatDurationSpoken(shownTime)} of ${formatDurationSpoken(duration)}`

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Video player: ${title}`}
      // Prompt 66: focusable (one Tab stop), so keyboard users can reach it and use shortcuts.
      tabIndex={0}
      // Prompt 75: "busy" while buffering — the screen-reader side of the spinner.
      aria-busy={buffering && !loadError ? true : undefined}
      aria-keyshortcuts="Space K J L ArrowLeft ArrowRight ArrowUp ArrowDown M F"
      // Prompt 76 — any activity over the player brings the controls back.
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
      // In fullscreen, fill the screen instead of keeping the 16:9 box.
      // cursor-none: the mouse pointer hides along with the controls.
      className={`group/player relative aspect-video w-full bg-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text [&:fullscreen]:aspect-auto ${controlsHidden ? 'cursor-none' : ''} ${className}`}
    >
      <video
        // No `key` here any more: a quality switch (72) must keep the SAME element (and its
        // volume etc.). A different VIDEO gets a whole new player instead — see WatchPage's key.
        ref={videoRef}
        src={playingSrc}
        poster={poster}
        playsInline // iPhones: play inside the page instead of forcing full screen
        preload="metadata" // fetch only the length + first frame until Play is pressed
        onClick={() => {
          // Prompt 76 — a touch tap on hidden controls just shows them (no pause).
          if (tapOnlyWakes.current) return
          togglePlay()
        }}
        // Prompt 74 — the file failed (offline, missing, unsupported…): say so, offer a retry.
        onError={(e) => {
          setPlaying(false)
          setBuffering(false)
          setLoadError(describeError(e.currentTarget.error?.code))
        }}
        // Prompt 75 — "I've run out of video, fetching more…" / "I have enough, carrying on".
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        // Clicking the picture also moves keyboard focus to the player, so shortcuts apply to
        // the player you just touched. preventScroll: don't jump the page.
        onPointerDown={(e) => {
          // Decided NOW, before wake() (on the player box) shows the controls again.
          tapOnlyWakes.current = e.pointerType === 'touch' && controlsHidden
          containerRef.current?.focus({ preventScroll: true })
        }}
        onPlay={() => {
          setPlaying(true)
          setEnded(false)
          setStarted(true)
          wake() // start the 3-second countdown to hiding the controls
        }}
        onPause={() => {
          setPlaying(false)
          reportNow() // a pause is a natural "I stopped here"
        }}
        onEnded={() => {
          setPlaying(false)
          setEnded(true)
          reportNow() // finished: saved at the very end, so it leaves Continue watching
          // Prompt 71 — the countdown reached zero: go on to the next video by itself, unless
          // the person pressed Cancel. (The same action as the card's "Play now" button.)
          if (upNext && !upNextCancelled) onPlayNext?.()
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget
          setCurrent(v.currentTime)
          if (v.duration) lastKnown.current = { seconds: v.currentTime, duration: v.duration }
        }}
        // `seeking` fires the INSTANT a jump starts; `seeked` only once the frames there have
        // downloaded. Following `seeking` too makes the bar and the time move to where you
        // asked straight away, instead of lagging behind a slow network (a bug the tests found).
        onSeeking={(e) => setCurrent(e.currentTarget.currentTime)}
        onSeeked={(e) => {
          setCurrent(e.currentTarget.currentTime)
          setScrub(null) // arrived: the bar can follow the video again
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          setDuration(v.duration)
          // After a quality switch (72): back to the same second, playing if it was.
          const back = resumeAfterSwitch.current
          if (back) {
            resumeAfterSwitch.current = null
            v.currentTime = back.time
            if (back.play) v.play().catch(() => {})
            return
          }
          tryStart() // the length is known now: apply the start position / autoplay
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume)
          setMuted(e.currentTarget.muted)
        }}
        className="size-full cursor-pointer object-contain"
      />

      {/* Before the first play: one big, obvious button. */}
      {!started && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 m-auto flex size-18 items-center justify-center rounded-full bg-black/70 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-safe:transition-colors"
        >
          <PlayIcon className="ml-1 size-9" />
        </button>
      )}

      {/* Prompt 66: what a shortcut just did ("⏩ +5s", "🔇 Muted"). role="status" = screen
          readers hear it too. key={id}: a new flash restarts the fade-in. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {flash && (
          <span
            key={flash.id}
            className="rounded-full bg-black/75 px-4 py-2 text-small font-semibold motion-safe:animate-toast-in"
          >
            {flash.text}
          </span>
        )}
      </div>

      {/* Prompt 75 — the buffering spinner. It fades in after 0.3 s (delay-300), so split-second
          hiccups don't make it flicker on and off. Screen readers get aria-busy on the player
          instead of a repeated "loading" announcement. */}
      <div
        aria-hidden="true"
        data-buffering={buffering && !loadError ? '' : undefined}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ${
          buffering && !loadError ? 'opacity-100 delay-300' : 'opacity-0'
        }`}
      >
        <span className="rounded-full bg-black/50 p-3">
          <Spinner size="lg" label={null} />
        </span>
      </div>

      {/* Prompt 74 — the error screen covers the picture (there's nothing to show anyway).
          role="alert": screen readers hear it straight away. */}
      {loadError && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center"
        >
          <AlertIcon className="size-10 text-danger" />
          <p className="max-w-sm text-small sm:text-body">{loadError}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-white px-5 py-2 text-small font-semibold text-black hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Try again
          </button>
        </div>
      )}

      {/* Prompt 73: ← Back, top-left (handy on phones and in full screen). */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          title="Go back"
          data-hidden={controlsHidden || undefined}
          className="absolute top-3 left-3 z-10 flex size-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white data-hidden:pointer-events-none data-hidden:opacity-0 data-hidden:focus-visible:pointer-events-auto motion-safe:transition-opacity motion-safe:duration-300 pointer-coarse:size-12"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Prompt 68: "Resumed from 1:23 · Start over" — for 6 seconds, top-RIGHT (Back is left). */}
      {resumedFrom !== null && (
        <div className="absolute top-3 right-3 flex items-center gap-3 rounded-lg bg-black/75 py-1.5 pr-1.5 pl-3 text-small motion-safe:animate-toast-in">
          <span>Resumed from {formatDuration(resumedFrom)}</span>
          <button
            type="button"
            onClick={() => {
              seek(0)
              setResumedFrom(null)
            }}
            className="rounded-md bg-white/15 px-2 py-1 font-semibold hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
          >
            Start over
          </button>
        </div>
      )}

      {/* Prompt 70 — the Up next card, near the end. Its sentence for screen readers is written
          once when it appears (in the status region below), not every second of the countdown. */}
      {showUpNext && upNext && (
        <section
          aria-label="Up next"
          className="absolute right-3 bottom-20 z-10 flex w-[min(22rem,calc(100%-1.5rem))] gap-3 rounded-xl bg-black/85 p-3 shadow-2xl motion-safe:animate-toast-in"
        >
          <img
            src={upNext.thumbnailUrl}
            alt=""
            className="hidden aspect-video w-28 shrink-0 self-start rounded-md bg-surface object-cover sm:block"
          />
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold text-white/70">
              {ended ? 'Up next' : `Up next in ${countdown}`}
            </p>
            <p className="line-clamp-2 text-small font-semibold">{upNext.title}</p>
            <p className="truncate text-caption text-white/70">{upNext.channel}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setUpNextCancelled(true)}
                className="rounded-md bg-white/15 px-3 py-1.5 text-small font-semibold hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onPlayNext}
                className="rounded-md bg-white px-3 py-1.5 text-small font-semibold text-black hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Play now
              </button>
            </div>
          </div>
        </section>
      )}
      {/* aria-live (not a second role="status" — the shortcut flash already has that job). */}
      <p aria-live="polite" className="sr-only">
        {showUpNext && upNext ? `Up next: ${upNext.title}, by ${upNext.channel}.` : ''}
      </p>

      {/* The control bar, over a dark fade so white icons read on any frame. */}
      {/* Prompt 76 — data-hidden fades the bar out; focus-within keeps it visible while a
          keyboard user is on one of its controls, so it never disappears under them. */}
      <div
        data-hidden={controlsHidden || undefined}
        className="absolute inset-x-0 bottom-0 space-y-1 bg-linear-to-t from-black/85 to-transparent px-3 pt-10 pb-2 data-hidden:opacity-0 data-hidden:not-focus-within:pointer-events-none data-hidden:focus-within:opacity-100 motion-safe:transition-opacity motion-safe:duration-300 sm:px-4"
      >
        <input
          type="range"
          aria-label="Seek"
          aria-valuetext={spokenPosition}
          min={0}
          max={duration || 0}
          step={0.1}
          value={scrub ?? Math.min(current, duration || 0)}
          onChange={(e) => {
            const to = Number(e.target.value)
            setScrub(to)
            seek(to)
          }}
          disabled={!duration}
          // accent-*: the browser colours the part already played in the brand colour.
          // pointer-coarse: a thicker bar on touch screens, easier to grab with a finger (76).
          className="h-6 w-full cursor-pointer accent-accent disabled:cursor-default"
        />

        <div className="flex items-center gap-1 sm:gap-2">
          <ControlButton label={playing ? 'Pause' : 'Play'} shortcut="K" onClick={togglePlay}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </ControlButton>

          <ControlButton label={muted ? 'Unmute' : 'Mute'} shortcut="M" onClick={toggleMute}>
            {muted || volume === 0 ? <VolumeMutedIcon /> : <VolumeIcon />}
          </ControlButton>
          <input
            type="range"
            aria-label="Volume"
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="hidden h-6 w-20 cursor-pointer accent-white sm:block"
          />

          {/* Screen readers already get the position from the seek bar; this is for eyes. */}
          <p aria-hidden="true" className="ml-1 text-caption tabular-nums sm:text-small">
            {formatDuration(shownTime)} / {formatDuration(duration)}
          </p>

          <div className="ml-auto flex items-center gap-1">
            {/* Prompt 72: ⚙ quality menu. */}
            <QualityMenu options={options} current={quality} onPick={pickQuality} />
            <ControlButton
              label={fullscreen ? 'Exit full screen' : 'Full screen'}
              shortcut="F"
              onClick={toggleFullscreen}
            >
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string
  /** The key that does the same thing — shown in the tooltip, and announced to screen readers. */
  shortcut?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut.toLowerCase()})` : label}
      // pointer-coarse:size-12 — 48 px buttons on touch screens (Prompt 76; WCAG suggests 44+).
      className="flex size-10 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white pointer-coarse:size-12 [&_svg]:size-6"
    >
      {children}
    </button>
  )
}
