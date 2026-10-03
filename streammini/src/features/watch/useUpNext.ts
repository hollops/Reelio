import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/apiClient'
import type { Video } from '../../lib/types'
import { pickUpNext } from './pickUpNext'

// Prompt 51 — fetches the catalogue once per video and ranks it with pickUpNext.
// "Up next" is a bonus: if it fails, the Watch page simply shows no column (no error screen).
//
// Prompt 97 — started from the video's ID in the address, so it loads AT THE SAME TIME as the
// video instead of waiting for it (it used to start only once the video had arrived), and it
// says whether it's still loading, so the column can show a skeleton instead of a blank gap.

const NO_VIDEOS: Video[] = []

export function useUpNext(id: string | undefined, current: Video | null) {
  // null = still loading; [] = loaded (or failed — the column then just doesn't appear)
  const [catalogue, setCatalogue] = useState<Video[] | null>(null)
  const [loadedFor, setLoadedFor] = useState(id)

  // A different video: forget the old list straight away (during render, not in an effect —
  // otherwise one frame would rank the new video against the old list).
  if (loadedFor !== id) {
    setLoadedFor(id)
    setCatalogue(null)
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api
      .get<Video[]>('/videos?sort=popular')
      .then((videos) => {
        if (!cancelled) setCatalogue(videos)
      })
      .catch(() => {
        if (!cancelled) setCatalogue([])
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Prompt 98 — ranked again only when what the ranking USES changes (the list, or the video's
  // id / category / channel). A fresh array on every render — e.g. after pressing Like, which
  // changes `current` — made all 12 Up next items re-render for nothing.
  const currentId = current?.id
  const category = current?.category
  const channelId = current?.uploader.id
  const videos = useMemo(
    () => (current && catalogue ? pickUpNext(current, catalogue) : NO_VIDEOS),
    // `current` itself isn't listed on purpose: the ranking only reads these three fields of it.
    [catalogue, currentId, category, channelId],
  )

  return { loading: catalogue === null, videos }
}
