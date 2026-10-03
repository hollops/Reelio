import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi, type ToastKind, type ToastOptions } from './toastContext'

// The toast "station": owns the list of messages and draws them at the bottom of the screen.
// Wrap the app in it once; any component inside can then call useToast().

interface ToastItem extends ToastOptions {
  id: string
  kind: ToastKind
  message: string
}

const MAX_VISIBLE = 3
const DEFAULT_DURATION = { success: 4000, info: 4000, error: 6000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((kind: ToastKind, message: string, options: ToastOptions = {}) => {
    const id = crypto.randomUUID()
    // Newest at the end; keep only the last few so a burst of clicks can't bury the screen.
    setToasts((list) => [...list, { id, kind, message, ...options }].slice(-MAX_VISIBLE))
    return id
  }, [])

  // useMemo: the same api object every render, so components using it don't re-render needlessly.
  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => show('success', message, options),
      error: (message, options) => show('error', message, options),
      info: (message, options) => show('info', message, options),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* The live region always exists, so screen readers are listening before a toast arrives. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-start"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const icons: Record<ToastKind, ReactNode> = {
  success: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  error: <path d="M12 7v6m0 4h.01M4.5 19h15L12 5 4.5 19z" />,
  info: <path d="M12 11v6m0-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
}
const iconColor: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent-text',
}

// onDismiss is the provider's stable `dismiss` — a new inline function each render would restart the timer.
function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false)
  // Time left survives pauses: hovering at 3s of 4s resumes with 1s left, not a fresh 4s.
  const remaining = useRef(toast.duration ?? DEFAULT_DURATION[toast.kind])

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now()
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current)
    return () => {
      clearTimeout(timer)
      remaining.current -= Date.now() - startedAt
    }
  }, [paused, onDismiss, toast.id])

  return (
    <div
      // Errors interrupt (alert); everything else waits its turn (status).
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-line bg-elevated py-3 pr-2 pl-4 text-small text-fg shadow-2xl motion-safe:animate-toast-in"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`size-5 shrink-0 ${iconColor[toast.kind]}`}
      >
        {icons[toast.kind]}
      </svg>
      <p className="flex-1">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick()
            onDismiss(toast.id)
          }}
          className="rounded px-2 py-1 font-semibold text-accent-text hover:bg-line focus-visible:outline-2 focus-visible:outline-accent-text"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex size-8 items-center justify-center rounded text-fg-muted hover:bg-line hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-text"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
