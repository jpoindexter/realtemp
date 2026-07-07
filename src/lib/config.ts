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

/** VAPID public key (public by design; the private half is a Worker secret). */
export const VAPID_PUBLIC_KEY =
  'BF8MfrxJ_cCc0KT0T0L_F0-YwZZ_1L4Q4YRB8ZCGNvcKmb4b9r3JUqjwopgBEYbfX2pjU0YnqJtk8en7nSvad0I'
