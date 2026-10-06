import { useTheme } from '../features/theme/themeContext'
import { buttonStyles } from './buttonStyles'
import { MoonIcon, SunIcon } from './icons'

// Prompt 101 — flip between light and dark. Shown to everyone, signed in or not, because
// browsing Viora is public and a reader on a bright train needs this before they need an account.

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const goingTo = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      // The label says what pressing it DOES, not what the current state is — that is what a
      // screen-reader user needs from a button. aria-pressed would describe a state instead.
      aria-label={`Switch to ${goingTo} theme`}
      title={`Switch to ${goingTo} theme`}
      className={buttonStyles({ variant: 'ghost', size: 'sm', className: `text-fg ${className ?? ''}` })}
    >
      {/* Show the destination, like every OS and browser does: a moon means "go dark". */}
      {theme === 'dark' ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </button>
  )
}
