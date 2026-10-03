import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorFallback } from './ErrorFallback'

// The app-wide "fuse box". If anything below it crashes while rendering, React shows this
// component's fallback instead of wiping the whole page blank.
//
// Why a class? Catching render errors is the one React feature that still has no hook
// equivalent — `getDerivedStateFromError` and `componentDidCatch` exist only on classes.
//
// What it does NOT catch: errors in event handlers (onClick…) and in async code (await …).
// Those don't happen during rendering; we handle them with try/catch and toasts instead.

interface Props {
  children: ReactNode
}

interface State {
  error: unknown
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false }

  // Step 1 — during rendering: flip to the fallback UI.
  static getDerivedStateFromError(error: unknown): State {
    return { error, hasError: true }
  }

  // Step 2 — after the fallback is on screen: report it. A real app would send this to an
  // error-tracking service (Sentry, etc.); for now the console is our report.
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary] The app crashed while rendering:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />
    return this.props.children
  }
}
