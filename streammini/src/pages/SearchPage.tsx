import { useSearchParams } from 'react-router'
import { FilterChips } from '../features/search/FilterChips'
import {
  filterResults,
  NO_FILTERS,
  readFilters,
  writeFilters,
  type SearchFilters,
} from '../features/search/filters'
import { NoResults } from '../features/search/NoResults'
import { EmptyState } from '../components/EmptyState'
import { AlertIcon, SearchIcon } from '../components/icons'
import { Container, PageHeader, VideoGrid } from '../components/layout'
import { SearchSkeleton } from '../features/search/SearchSkeleton'
import { SearchBar } from '../features/search/SearchBar'
import { useSearchResults } from '../features/search/useSearchResults'
import { VideoCard } from '../features/videos/VideoCard'
import { useWatchLater } from '../features/watchLater/watchLaterContext'
import { usePageTitle } from '../components/usePageTitle'

// Prompt 58 — the Search results page: /search?q=lagos → a grid of matching VideoCards.
// Prompt 59 — typing (in the NavBar box, or the page's own box on phones) updates ?q= after a
// 300 ms pause, and the results follow the address.
// Prompt 60 — filter chips; 61 — a helpful no-results screen; 63 — all of it kept in the address.
// Still to come: skeletons while loading (64).

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  usePageTitle(q ? `${q} – Search` : 'Search')
  // Prompt 63 — EVERYTHING about the search lives in the address: ?q=, ?category=, ?duration=.
  // Share it, bookmark it or refresh, and it opens exactly the same.
  const filters = readFilters(params)
  const { category } = filters
  // With words typed, ask the server for ALL matches and apply the category here, so the chips
  // can still count every category. With only a category (browsing, Prompt 61), the server
  // filters by category.
  const results = useSearchResults({ q, category: q ? null : category })
  const watchLater = useWatchLater()
  // What's on screen: the results, or — while the next search loads — the previous ones (64).
  const videos =
    results.status === 'ready'
      ? results.videos
      : results.status === 'loading'
        ? results.previous
        : undefined
  const refreshing = results.status === 'loading' && videos !== undefined
  // Prompt 60 — chip filters narrow the results already here (no new request).
  const shown = videos ? filterResults(videos, filters) : []
  const filtered = filters.category !== null || filters.duration !== 'any'

  // A chip click writes the address. It's a normal navigation (not `replace`), so Back undoes
  // the last filter — unlike typing, where Back mustn't replay every letter (Prompt 59).
  function setFilters(next: SearchFilters) {
    setParams((current) => writeFilters(current, next))
  }

  return (
    <Container className="pb-16">
      {/* Prompt 59 — phones hide the NavBar search box, so the page brings its own. Typing here
          searches as you type too; focused straight away if nothing's been searched yet. */}
      <div className="pt-4 sm:hidden">
        <SearchBar autoFocus={!q} />
      </div>

      <PageHeader
        title={
          q && category
            ? `Results for “${q}” in ${category}`
            : q
              ? `Results for “${q}”`
              : (category ?? 'Search')
        }
        description={
          videos
            ? filtered
              ? `${shown.length} of ${videos.length} videos`
              : `${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`
            : undefined
        }
      />

      {results.status === 'idle' && (
        <EmptyState
          icon={<SearchIcon className="size-7" />}
          title="Search for videos"
          description="Type what you’re looking for in the search box — a title, a channel or a topic."
        />
      )}

      {/* Prompt 64 — the FIRST search shows skeletons. Later searches keep the old results on
          screen (faded, below) until the new ones arrive, so typing never flashes grey boxes. */}
      {results.status === 'loading' && !videos && <SearchSkeleton />}

      {results.status === 'error' && (
        <EmptyState
          icon={<AlertIcon className="size-7 text-danger" />}
          title="Search isn’t working right now"
          description={results.message}
          action={{ label: 'Try again', onClick: results.retry }}
        />
      )}

      {videos &&
        (videos.length === 0 ? (
          <NoResults query={q} />
        ) : (
          <div
            // aria-busy: "these are being refreshed" — the faded look says the same to the eye.
            aria-busy={refreshing || undefined}
            className={`space-y-6 motion-safe:transition-opacity ${refreshing ? 'opacity-50' : ''}`}
          >
            <FilterChips videos={videos} filters={filters} onChange={setFilters} />
            {shown.length === 0 ? (
              <EmptyState
                title="No videos match these filters"
                description="Try another category or length."
                action={{ label: 'Clear filters', onClick: () => setFilters(NO_FILTERS) }}
              />
            ) : (
              <>
                <VideoGrid heading="Results">
                  {shown.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      inWatchLater={watchLater.isSaved(video.id)}
                      onToggleWatchLater={watchLater.toggle}
                    />
                  ))}
                </VideoGrid>
              </>
            )}
          </div>
        ))}
    </Container>
  )
}
