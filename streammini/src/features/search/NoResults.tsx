import { Link } from 'react-router'
import { SearchIcon } from '../../components/icons'
import { CATEGORIES } from '../../lib/types'

// Prompt 61 — when a search finds nothing: say so plainly, suggest how to search differently,
// and offer a way forward that ALWAYS works — browsing a category.

export function NoResults({ query }: { query: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface text-fg-muted">
        <SearchIcon className="size-7" />
      </div>
      <h2 className="text-title font-semibold text-balance">
        {query ? `No results for “${query}”` : 'No videos here yet'}
      </h2>
      <p className="mt-2 text-small text-pretty text-fg-muted">
        Try different keywords, check the spelling, or use fewer or more general words.
      </p>

      <p className="mt-8 text-small font-semibold">Or browse a category:</p>
      {/* Links, not buttons: each one GOES to a page of that category's videos. */}
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              to={`/search?${new URLSearchParams({ category })}`}
              className="inline-flex h-8 items-center rounded-lg bg-elevated px-3 text-small font-medium hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text"
            >
              {category}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
