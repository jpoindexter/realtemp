import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'
import { ErrorBoundary } from './features/errors/ErrorBoundary'
import { initErrorTracking } from './lib/error-tracking'

import './styles.css'

initErrorTracking()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('index.html is missing #root')

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
