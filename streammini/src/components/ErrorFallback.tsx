import { buttonStyles } from './buttonStyles'
import { AlertIcon } from './icons'

// The friendly screen shown when something crashes, instead of a blank page.
// Shared by both "fuses": the router's error page and the app-wide ErrorBoundary.
//
// It uses a plain <a href="/"> rather than a router <Link>: after a crash, a full reload is the
// safest way home — and the app-wide boundary sits outside the router, where <Link> can't work.

export interface ErrorFallbackProps {
  title?: string
  message?: string
  /** The error itself — its details are shown in development builds only. */
  error?: unknown
  /** Hide "Try again" when retrying can't help (e.g. a page that doesn't exist). */
  showRetry?: boolean
}

export function ErrorFallback({
  title = 'Something went wrong',
  message = 'An unexpected error stopped this page from loading. Try again, or head back home.',
  error,
  showRetry = true,
}: ErrorFallbackProps) {
  return (
    <section
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center sm:px-6"
    >
      <AlertIcon className="size-12 text-danger" />
      <h1 className="text-heading font-bold">{title}</h1>
      <p className="text-fg-muted">{message}</p>

      <div className="flex flex-wrap justify-center gap-3">
        {showRetry && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={buttonStyles({ variant: 'primary' })}
          >
            Try again
          </button>
        )}
        <a href="/" className={buttonStyles({ variant: showRetry ? 'secondary' : 'primary' })}>
          Go to Home
        </a>
      </div>

      {/* Developers need the details; users don't (and shouldn't see internals). */}
      {import.meta.env.DEV && error != null && (
        <details className="w-full rounded-md border border-line bg-surface p-3 text-left">
          <summary className="cursor-pointer text-small text-fg-muted">
            Error details (development only)
          </summary>
          <pre className="mt-2 overflow-x-auto text-caption whitespace-pre-wrap text-danger">
            {describe(error)}
          </pre>
        </details>
      )}
    </section>
  )
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`
  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}
