import { useEffect } from 'react'

// Prompt 95 — the text on the browser tab, and the first thing a screen reader says about a
// page (WCAG "Page Titled"). "Watch later · Viora": the page first, the site after, so five
// open tabs can still be told apart. Every page calls this once, at the top.

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Viora` : 'Viora'
  }, [title])
}
