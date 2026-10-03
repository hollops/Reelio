import { useEffect, useRef, useState } from 'react'

// Prompt 90 — a FAKE upload progress bar (the mock has no real network transfer to measure).
// It closes 8% of the gap to 90% every tick: fast at first, then slower, and it never claims
// more than 90% by itself. Only finish() — the server answered — takes it to 100%.
// With the real backend, axios/XHR "upload progress" events would replace this guess.

const CEILING = 90
const TICK_MS = 120

export function useFakeProgress() {
  const [progress, setProgress] = useState<number | null>(null) // null = no upload going on
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)

  const stop = () => clearInterval(timer.current)
  useEffect(() => stop, []) // leaving the page mid-upload: stop ticking

  return {
    progress,
    start() {
      stop()
      setProgress(0)
      timer.current = setInterval(
        () => setProgress((p) => (p === null ? null : p + (CEILING - p) * 0.08)),
        TICK_MS,
      )
    },
    finish() {
      stop()
      setProgress(100)
    },
    reset() {
      stop()
      setProgress(null)
    },
  }
}
