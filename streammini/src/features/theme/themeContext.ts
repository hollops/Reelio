import { createContext, useContext } from 'react'
import type { Theme } from './theme'

// Kept apart from ThemeProvider.tsx so that file only exports components — fast refresh needs that.

export interface ThemeContextValue {
  theme: Theme
  /** True while the viewer has made no explicit choice, so we are following their OS. */
  followingSystem: boolean
  setTheme: (theme: Theme) => void
  /** Flip to the other theme and remember it. */
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

/** `const { theme, toggleTheme } = useTheme()` — from any component inside <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme() must be used inside <ThemeProvider>.')
  return value
}
