import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '../../components/toast/toastContext'
import { api, clearToken, getToken, onUnauthorized, setToken, TOKEN_KEY } from '../../lib/apiClient'
import type { AuthResponse, LoginInput, RegisterInput, User } from '../../lib/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

// Owns the login session. We save only the TOKEN in the browser — never the user object —
// and always ask the server who the token belongs to, because the server is the source of truth
// (a saved copy could be out of date if a role changed or the account was removed).

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [user, setUser] = useState<User | null>(null)
  // If a token is saved, we don't know yet whether it's still valid → "checking".
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'checking' : 'anonymous'))

  const signIn = useCallback((res: AuthResponse, remember = true) => {
    setToken(res.token, remember)
    setUser(res.user)
    setStatus('authenticated')
    return res.user
  }, [])

  const signOutLocally = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus('anonymous')
  }, [])

  // Ask the server who the saved token belongs to (on first load, and when another tab logs in).
  // Callers set status to "checking" first; on first load it already starts that way.
  const restoreSession = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const me = await api.get<User>('/auth/me')
      if (isCancelled()) return
      setUser(me)
      setStatus('authenticated')
    } catch {
      // Either the token was rejected (the 401 handler below has already cleared it and said
      // "session expired"), or the server is unreachable (the token is kept, so a later
      // refresh can try again). Either way we can't prove who this is right now.
      if (isCancelled()) return
      setUser(null)
      setStatus('anonymous')
    }
  }, [])

  // 1. On first load: if a token was saved, check it.
  useEffect(() => {
    let cancelled = false
    // restoreSession only sets state AFTER the server replies (post-await), so this isn't the
    // synchronous setState the rule warns about — the rule can't see past the await.
    // oxlint-disable-next-line react/set-state-in-effect
    if (getToken()) void restoreSession(() => cancelled)
    // React's development mode runs effects twice; `cancelled` makes the first run's answer harmless.
    return () => {
      cancelled = true
    }
  }, [restoreSession])

  // 2. If the server ever rejects our token mid-session, log out and say why.
  useEffect(
    () =>
      onUnauthorized(() => {
        signOutLocally()
        toast.info('Your session expired. Please sign in again.')
      }),
    [signOutLocally, toast],
  )

  // 3. Keep tabs in sync: logging out (or in) in one tab updates the others.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return
      if (e.newValue === null) {
        setUser(null)
        setStatus('anonymous')
      } else {
        setStatus('checking')
        void restoreSession()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [restoreSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (input: LoginInput, { remember = true } = {}) =>
        signIn(await api.post<AuthResponse>('/auth/login', input), remember),
      register: async (input: RegisterInput) =>
        signIn(await api.post<AuthResponse>('/auth/register', input)),
      logout: signOutLocally,
      // Only accept an update for the person who is signed in (guards against a late reply
      // arriving after someone else has logged in).
      updateUser: (next: User) => setUser((current) => (current?.id === next.id ? next : current)),
    }),
    [status, user, signIn, signOutLocally],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
