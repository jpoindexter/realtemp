import { z } from 'zod'

import { err, ok } from '@/lib/result'

import type { WeatherError } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

export interface Place {
  id: number
  name: string
  region: string
  latitude: number
  longitude: number
}

export interface StoredLocation {
  label: string
  latitude: number
  longitude: number
}

export const storedLocationSchema = z.object({
  label: z.string(),
  latitude: z.number(),
  longitude: z.number(),
})

const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
})

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchPlaces(query: string): Promise<Result<Place[], WeatherError>> {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`

  let payload: unknown
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return err({ kind: 'network', message: `City search answered ${response.status}. Try again.` })
    }
    payload = await response.json()
  } catch {
    return err({ kind: 'network', message: 'No connection for city search. Check network and retry.' })
  }

  const parsed = geocodingResponseSchema.safeParse(payload)
  if (!parsed.success) {
    return err({ kind: 'parse', message: 'City search returned an unexpected shape.' })
  }

  const places = (parsed.data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }))
  return ok(places)
}

/** Browser geolocation as a Result — denial or timeout is a value, not an exception. */
export function getGeolocation(): Promise<Result<StoredLocation, WeatherError>> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(err({ kind: 'network', message: 'No geolocation on this device — search for a city.' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve(
          ok({
            label: 'My location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        ),
      () => resolve(err({ kind: 'network', message: 'Location denied — search for a city instead.' })),
      { timeout: 8000, maximumAge: 600_000 },
    )
  })
}
