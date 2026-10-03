import { useCallback, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Input } from '../components/Input'
import { describeSort, filterVideos, sortVideos } from '../features/admin/adminListView'
import { useListView } from '../features/admin/useListView'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { RowActions } from '../features/admin/RowActions'
import { DeleteVideoModal } from '../features/videos/DeleteVideoModal'
import { EditVideoModal } from '../features/videos/EditVideoModal'
import type { Video } from '../lib/types'
import { AlertIcon, SearchIcon, VideoIcon } from '../components/icons'
import { Container, PageHeader } from '../components/layout'
import { Skeleton } from '../components/Skeleton'
import { useAdminData } from '../features/admin/useAdminData'
import { VideoTable } from '../features/admin/VideoTable'
import { formatCount } from '../lib/format'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 85 — the Admin dashboard (YouTube-style: anyone uploads, the admin MODERATES).
// Quick numbers at the top, then a table of every video. Edit / Delete arrive in 88–89,
// filtering and sorting in 92.
// Only admins get here at all — the AdminRoute bouncer from Prompt 22 guards the door.

const NO_VIDEOS: Video[] = [] // one fixed empty list, so useMemo sees "no change" while loading

export default function AdminPage() {
  usePageTitle('Admin')
  const data = useAdminData()
  // Prompt 88 — the video being edited (null = pop-up closed).
  const [editing, setEditing] = useState<Video | null>(null)
  const [deleting, setDeleting] = useState<Video | null>(null) // Prompt 89

  // Prompt 92 — filter + sort, kept in the URL so a refresh or a shared link keeps the view.
  const { q, key, dir, setQuery, sortBy } = useListView()
  const all = data.status === 'ready' ? data.videos : NO_VIDEOS
  // Worked out again only when the list or a choice changes — not on every render (Prompt 98).
  const shown = useMemo(() => sortVideos(filterVideos(all, q), key, dir), [all, q, key, dir])
  // Prompt 98 — the same objects/functions on every render, so the memo'd table can skip redrawing
  // when only the pop-ups change. (setEditing / setDeleting never change identity.)
  const sort = useMemo(() => ({ key, dir }), [key, dir])
  const rowActions = useCallback(
    (video: Video) => <RowActions video={video} onEdit={setEditing} onDelete={setDeleting} />,
    [],
  )
  const total = all.length
  const countText = q.trim()
    ? `Showing ${shown.length} of ${total} ${total === 1 ? 'video' : 'videos'}`
    : `${total} ${total === 1 ? 'video' : 'videos'}`
  // Screen readers hear the count once typing pauses, not after every key.
  const spokenCount = useDebouncedValue(countText, 600)

  return (
    <Container className="space-y-6 pb-16">
      <PageHeader title="Admin" description="Every video on Viora." />

      {data.status === 'loading' && (
        <div aria-busy="true" className="space-y-6">
          <p role="status" className="sr-only">
            Loading the dashboard…
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}

      {data.status === 'error' && (
        <EmptyState
          icon={<AlertIcon className="size-7 text-danger" />}
          title="We couldn’t load the dashboard"
          description={data.message}
          action={{ label: 'Try again', onClick: data.retry }}
        />
      )}

      {data.status === 'ready' && (
        <>
          {/* A <dl>: label → value pairs, read as such by screen readers. */}
          <dl className="grid gap-4 sm:grid-cols-3">
            <Stat label="Videos" value={formatCount(data.videos.length)} />
            <Stat label="Users" value={formatCount(data.users.length)} />
            <Stat
              label="Total views"
              value={formatCount(data.videos.reduce((sum, v) => sum + v.views, 0))}
            />
          </dl>

          {total === 0 ? (
            <EmptyState icon={<VideoIcon className="size-7" />} title="No videos yet" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                  <Input
                    label="Filter videos"
                    type="search"
                    value={q}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Title, channel or category"
                    autoComplete="off"
                    className="[&_input]:pl-10"
                  />
                  <SearchIcon className="pointer-events-none absolute bottom-3 left-3 size-5 text-fg-subtle" />
                </div>
                <p aria-hidden="true" className="text-small text-fg-muted tabular-nums">
                  {countText}
                </p>
                <p role="status" className="sr-only">
                  {spokenCount}
                </p>
              </div>

              {shown.length === 0 ? (
                <EmptyState
                  icon={<SearchIcon className="size-7" />}
                  title={`No videos match “${q.trim()}”`}
                  description="Try part of a title, a channel name or a category."
                  action={{ label: 'Clear filter', onClick: () => setQuery('') }}
                />
              ) : (
                <VideoTable
                  videos={shown}
                  caption={`${q.trim() ? `Videos matching “${q.trim()}”` : 'All videos'}, ${describeSort(key, dir)}`}
                  sort={sort}
                  onSort={sortBy}
                  actions={rowActions}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Prompt 89 — asks first; the row goes only once the server confirms. */}
      <DeleteVideoModal
        video={deleting}
        asAdmin
        onClose={() => setDeleting(null)}
        onDeleted={(gone) => data.updateVideos((list) => list.filter((v) => v.id !== gone.id))}
      />

      {/* Prompt 88 — after saving, swap in the server's version of just that row. */}
      <EditVideoModal
        video={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) =>
          data.updateVideos((list) => list.map((v) => (v.id === updated.id ? updated : v)))
        }
      />
    </Container>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <dt className="text-small text-fg-muted">{label}</dt>
      <dd className="mt-1 text-heading font-bold tabular-nums">{value}</dd>
    </div>
  )
}
