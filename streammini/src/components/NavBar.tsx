import { Link } from 'react-router'
import { SearchBar } from '../features/search/SearchBar'
import type { User } from '../lib/types'
import { Avatar } from './Avatar'
import { buttonStyles } from './buttonStyles'
import { DropdownMenu, type MenuItem } from './DropdownMenu'
import {
  ClockIcon,
  HistoryIcon,
  LogoutIcon,
  SearchIcon,
  ShieldIcon,
  UploadIcon,
  UserIcon,
  VideoIcon,
} from './icons'
import { Container } from './layout'
import { Logo } from './Logo'
import { Skeleton } from './Skeleton'

// The top bar on every page: logo, search, and either "Sign in" or the Upload button + account menu.
// It receives the user as props (RootLayout reads them from AuthContext), so it stays easy to preview.

export interface NavBarProps {
  user?: User | null
  /** A saved login is still being checked: show a placeholder, not a misleading "Sign in". */
  sessionChecking?: boolean
  onSignOut?: () => void
}

export function NavBar({
  user = null,
  sessionChecking = false,
  onSignOut = () => {},
}: NavBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <Container as="nav" aria-label="Main" className="flex h-16 items-center gap-4">
        <Logo />

        {/* Prompt 57: its own component now (features/search). Hidden on phones → search icon. */}
        <div className="mx-auto hidden w-full max-w-xl sm:block">
          {/* Prompt 62: quick matches while typing. */}
          <SearchBar withSuggestions />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {/* Phones: the search box is hidden, so offer a search icon instead. */}
          <Link
            to="/search"
            aria-label="Search"
            className="flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-elevated hover:text-fg sm:hidden"
          >
            <SearchIcon />
          </Link>

          {sessionChecking ? (
            // Same size as the avatar button, so nothing jumps when the real one appears.
            <Skeleton className="size-8 rounded-full" />
          ) : user ? (
            <>
              <Link
                to="/upload"
                className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-fg' })}
              >
                <UploadIcon className="size-5" />
                <span className="hidden md:inline">Upload</span>
                <span className="sr-only md:hidden">Upload</span>
              </Link>
              <AccountMenu user={user} onSignOut={onSignOut} />
            </>
          ) : (
            <Link to="/login" className={buttonStyles({ size: 'sm' })}>
              Sign in
            </Link>
          )}
        </div>
      </Container>
    </header>
  )
}

function AccountMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const items: MenuItem[] = [
    { label: 'Your profile', to: '/profile', icon: <UserIcon className="size-5" /> },
    { label: 'Your videos', to: '/my-videos', icon: <VideoIcon className="size-5" /> },
    { label: 'Upload a video', to: '/upload', icon: <UploadIcon className="size-5" /> },
    { label: 'History', to: '/history', icon: <HistoryIcon className="size-5" /> },
    { label: 'Watch later', to: '/watch-later', icon: <ClockIcon className="size-5" /> },
    // Only admins see this. (The backend still checks the role — hiding a link isn't security.)
    ...(user.role === 'admin'
      ? [{ label: 'Admin', to: '/admin', icon: <ShieldIcon className="size-5" /> }]
      : []),
    { separator: true },
    { label: 'Sign out', onClick: onSignOut, icon: <LogoutIcon className="size-5" /> },
  ]

  return (
    <DropdownMenu
      label="Account menu"
      trigger={<Avatar name={user.name} src={user.avatarUrl} size="sm" decorative />}
      header={
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" decorative />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-small text-fg-muted">{user.email}</p>
          </div>
        </div>
      }
      items={items}
    />
  )
}
