// Prompt 101 — where the chosen theme lives, and how it reaches the page.
// Deliberately plain functions with no React in them: the same logic runs in the
// tiny inline script in index.html, which executes long before React exists.

export type Theme = 'light' | 'dark'

/** Same `streammini.` prefix as the rest of our storage, so it is easy to spot and clear. */
export const THEME_STORAGE_KEY = 'streammini.theme'

/** What the viewer explicitly chose, or null if they never have. */
export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null // private browsing can throw on access
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore — the choice still applies for this visit */
  }
}

/** What the viewer's operating system is set to. */
export function getSystemTheme(): Theme {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

/**
 * The theme to show right now: an explicit choice wins; otherwise follow the OS.
 *
 * Dark is our house style, so an unknown system preference falls back to dark rather
 * than light — a viewer who has expressed nothing gets the design we built first.
 */
export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

/**
 * Put the theme on the page.
 *
 * `data-theme="light"` is what the CSS block in index.css hangs off; everything else
 * follows automatically because every utility reads a var() we just redefined.
 * The theme-color meta tells phone browsers what to paint their chrome.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.dataset.theme = theme
  // The inline style in index.html painted the first frame; keep it in step so a later
  // toggle does not leave a stale colour behind the app.
  root.style.background = theme === 'light' ? '#f4f4f8' : '#0b0b10'
  document.body.style.background = theme === 'light' ? '#f4f4f8' : '#0b0b10'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f4f4f8' : '#0b0b10')
}
