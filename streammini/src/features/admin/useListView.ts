import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_SORT, FIRST_DIR, readListParams, type SortKey } from './adminListView'

// Prompt 92 — the Admin table's filter + sort, remembered in the URL (?q=ada&sort=views&dir=desc).
//
// Why a local copy? In React Router every URL change is a small navigation that lands a moment
// later (~170 ms here). If the filter box read straight from the URL, letters typed in that gap
// would be overwritten by the older value — typing "lagos" left "ls" (the same trap as Search's
// "afrobeats" → "xeats"). So: the page's own copy changes INSTANTLY, and the URL follows.
// When a URL change arrives we ask "is this one of mine, arriving late?" — if so, ignore it;
// if not (a link to /admin?q=music, Back/Forward), take its values.

export function useListView() {
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState(() => readListParams(params))
  const written = useRef<string[]>([]) // URLs we asked for that haven't landed yet, oldest first

  useEffect(() => {
    const arrived = params.toString()
    const mine = written.current.indexOf(arrived)
    if (mine !== -1) {
      written.current.splice(0, mine + 1) // ours (and any older ones skipped along the way)
      return
    }
    setView(readListParams(params)) // someone else changed the URL: follow it
  }, [params])

  const change = useCallback(
    (next: typeof view) => {
      setView(next)
      const url = new URLSearchParams(params)
      const set = (name: string, value: string | null) =>
        value ? url.set(name, value) : url.delete(name)
      set('q', next.q || null)
      // The default (newest first) needs no words in the URL.
      const isDefault = next.key === DEFAULT_SORT.key && next.dir === DEFAULT_SORT.dir
      set('sort', isDefault ? null : next.key)
      set('dir', isDefault ? null : next.dir)
      written.current.push(url.toString())
      setParams(url, { replace: true }) // typing "ada" shouldn't add three steps to Back
    },
    [params, setParams],
  )

  // Prompt 98 — stable between unrelated renders (e.g. a pop-up opening), so the memo'd table
  // isn't handed a "new" onSort each time.
  const setQuery = useCallback((q: string) => change({ ...view, q }), [change, view])
  /** Same column → flip the direction; a new column → its natural first direction. */
  const sortBy = useCallback(
    (key: SortKey) =>
      change({
        ...view,
        key,
        dir: key === view.key ? (view.dir === 'asc' ? 'desc' : 'asc') : FIRST_DIR[key],
      }),
    [change, view],
  )

  return { ...view, setQuery, sortBy }
}
