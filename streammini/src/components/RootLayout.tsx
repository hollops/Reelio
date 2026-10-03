import { Outlet, ScrollRestoration, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/authContext'
import { WatchLaterProvider } from '../features/watchLater/WatchLaterProvider'
import { NavBar } from './NavBar'
import { useToast } from './toast/toastContext'
import { usePageFocus } from './usePageFocus'

// The frame shared by every page: NavBar on top, the current page in the <Outlet />.
export function RootLayout() {
  const { status, user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  function signOut() {
    logout() // forget the token and the user
    toast.info('You’ve signed out.')
    // `replace`: pressing Back afterwards shouldn't reopen the private page we were on.
    // (A deliberate sign-out leaves no "come back here" note — the next person starts at Home.)
    navigate('/login', { replace: true })
  }

  usePageFocus() // Prompt 95 — after navigating, focus goes to the new page's heading

  return (
    <div className="flex min-h-screen flex-col">
      {/* Prompt 95 — the very first Tab on any page: jump past the top bar straight to the
          content, instead of tabbing through every nav item on every page. Hidden until focused. */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault() // no "#main" in the URL — just move focus
          const heading = document.querySelector<HTMLElement>('main h1')
          const target = heading ?? document.getElementById('main')
          if (!target) return
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
          target.focus()
        }}
        className="sr-only z-50 rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <NavBar user={user} sessionChecking={status === 'checking'} onSignOut={signOut} />
      {/* tabIndex -1: focusable by script (the skip link) but not a Tab stop itself. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {/* Shared Watch later memory for every page (it resets itself when the person changes). */}
        <WatchLaterProvider>
          <Outlet />
        </WatchLaterProvider>
      </main>
      {/* New page = start at the top, like a normal website. Back button restores position. */}
      <ScrollRestoration />
    </div>
  )
}
