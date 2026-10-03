import { useCallback, useLayoutEffect, useRef } from 'react'

// Prompt 98 — ONE function that never changes, which always runs the LATEST version of `fn`.
//
// Why: a component wrapped in memo() skips re-rendering only if its props are the "same" as
// last time — and a function written inside a component is a brand-new object on every render.
// Passing one down (onAdd, onToggle…) quietly defeats memo: every card re-renders anyway.
// This wrapper keeps the same identity forever, yet calls what you wrote in the latest render
// (so it never sees stale values). Only for event handlers — not for code that runs DURING render.

export function useStableCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  const latest = useRef(fn)
  // Updated right after each render is committed — before any click can call it.
  useLayoutEffect(() => {
    latest.current = fn
  })
  return useCallback((...args: Args) => latest.current(...args), [])
}
