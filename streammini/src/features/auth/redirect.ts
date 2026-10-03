import type { Location } from 'react-router'

// The note ProtectedRoute leaves for the login page: "this visitor was heading to /upload".
// After signing in, we read it back and send them there instead of Home.

export interface LoginRedirectState {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>
}

/** Where to go after signing in / registering. Falls back to Home. */
export function redirectTarget(state: unknown): string {
  const from = (state as LoginRedirectState | null)?.from
  const path = from?.pathname

  // Only addresses inside this app. "//evil.com" would be read by the browser as another site —
  // a classic "open redirect" trick — so anything not starting with a single "/" is ignored.
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return '/'
  // Coming back to the login/register page after logging in would be pointless.
  if (path === '/login' || path === '/register') return '/'

  return `${path}${from?.search ?? ''}${from?.hash ?? ''}`
}
