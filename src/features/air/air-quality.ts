import { z } from 'zod'

import { err, ok } from '@/lib/result'

import type { WeatherError } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

/**
 * European AQI from Open-Meteo's air-quality host (separate from the forecast
 * host, same free non-commercial terms, no key).
 *
 * Zod-fenced like every other adapter: a missing field degrades to null rather
 * than failing the screen, and errors come back as values.
 */

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

/** CAMS European AQI bands. Lower bound inclusive; the top band is unbounded. */
const BANDS = [
  { max: 20, band: 'good' },
  { max: 40, band: 'fair' },
  { max: 60, band: 'moderate' },
  { max: 80, band: 'poor' },
  { max: 100, band: 'very-poor' },
] as const

export type AqiBand = (typeof BANDS)[number]['band'] | 'extremely-poor'

const BAND_LABEL: Record<AqiBand, string> = {
  good: 'Good',
  fair: 'Fair',
  moderate: 'Moderate',
  poor: 'Poor',
  'very-poor': 'Very poor',
  'extremely-poor': 'Extremely poor',
}

export interface AirQuality {
  europeanAqi: number | null
  pm25: number | null
  pm10: number | null
  band: AqiBand | null
}

const maybeNumber = z
  .number()
  .nullish()
  .transform((v) => v ?? null)

const responseSchema = z.object({
  current: z.object({
    time: z.string(),
    european_aqi: maybeNumber,
    pm2_5: maybeNumber,
    pm10: maybeNumber,
  }),
})

/** null in, null out — an absent reading must never render as "Good". */
export function aqiBand(aqi: number | null): AqiBand | null {
  if (aqi === null || !Number.isFinite(aqi)) return null
  return BANDS.find((b) => aqi < b.max)?.band ?? 'extremely-poor'
}

export function aqiLabel(band: AqiBand | null): string {
  return band === null ? '--' : BAND_LABEL[band]
}

export async function fetchAirQuality(
  latitude: number,
  longitude: number,
): Promise<Result<AirQuality, WeatherError>> {
  const url = `${AIR_QUALITY_URL}?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm2_5,pm10&timezone=auto`

  const response = await fetch(url).catch(() => null)
  if (!response || !response.ok) {
    return err({ kind: 'network', message: 'Air quality is unreachable right now.' })
  }

  const parsed = responseSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    return err({ kind: 'parse', message: 'Air quality came back in a shape we do not recognise.' })
  }

  const { european_aqi, pm2_5, pm10 } = parsed.data.current
  return ok({ europeanAqi: european_aqi, pm25: pm2_5, pm10, band: aqiBand(european_aqi) })
}
