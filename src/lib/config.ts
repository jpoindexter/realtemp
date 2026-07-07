import { z } from 'zod'

/**
 * Optional integrations, validated at startup. Absent/invalid → null → the
 * dependent feature simply doesn't render. No stubs, no dead buttons.
 */
function readUrl(value: unknown): string | null {
  const parsed = z.url().safeParse(value)
  return parsed.success ? parsed.data.replace(/\/$/, '') : null
}

function readNonEmpty(value: unknown): string | null {
  const parsed = z.string().min(1).safeParse(value)
  return parsed.success ? parsed.data : null
}

export const config = {
  /** realtemp-api Worker origin (e.g. https://realtemp-api.<account>.workers.dev) */
  apiBase: readUrl(import.meta.env.VITE_API_BASE),
  /** Sentry DSN — enables crash reporting when present */
  sentryDsn: readNonEmpty(import.meta.env.VITE_SENTRY_DSN),
}
