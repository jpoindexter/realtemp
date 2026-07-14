import { Component } from 'react'

import { trackError } from '@/lib/error-tracking'

import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** Last line of defense: a render crash shows a recoverable screen, never a white page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('RealTemp crashed:', error, info.componentStack)
    trackError(error) // no-op until VITE_SENTRY_DSN is set (card N6c)
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="app stack">
        <h1 className="title">RealTemp hit a wall</h1>
        <p className="error">Something broke while rendering. Reload to recover — your location and toggles are saved.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    )
  }
}
