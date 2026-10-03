import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../features/auth/authContext'

// The Viora logo: a big "V" in the brand colour, then "iora".
// The V spins (3 turns, 4 seconds) when the app opens, and again every time someone signs in.
//
// How "spin again" works: an animation plays once when an element first appears. Giving the V a
// new `key` makes React throw the old element away and create a fresh one — so the animation
// starts over. Same key trick as the Forgot-password pop-up, used here to restart a CSS animation.

export function Logo() {
  const { status } = useAuth()
  const [spinKey, setSpinKey] = useState(0)
  const [prevStatus, setPrevStatus] = useState(status)

  // "Signed out → signed in" = a real sign-in (or registration) just happened → spin again.
  // Comparing with the previous value DURING render (not in an effect) is React's recommended way
  // to react to a change: no extra render with the old value, no effect needed.
  if (status !== prevStatus) {
    setPrevStatus(status)
    if (prevStatus === 'anonymous' && status === 'authenticated') setSpinKey((k) => k + 1)
  }

  return (
    <Link
      to="/"
      aria-label="Viora home"
      className="flex shrink-0 items-center rounded-md text-title font-bold tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-text"
    >
      <span
        key={spinKey}
        aria-hidden="true"
        // origin-center + inline-block: spin around the letter's own middle, like a wheel.
        // motion-safe: no spinning for people who've asked their device to reduce motion.
        className="inline-block origin-center text-[2rem] leading-none font-extrabold text-accent-text motion-safe:animate-logo-spin"
      >
        V
      </span>
      <span aria-hidden="true">iora</span>
    </Link>
  )
}
