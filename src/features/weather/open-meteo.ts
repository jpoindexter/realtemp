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

const maybeNumberArray = z
  .array(z.number().nullable())
  .nullish()
  .transform((v) => v ?? [])

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
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: maybeNumberArray,
      dew_point_2m: maybeNumberArray,
      wind_speed_10m: maybeNumberArray,
      uv_index: maybeNumberArray,
    })
    .nullish()
    .transform((v) => v ?? null),
})

export interface HourlyPoint {
  timeIso: string
  airTempC: number
  dewPointC: number | null
  windSpeedMs: number | null
  uvIndex: number | null
}

export interface WeatherSnapshot {
  airTempC: number
  dewPointC: number | null
  windSpeedMs: number | null
  uvIndex: number | null
  localHour: number
  localTimeIso: string
  fetchedAt: Date
  utcOffsetSeconds: number
  /** Next 24 local hours; empty when the feed omits hourly data. */
  hourly: HourlyPoint[]
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
// wind_speed_unit=ms is load-bearing: the default is km/h and would silently corrupt the formula.
const CURRENT_FIELDS = 'temperature_2m,dew_point_2m,wind_speed_10m,uv_index'
const HOURLY_FIELDS = CURRENT_FIELDS
const FORECAST_HOURS = 24

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<Result<WeatherSnapshot, WeatherError>> {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${CURRENT_FIELDS}&hourly=${HOURLY_FIELDS}&forecast_hours=${FORECAST_HOURS}` +
    `&wind_speed_unit=ms&timezone=auto`

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

  const { current, hourly, utc_offset_seconds } = parsed.data
  const localHour = Number(current.time.slice(11, 13))
  return ok({
    airTempC: current.temperature_2m,
    dewPointC: current.dew_point_2m,
    windSpeedMs: current.wind_speed_10m,
    uvIndex: current.uv_index,
    localHour: Number.isFinite(localHour) ? localHour : new Date().getHours(),
    localTimeIso: current.time,
    fetchedAt: new Date(),
    utcOffsetSeconds: utc_offset_seconds,
    hourly: toHourlyPoints(hourly),
  })
}

type HourlyBlock = NonNullable<z.output<typeof currentResponseSchema>['hourly']>

/** Rows without an air temperature are dropped — every other field degrades per-premium. */
function toHourlyPoints(hourly: HourlyBlock | null): HourlyPoint[] {
  if (!hourly) return []
  return hourly.time.flatMap((timeIso, i) => {
    const airTempC = hourly.temperature_2m[i] ?? null
    if (airTempC === null) return []
    return [
      {
        timeIso,
        airTempC,
        dewPointC: hourly.dew_point_2m[i] ?? null,
        windSpeedMs: hourly.wind_speed_10m[i] ?? null,
        uvIndex: hourly.uv_index[i] ?? null,
      },
    ]
  })
}
