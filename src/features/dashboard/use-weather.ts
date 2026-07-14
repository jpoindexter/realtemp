import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchCurrentWeather } from '@/features/weather/open-meteo'
import { ok } from '@/lib/result'

import type { StoredLocation } from '@/features/location/geocoding'
import type { WeatherError, WeatherSnapshot } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

/** Past this age a reading is marked stale; a focus/visibility event refetches it. */
export const WEATHER_TTL_MS = 600_000
const STALE_CHECK_INTERVAL_MS = 60_000
const WEATHER_CACHE_PREFIX = 'realtemp:weather:'
const WEATHER_CACHE_VERSION = 1

export type WeatherState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: WeatherSnapshot; isStale: boolean; isRefreshing: boolean }

interface Fetched {
  requestKey: string
  locationKey: string
  result: Result<WeatherSnapshot, WeatherError>
}

type CachedWeatherSnapshot = Omit<WeatherSnapshot, 'fetchedAt'> & { fetchedAt: string }

function cacheKey(locationKey: string): string {
  return `${WEATHER_CACHE_PREFIX}${locationKey}`
}

function readCachedWeather(locationKey: string): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey(locationKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: unknown; snapshot?: Partial<CachedWeatherSnapshot> }
    if (parsed.version !== WEATHER_CACHE_VERSION || !parsed.snapshot) return null
    const fetchedAt = new Date(String(parsed.snapshot.fetchedAt))
    if (!Number.isFinite(fetchedAt.getTime())) return null
    if (typeof parsed.snapshot.airTempC !== 'number' || typeof parsed.snapshot.localTimeIso !== 'string') return null
    return {
      airTempC: parsed.snapshot.airTempC,
      dewPointC: typeof parsed.snapshot.dewPointC === 'number' ? parsed.snapshot.dewPointC : null,
      windSpeedMs: typeof parsed.snapshot.windSpeedMs === 'number' ? parsed.snapshot.windSpeedMs : null,
      uvIndex: typeof parsed.snapshot.uvIndex === 'number' ? parsed.snapshot.uvIndex : null,
      localHour: typeof parsed.snapshot.localHour === 'number' ? parsed.snapshot.localHour : new Date().getHours(),
      localTimeIso: parsed.snapshot.localTimeIso,
      fetchedAt,
      utcOffsetSeconds: typeof parsed.snapshot.utcOffsetSeconds === 'number' ? parsed.snapshot.utcOffsetSeconds : 0,
      hourly: Array.isArray(parsed.snapshot.hourly) ? parsed.snapshot.hourly : [],
      baseline14C: typeof parsed.snapshot.baseline14C === 'number' ? parsed.snapshot.baseline14C : null,
    }
  } catch {
    return null
  }
}

function writeCachedWeather(locationKey: string, snapshot: WeatherSnapshot): void {
  try {
    localStorage.setItem(
      cacheKey(locationKey),
      JSON.stringify({
        version: WEATHER_CACHE_VERSION,
        snapshot: { ...snapshot, fetchedAt: snapshot.fetchedAt.toISOString() },
      }),
    )
  } catch {
    // Cache is best-effort; the live fetch remains the source of truth.
  }
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
  const locationKey = `${location.latitude},${location.longitude}`
  const [attempt, setAttempt] = useState(0)
  const [fetched, setFetched] = useState<Fetched | null>(() => {
    const cached = readCachedWeather(locationKey)
    return cached ? { requestKey: `${locationKey}#cache`, locationKey, result: ok(cached) } : null
  })
  const [now, setNow] = useState(() => Date.now())
  const fetchedAtRef = useRef<number | null>(fetched?.result.ok ? fetched.result.value.fetchedAt.getTime() : null)

  const requestKey = `${locationKey}#${attempt}`
  const refetch = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    setFetched((prev) => {
      if (prev?.locationKey === locationKey) return prev
      const cached = readCachedWeather(locationKey)
      if (cached) {
        fetchedAtRef.current = cached.fetchedAt.getTime()
        return { requestKey: `${locationKey}#cache`, locationKey, result: ok(cached) }
      }
      fetchedAtRef.current = null
      return null
    })
  }, [locationKey])

  useEffect(() => {
    let cancelled = false
    void fetchCurrentWeather(location.latitude, location.longitude).then((result) => {
      if (cancelled) return
      if (result.ok) {
        fetchedAtRef.current = result.value.fetchedAt.getTime()
        writeCachedWeather(locationKey, result.value)
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
