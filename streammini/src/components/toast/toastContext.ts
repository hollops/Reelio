import { createContext, useContext } from 'react'

// The "intercom" between any component and the toast station at the top of the app.
// (Kept apart from ToastProvider.tsx so that file only exports components — fast refresh needs that.)

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastOptions {
  /** How long it stays, in ms. Defaults: 4s, or 6s for errors (they need reading and acting on). */
  duration?: number
  /** An optional button, e.g. { label: 'Undo', onClick: restore }. Clicking it also closes the toast. */
  action?: { label: string; onClick: () => void }
}

export interface ToastApi {
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/** Show a toast from any component: `const toast = useToast(); toast.success('Saved')`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  // Fail loudly during development instead of silently showing nothing.
  if (!api) throw new Error('useToast() must be used inside <ToastProvider>.')
  return api
}
