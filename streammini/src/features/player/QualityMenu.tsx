import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { CheckIcon, SettingsIcon } from '../../components/icons'

// Prompt 72 — the ⚙ menu for choosing picture quality. A real menu for screen readers:
// the options are "radio" items (exactly one is ticked); ↑ ↓ move, Enter picks, Esc closes
// and returns focus to ⚙.

export interface QualityOption {
  label: string // "720p", "360p"… or "Auto" when there's only one version
  src: string
}

export function QualityMenu({
  options,
  current,
  onPick,
}: {
  options: QualityOption[]
  current: string // the label that's playing now
  onPick: (option: QualityOption) => void
}) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])

  // When it opens, put focus on the ticked option (like a native select).
  useEffect(() => {
    if (!open) return
    const index = Math.max(
      0,
      options.findIndex((o) => o.label === current),
    )
    itemsRef.current[index]?.focus()
  }, [open, options, current])

  // Click anywhere else → close.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  function close() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function onMenuKey(e: KeyboardEvent) {
    const i = itemsRef.current.findIndex((el) => el === document.activeElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      itemsRef.current[(i + step + options.length) % options.length]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // Esc closes the menu, not full screen
      close()
    } else if (e.key === 'Tab') setOpen(false)
    // Keys like K or F shouldn't reach the player's shortcuts while the menu is open.
    e.stopPropagation()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Settings"
        title="Settings (quality)"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        // 48 px on touch screens, like the other player buttons (Prompt 76).
        className="flex size-10 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white pointer-coarse:size-12"
      >
        <SettingsIcon
          className={`size-6 motion-safe:transition-transform ${open ? 'rotate-45' : ''}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Quality"
          onKeyDown={onMenuKey}
          className="absolute right-0 bottom-full mb-2 w-56 overflow-hidden rounded-xl bg-black/90 py-2 text-small shadow-2xl"
        >
          <p className="px-4 pb-1 text-caption font-semibold text-white/60" aria-hidden="true">
            Quality
          </p>
          {options.map((option, i) => {
            const checked = option.label === current
            return (
              <button
                key={option.src}
                ref={(el) => {
                  itemsRef.current[i] = el
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => {
                  if (!checked) onPick(option)
                  close()
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-white/15 focus:bg-white/15 focus:outline-none"
              >
                <span className="flex size-4 items-center justify-center">
                  {checked && <CheckIcon className="size-4" />}
                </span>
                {option.label}
              </button>
            )
          })}
          {options.length === 1 && (
            <p className="px-4 pt-1 text-caption text-white/60">
              Only one quality is available for this video.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
