import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

// Prompt 95 — after moving to a new page, put keyboard focus on that page's heading.
//
// In a single-page app nothing really "loads": the link you pressed vanishes, focus falls back
// to the top of the document, and a keyboard user must Tab through the whole top bar again —
// while a screen reader says nothing about the new page. Focusing the new <h1> fixes both: the
// heading (the page's name) is read out, and the next Tab continues INSIDE the new page.
//
// Polite about it: if the new page already put focus somewhere itself (Search focuses its box),
// or you're typing in a field, focus is left alone. Only "lost" focus or focus in the top bar moves.
//
// "Did the page change?" compares with the LAST address seen — not a "first run" flag: in
// development React runs effects twice on purpose, and a flag would be used up by the first run,
// making the second look like a navigation (it stole focus from Search's box).

const HEADING_WAIT_MS = 3000 // pages still loading draw their heading a little later

function makeFocusable(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1') // by script only, not a Tab stop
  return el
}

export function usePageFocus() {
  const { pathname } = useLocation()
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return // first load, or React's development re-run
    lastPath.current = pathname

    const active = document.activeElement as HTMLElement | null
    const lost = !active || active === document.body || !active.isConnected
    const inTopBar = !!active?.closest('header') && !active.matches('input, textarea, select')
    if (!lost && !inTopBar) return

    const main = document.getElementById('main')
    const heading = () => document.querySelector<HTMLElement>('main h1')
    let observer: MutationObserver | undefined
    let timer: ReturnType<typeof setTimeout> | undefined

    const frame = requestAnimationFrame(() => {
      const h1 = heading()
      if (h1) return makeFocusable(h1).focus({ preventScroll: true })
      if (!main) return
      // Still loading (a skeleton)? Hold focus on the page area so it isn't lost, and move it
      // to the heading the moment it appears — unless the person has moved on by then.
      makeFocusable(main).focus({ preventScroll: true })
      observer = new MutationObserver(() => {
        const h1 = heading()
        if (!h1) return
        observer?.disconnect()
        if (document.activeElement === main) makeFocusable(h1).focus({ preventScroll: true })
      })
      observer.observe(main, { childList: true, subtree: true })
      timer = setTimeout(() => observer?.disconnect(), HEADING_WAIT_MS)
    })
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      clearTimeout(timer)
    }
  }, [pathname])
}
