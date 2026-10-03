import { Spinner } from '../../components/Spinner'

// Shown in place of a protected page while a saved login is being checked with the server.
// Usually visible for a fraction of a second after a refresh.
export function SessionLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-fg-muted">
      <Spinner label={null} />
      {/* The one announcement screen readers get; the spinner itself stays silent. */}
      <p role="status">Checking your session…</p>
    </div>
  )
}
