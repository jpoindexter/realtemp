import { z } from 'zod'

import { err, ok } from '@/lib/result'

import type { Result } from '@/lib/result'

export interface WeatherError {
  kind: 'network' | 'parse'
  message: string
}

/** A field the feed may omit or null — normalized to null, never undefined. */
const maybeNumber = z
  .number()
  .nullish()
  .transform((v) => v ?? null)

const currentResponseSchema = z.object({
  utc_offset_seconds: z.number(),
  current: z.object({
    /** Local ISO time, e.g. "2026-07-06T16:15" (timezone=auto). */
    time: z.string(),
    temperature_2m: z.number(),
    dew_point_2m: maybeNumber,
    wind_speed_10m: maybeNumber,
    uv_index: maybeNumber,
  }),
})

export interface WeatherSnapshot {
  airTempC: number
  dewPointC: number | null
  windSpeedMs: number | null
  uvIndex: number | null
  localHour: number
  localTimeIso: string
  fetchedAt: Date
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
// wind_speed_unit=ms is load-bearing: the default is km/h and would silently corrupt the formula.
const CURRENT_FIELDS = 'temperature_2m,dew_point_2m,wind_speed_10m,uv_index'

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<Result<WeatherSnapshot, WeatherError>> {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${CURRENT_FIELDS}&wind_speed_unit=ms&timezone=auto`

  let payload: unknown
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return err({ kind: 'network', message: `Open-Meteo answered ${response.status}. Try again.` })
    }
    payload = await response.json()
  } catch {
    return err({ kind: 'network', message: 'No connection to Open-Meteo. Check network and retry.' })
  }

  const parsed = currentResponseSchema.safeParse(payload)
  if (!parsed.success) {
    return err({ kind: 'parse', message: 'Open-Meteo returned an unexpected shape.' })
  }

  const { current } = parsed.data
  const localHour = Number(current.time.slice(11, 13))
  return ok({
    airTempC: current.temperature_2m,
    dewPointC: current.dew_point_2m,
    windSpeedMs: current.wind_speed_10m,
    uvIndex: current.uv_index,
    localHour: Number.isFinite(localHour) ? localHour : new Date().getHours(),
    localTimeIso: current.time,
    fetchedAt: new Date(),
  })
}
