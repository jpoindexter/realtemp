import { z } from 'zod'

import { BASELINE_DAYS } from '@/features/formula/constants'
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
    relative_humidity_2m: maybeNumber,
    wind_speed_10m: maybeNumber,
    uv_index: maybeNumber,
    precipitation: maybeNumber,
    rain: maybeNumber,
    showers: maybeNumber,
    weather_code: maybeNumber,
    cloud_cover: maybeNumber,
  }),
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: maybeNumberArray,
      dew_point_2m: maybeNumberArray,
      relative_humidity_2m: maybeNumberArray,
      wind_speed_10m: maybeNumberArray,
      uv_index: maybeNumberArray,
      precipitation_probability: maybeNumberArray,
      precipitation: maybeNumberArray,
      rain: maybeNumberArray,
      showers: maybeNumberArray,
      weather_code: maybeNumberArray,
      cloud_cover: maybeNumberArray,
    })
    .nullish()
    .transform((v) => v ?? null),
})

export interface HourlyPoint {
  timeIso: string
  airTempC: number
  dewPointC: number | null
  relativeHumidityPct: number | null
  windSpeedMs: number | null
  uvIndex: number | null
  precipitationMm: number | null
  precipitationProbabilityPct: number | null
  rainMm: number | null
  showersMm: number | null
  weatherCode: number | null
  cloudCoverPct: number | null
}

export interface WeatherSnapshot {
  airTempC: number
  dewPointC: number | null
  relativeHumidityPct: number | null
  windSpeedMs: number | null
  uvIndex: number | null
  precipitationMm: number | null
  rainMm: number | null
  showersMm: number | null
  weatherCode: number | null
  cloudCoverPct: number | null
  localHour: number
  localTimeIso: string
  fetchedAt: Date
  utcOffsetSeconds: number
  /** Next 24 local hours; empty when the feed omits hourly data. */
  hourly: HourlyPoint[]
  /** Mean of the past 14 daily-mean temps; null when unavailable (degrades acclimatization). */
  baseline14C: number | null
}

const dailyResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_mean: z.array(z.number().nullable()),
  }),
})

/** Past-14-day mean; today's entry (last) is excluded. Failure is a null, never an error. */
async function fetchBaseline14(latitude: number, longitude: number): Promise<number | null> {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_mean&past_days=${BASELINE_DAYS}&forecast_days=1&timezone=auto`
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const parsed = dailyResponseSchema.safeParse(await response.json())
    if (!parsed.success) return null
    const past = parsed.data.daily.temperature_2m_mean.slice(0, -1).filter((v): v is number => v !== null)
    if (past.length === 0) return null
    return past.reduce((s, v) => s + v, 0) / past.length
  } catch {
    return null
  }
}

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
// wind_speed_unit=ms is load-bearing: the default is km/h and would silently corrupt the formula.
const CURRENT_FIELDS =
  'temperature_2m,dew_point_2m,relative_humidity_2m,wind_speed_10m,uv_index,precipitation,rain,showers,weather_code,cloud_cover'
const HOURLY_FIELDS =
  `${CURRENT_FIELDS},precipitation_probability`
const FORECAST_HOURS = 24
const FETCH_ATTEMPTS = 3
const RETRY_DELAYS_MS = [300, 900]

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Open-Meteo occasionally 5xx's for a moment; an error page without CORS
 * headers reads in the browser as a generic "blocked by CORS policy" rather
 * than the real transient failure. A couple of quick retries absorb that
 * before the user ever sees an error screen.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (e) {
      lastError = e
    }
    if (attempt < RETRY_DELAYS_MS.length) await wait(RETRY_DELAYS_MS[attempt]!)
  }
  throw lastError
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<Result<WeatherSnapshot, WeatherError>> {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${CURRENT_FIELDS}&hourly=${HOURLY_FIELDS}&forecast_hours=${FORECAST_HOURS}` +
    `&wind_speed_unit=ms&timezone=auto`

  let payload: unknown
  let baseline14C: number | null
  try {
    const [response, baseline] = await Promise.all([fetchWithRetry(url), fetchBaseline14(latitude, longitude)])
    payload = await response.json()
    baseline14C = baseline
  } catch {
    return err({ kind: 'network', message: 'Weather data is momentarily unreachable. Tap retry — it usually clears in seconds.' })
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
    relativeHumidityPct: current.relative_humidity_2m,
    windSpeedMs: current.wind_speed_10m,
    uvIndex: current.uv_index,
    precipitationMm: current.precipitation,
    rainMm: current.rain,
    showersMm: current.showers,
    weatherCode: current.weather_code,
    cloudCoverPct: current.cloud_cover,
    localHour: Number.isFinite(localHour) ? localHour : new Date().getHours(),
    localTimeIso: current.time,
    fetchedAt: new Date(),
    utcOffsetSeconds: utc_offset_seconds,
    hourly: toHourlyPoints(hourly),
    baseline14C,
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
        relativeHumidityPct: hourly.relative_humidity_2m[i] ?? null,
        windSpeedMs: hourly.wind_speed_10m[i] ?? null,
        uvIndex: hourly.uv_index[i] ?? null,
        precipitationMm: hourly.precipitation[i] ?? null,
        precipitationProbabilityPct: hourly.precipitation_probability[i] ?? null,
        rainMm: hourly.rain[i] ?? null,
        showersMm: hourly.showers[i] ?? null,
        weatherCode: hourly.weather_code[i] ?? null,
        cloudCoverPct: hourly.cloud_cover[i] ?? null,
      },
    ]
  })
}
