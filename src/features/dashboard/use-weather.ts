import { useCallback, useEffect, useState } from 'react'

import { fetchCurrentWeather } from '@/features/weather/open-meteo'

import type { StoredLocation } from '@/features/location/geocoding'
import type { WeatherError, WeatherSnapshot } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

export type WeatherState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: WeatherSnapshot }

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

  const key = `${location.latitude},${location.longitude}#${attempt}`
  const refetch = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    void fetchCurrentWeather(location.latitude, location.longitude).then((result) => {
      if (!cancelled) setFetched({ key, result })
    })
    return () => {
      cancelled = true
    }
  }, [key, location.latitude, location.longitude])

  if (fetched?.key !== key) return [{ status: 'loading' }, refetch]
  if (!fetched.result.ok) return [{ status: 'error', message: fetched.result.error.message }, refetch]
  return [{ status: 'ready', snapshot: fetched.result.value }, refetch]
}
