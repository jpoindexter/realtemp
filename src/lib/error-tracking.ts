import { config } from './config'

/**
 * Sentry loads as a separate chunk ONLY when a DSN is configured —
 * without VITE_SENTRY_DSN this whole feature costs zero bytes.
 */
export function initErrorTracking(): void {
  if (!config.sentryDsn) return
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn: config.sentryDsn ?? undefined, sendDefaultPii: false })
  })
}

export function trackError(error: unknown): void {
  if (!config.sentryDsn) return
  void import('@sentry/react').then((Sentry) => Sentry.captureException(error))
}
