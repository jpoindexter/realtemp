import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchCurrentWeather } from '@/features/weather/open-meteo'

import type { StoredLocation } from '@/features/location/geocoding'
import type { WeatherError, WeatherSnapshot } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

/** Past this age a reading is marked stale; a focus/visibility event refetches it. */
export const WEATHER_TTL_MS = 600_000
const STALE_CHECK_INTERVAL_MS = 60_000

export type WeatherState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: WeatherSnapshot; isStale: boolean }

interface Fetched {
  key: string
  result: Result<WeatherSnapshot, WeatherError>
}

/**
 * Loading is derived (fetched.key ≠ current key), not set imperatively —
 * a location change or retry invalidates the old result by construction.
 */
export function useWeather(location: StoredLocation): [WeatherState, () => void] {
  const [attempt, setAttempt] = useState(0)
  const [fetched, setFetched] = useState<Fetched | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const fetchedAtRef = useRef<number | null>(null)

  const key = `${location.latitude},${location.longitude}#${attempt}`
  const refetch = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    void fetchCurrentWeather(location.latitude, location.longitude).then((result) => {
      if (cancelled) return
      fetchedAtRef.current = result.ok ? result.value.fetchedAt.getTime() : null
      setFetched({ key, result })
    })
    return () => {
      cancelled = true
    }
  }, [key, location.latitude, location.longitude])

  // Staleness is time-driven: a slow ticker re-evaluates it, and returning to the
  // app (focus/visibility) refetches immediately when past TTL.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), STALE_CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setNow(Date.now())
      const at = fetchedAtRef.current
      if (at !== null && Date.now() - at > WEATHER_TTL_MS) refetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refetch])

  if (fetched?.key !== key) return [{ status: 'loading' }, refetch]
  if (!fetched.result.ok) return [{ status: 'error', message: fetched.result.error.message }, refetch]
  const isStale = now - fetched.result.value.fetchedAt.getTime() > WEATHER_TTL_MS
  return [{ status: 'ready', snapshot: fetched.result.value, isStale }, refetch]
}
