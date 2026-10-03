import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorFallback } from './ErrorFallback'

// The router's own "fuse". React Router catches any crash inside a route's page and renders its
// `errorElement` instead — this component. It's placed INSIDE the shared layout (see router.tsx),
// so a broken page still keeps the NavBar and the user can simply navigate somewhere else.
// Moving to another address clears the error automatically.

export function RouteErrorPage() {
  const error = useRouteError()

  // Errors the router itself raises (e.g. a thrown 404 Response) carry an HTTP status.
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <ErrorFallback
          title="Page not found"
          message="We couldn’t find what you were looking for."
          showRetry={false}
        />
      )
    }
    return <ErrorFallback message={`The page failed to load (${error.status}).`} error={error} />
  }

  return <ErrorFallback error={error} />
}
