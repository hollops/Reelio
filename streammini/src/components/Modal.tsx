import { useEffect, useId, useRef, type ReactNode } from 'react'

// A pop-up window built on the browser's native <dialog> element, which gives us for free:
// Escape to close, focus trapped inside, focus returned to the opener, and "dialog" semantics
// for screen readers. We add: backdrop click to close, a title, a close button and a footer slot.

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** The modal's content — anything placed between <Modal> and </Modal>. */
  children: ReactNode
  /** Optional action row, e.g. Cancel / Confirm buttons. */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' }

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  // React state (`open`) is the single source of truth; this keeps the real <dialog> in sync.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Escape fires "cancel". Stop the browser closing it by itself, and let the parent decide,
      // so React state and the screen never disagree.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // Clicks on the dark backdrop land on the <dialog> element itself; clicks on the content
      // land on the inner panel. So "target is the dialog" means "clicked outside the panel".
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className={`m-auto w-[calc(100%-2rem)] ${widths[size]} rounded-xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm`}
    >
      {/* Contents exist only while open. A closed dialog's boxes would otherwise still sit in the
          page — invisible, but found by browser autofill, password managers and tests. */}
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-title font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex size-9 items-center justify-center rounded-md text-fg-muted hover:bg-elevated hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-text"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          {/* Long content scrolls inside the modal instead of pushing it off-screen. */}
          <div className="overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <footer className="flex justify-end gap-3 border-t border-line px-5 py-4">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
