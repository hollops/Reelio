import { useEffect, useState } from 'react'

// Prompt 57 — "debouncing": hand back `value` only once it has STOPPED changing for `delay` ms.
// Typing "lagos" fast gives one update ("lagos") instead of five ("l", "la", "lag"…), so
// searches and suggestions don't fire a request on every key press.
//
// How: each change starts a timer; a newer change cancels the old timer (the effect's cleanup)
// before it can fire. Only the last timer survives long enough to update.

/** The standard pause for search-as-you-type (Prompts 59 and 62 use the same one). */
export const SEARCH_DEBOUNCE_MS = 300

export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer) // a newer value arrived first: this one never reports
  }, [value, delay])

  return settled
}
