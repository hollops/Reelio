import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useToast } from '../../components/toast/toastContext'
import { useAuth } from './authContext'
import type { LoginRedirectState } from './redirect'
import { SessionLoading } from './SessionLoading'

// "Bouncers" for pages that need a signed-in user (or an admin).
// Each one is a layout route: it renders <Outlet /> (= "let them through") or redirects.
// One guard can protect many pages — see router.tsx.
//
// Reminder: these only decide what the SCREEN shows. The backend still checks the token on
// every request, because anyone can edit JavaScript in their own browser.

/** Signed-in users only. Visitors are sent to /login and come back here afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  // A saved token is still being checked: we genuinely don't know yet. Redirecting now would
  // bounce a real, signed-in user to the login page on every refresh.
  if (status === 'checking') return <SessionLoading />

  if (status === 'anonymous') {
    const state: LoginRedirectState = {
      from: { pathname: location.pathname, search: location.search, hash: location.hash },
    }
    // `replace`: the Back button shouldn't return to a page that would just redirect again.
    return <Navigate to="/login" replace state={state} />
  }

  return <Outlet />
}

/** Admins only. Visitors go to /login (as above); signed-in non-admins go Home with a message. */
export function AdminRoute() {
  const { status, user } = useAuth()
  const isNonAdmin = status === 'authenticated' && user?.role !== 'admin'

  if (status === 'checking') return <SessionLoading />
  // Not signed in at all: same treatment as any protected page (login, then come back).
  if (status === 'anonymous') return <ProtectedRoute />
  if (isNonAdmin) return <NotAllowed />

  return <Outlet />
}

/** Tell the user why they were moved, then move them. */
function NotAllowed() {
  const toast = useToast()
  const told = useRef(false) // React's development mode runs effects twice; say it once.

  useEffect(() => {
    if (told.current) return
    told.current = true
    toast.error('That page is for admins only.')
  }, [toast])

  return <Navigate to="/" replace />
}
