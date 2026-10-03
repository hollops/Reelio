import { createContext, useContext } from 'react'
import type { LoginInput, RegisterInput, User } from '../../lib/types'

// The "front desk" every component can ask: is someone logged in, and who?
// (Kept apart from AuthProvider.tsx so that file only exports components — fast refresh needs that.)

/**
 * checking      — a saved token exists and we're asking the server who it belongs to
 * authenticated — logged in; `user` is set
 * anonymous     — nobody is logged in
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /**
   * Resolves with the user, or throws an ApiError (e.g. wrong password) for the form to show.
   * `remember: false` keeps the session only until the browser is closed.
   */
  login: (input: LoginInput, options?: { remember?: boolean }) => Promise<User>
  /** Resolves with the new user, or throws an ApiError with per-field errors. */
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
  /** After the server confirms a profile change, show the new name/photo everywhere at once. */
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** `const { user, login, logout } = useAuth()` — from any component inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return value
}
