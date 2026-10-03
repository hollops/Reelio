import { createContext, useContext } from 'react'
import type { Video } from '../../lib/types'

// The app-wide memory of "which videos has this person saved for later?".
// Every Watch later button (cards, banner, Watch page, Watch later page) asks THIS, so a change
// made in one place is instantly correct everywhere. (Kept apart from the Provider file so that
// file only exports components — fast refresh needs that.)

export interface WatchLaterContextValue {
  /** 'loading' until the signed-in user's list has arrived; 'ready' after (or when signed out). */
  status: 'loading' | 'ready'
  /** Is this video in the list — including a change that's still on its way to the server? */
  isSaved: (videoId: string) => boolean
  /** Add if missing, remove if present. Optimistic: the screen changes before the server answers. */
  toggle: (video: Pick<Video, 'id' | 'title'>) => void
  /** Explicitly save / remove (Prompt 78) — for actions created earlier and run later, like Undo. */
  /** `quiet: true` skips the "Saved / Removed" toast (Prompt 84) when the caller shows its own. */
  save: (video: Pick<Video, 'id' | 'title'>, options?: { quiet?: boolean }) => void
  remove: (video: Pick<Video, 'id' | 'title'>, options?: { quiet?: boolean }) => void
  /** Prompt 83 — goes up each time ANOTHER TAB changed the list; pages with their own copy reload. */
  version: number
}

export const WatchLaterContext = createContext<WatchLaterContextValue | null>(null)

export function useWatchLater(): WatchLaterContextValue {
  const value = useContext(WatchLaterContext)
  if (!value) throw new Error('useWatchLater() must be used inside <WatchLaterProvider>.')
  return value
}
