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
  | { status: 'ready'; snapshot: WeatherSnapshot; isStale: boolean; isRefreshing: boolean }

interface Fetched {
  requestKey: string
  locationKey: string
  result: Result<WeatherSnapshot, WeatherError>
}

/**
 * A background refetch (stale-TTL, focus, manual retry) never blanks an
 * already-populated dashboard. `fetched` holds the last result for the
 * CURRENT location only; a failed refresh never overwrites prior good data
 * for that same location — it's silently dropped (only `requestKey` advances,
 * so `isFetching` still clears), so the user keeps seeing the (now more)
 * stale reading instead of a working screen flashing to an error. `loading`
 * only renders when there's truly nothing to show yet for this location.
 *
 * `isFetching` is derived (fetched.requestKey ≠ current requestKey), not set
 * imperatively inside the effect — same discipline as the base loading state.
 */
export function useWeather(location: StoredLocation): [WeatherState, () => void] {
  const [attempt, setAttempt] = useState(0)
  const [fetched, setFetched] = useState<Fetched | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const fetchedAtRef = useRef<number | null>(null)

  const locationKey = `${location.latitude},${location.longitude}`
  const requestKey = `${locationKey}#${attempt}`
  const refetch = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    void fetchCurrentWeather(location.latitude, location.longitude).then((result) => {
      if (cancelled) return
      if (result.ok) {
        fetchedAtRef.current = result.value.fetchedAt.getTime()
        setFetched({ requestKey, locationKey, result })
        return
      }
      setFetched((prev) =>
        prev?.locationKey === locationKey && prev.result.ok ? { ...prev, requestKey } : { requestKey, locationKey, result },
      )
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, locationKey])

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

  const isFetching = fetched?.requestKey !== requestKey

  if (!fetched || fetched.locationKey !== locationKey) {
    return [{ status: 'loading' }, refetch]
  }
  if (!fetched.result.ok) {
    return [{ status: 'error', message: fetched.result.error.message }, refetch]
  }
  const isStale = now - fetched.result.value.fetchedAt.getTime() > WEATHER_TTL_MS
  return [{ status: 'ready', snapshot: fetched.result.value, isStale, isRefreshing: isFetching }, refetch]
}
