import { Component } from 'react'

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
    // Vendor error tracking is card N6b (needs a DSN) — until then, keep the trace locally.
    console.error('RealTemp crashed:', error, info.componentStack)
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
