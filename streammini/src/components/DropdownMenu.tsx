import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

// A button that opens a list of choices, following the standard "menu button" keyboard pattern:
// opening moves focus in, ↑/↓ move, Home/End jump, Escape closes and returns focus to the button,
// Tab or a click outside closes it. Screen readers hear "menu, N items".
// Reused by the profile menu now, and later by the player's quality menu and "⋮ more" menus.

type BaseItem = { label: string; icon?: ReactNode }
export type MenuItem =
  | (BaseItem & { to: string }) // goes somewhere → link
  | (BaseItem & { onClick: () => void; danger?: boolean }) // does something → button
  | { separator: true }

export interface DropdownMenuProps {
  /** What the button shows (an avatar, "⋮", a gear…). */
  trigger: ReactNode
  /** Accessible name for the button, e.g. "Account menu". */
  label: string
  items: MenuItem[]
  /** Optional non-interactive block at the top of the popup (e.g. the user's name and email). */
  header?: ReactNode
  className?: string
}

const itemClass =
  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-small outline-none ' +
  'hover:bg-line focus-visible:bg-line'

export function DropdownMenu({ trigger, label, items, header, className = '' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  // Ask the menu for its items when needed, rather than tracking each one separately.
  const menuItems = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
  ]

  const focusItem = (index: number) => {
    const els = menuItems()
    if (els.length === 0) return
    els[(index + els.length) % els.length].focus() // wraps around both ends
  }

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) buttonRef.current?.focus()
  }

  // When it opens, move focus to the first item.
  useEffect(() => {
    if (open) focusItem(0)
  }, [open])

  // A click anywhere outside closes it (without stealing focus from what was clicked).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const els = menuItems()
    const current = els.indexOf(document.activeElement as HTMLElement)
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusItem(current + 1),
      ArrowUp: () => focusItem(current - 1),
      Home: () => focusItem(0),
      End: () => focusItem(els.length - 1),
      Escape: () => close(),
      Tab: () => close(false), // let Tab carry on to the next thing on the page
    }
    const action = keys[e.key]
    if (!action) return
    if (e.key !== 'Tab') e.preventDefault() // stop arrows from scrolling the page
    action()
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="flex items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-text"
      >
        {trigger}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-elevated py-2 shadow-2xl">
          {header && <div className="border-b border-line px-4 pt-2 pb-3">{header}</div>}
          <ul
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            className="pt-1"
          >
            {items.map((item, i) => {
              if ('separator' in item) {
                return (
                  <li key={`sep-${i}`} role="separator" className="my-1 border-t border-line" />
                )
              }
              const content = (
                <>
                  {item.icon && <span className="text-fg-muted">{item.icon}</span>}
                  {item.label}
                </>
              )
              return (
                <li key={item.label} role="none">
                  {'to' in item ? (
                    <Link
                      to={item.to}
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => close(false)}
                      className={`${itemClass} text-fg`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => {
                        close()
                        item.onClick()
                      }}
                      className={`${itemClass} ${item.danger ? 'text-danger' : 'text-fg'}`}
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
