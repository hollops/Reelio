import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { applyTheme, getStoredTheme, getSystemTheme, resolveTheme, storeTheme } from './theme'
import type { Theme } from './theme'
import { ThemeContext } from './themeContext'

// Prompt 101 — holds the current theme and keeps <html data-theme> in step with it.
// The FIRST paint is handled by the inline script in index.html, long before this runs;
// this provider owns every change after that.

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read the real answer during the first render (not in an effect), so the button never
  // shows the wrong icon for a frame.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document === 'undefined' ? 'dark' : resolveTheme(),
  )
  const [followingSystem, setFollowingSystem] = useState(() => getStoredTheme() === null)

  // Keep the page in step whenever the value changes.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  /**
   * While the viewer is following their OS, honour it changing underneath us — someone on a
   * schedule that flips to dark at sunset should see Viora flip too, without a reload.
   * Once they choose for themselves, we stop listening.
   */
  useEffect(() => {
    if (!followingSystem || typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setThemeState(getSystemTheme())
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [followingSystem])

  const setTheme = useCallback((next: Theme) => {
    storeTheme(next)
    setFollowingSystem(false) // an explicit choice overrides the OS from now on
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      storeTheme(next)
      setFollowingSystem(false)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, followingSystem, setTheme, toggleTheme }),
    [theme, followingSystem, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
