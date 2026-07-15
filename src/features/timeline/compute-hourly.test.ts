import { describe, expect, it } from 'vitest'

import { comfortWindows, computeHourlyTrueFeel } from './compute-hourly'

import type { Toggles } from '@/features/formula/types'
import type { HourlyPoint } from '@/features/weather/open-meteo'

const CTX = { utcOffsetSeconds: 7200, latitude: 39.47, longitude: -0.376, baseline14C: null }

const calmNight: Toggles = {
  exposure: 'shade',
  environment: 'open',
  activity: 'stagnant',
  acclimatization: 'local',
}

const hour = (timeIso: string, airTempC: number, dewPointC: number): HourlyPoint => ({
  timeIso,
  airTempC,
  dewPointC,
  relativeHumidityPct: null,
  windSpeedMs: 2,
  uvIndex: 0,
  precipitationMm: null,
  precipitationProbabilityPct: null,
  rainMm: null,
  showersMm: null,
  weatherCode: null,
  cloudCoverPct: null,
})

// Night hours + shade → solar 0; open/stagnant → env 0, activity 0. Deterministic.
const points: HourlyPoint[] = [
  hour('2026-07-07T01:00', 20, 10), // ≈ 19.2° comfortable
  hour('2026-07-07T02:00', 20, 10), // comfortable
  hour('2026-07-07T03:00', 35, 24), // ≈ 40.0° too hot
  hour('2026-07-07T04:00', 20, 10), // comfortable
]

describe('computeHourlyTrueFeel', () => {
  const result = computeHourlyTrueFeel(points, CTX, calmNight)

  it('applies the dashboard formula per hour — hand-checked values', () => {
    expect(result[0]?.trueFeelC).toBeCloseTo(19.2, 5) // 20 + 0.0 humidity − 0.8 wind
    expect(result[2]?.trueFeelC).toBeCloseTo(40.0, 5) // 35 + 5.8 − 0.8
  })

  it('flags comfort against the True Feel band, not air temp', () => {
    expect(result.map((p) => p.isComfort)).toEqual([true, true, false, true])
  })

  it('labels hours from the local ISO time', () => {
    expect(result[0]?.hourLabel).toBe('01:00')
  })
})

describe('comfortWindows', () => {
  it('collapses contiguous comfortable hours into ranges', () => {
    const result = computeHourlyTrueFeel(points, CTX, calmNight)
    expect(comfortWindows(result)).toEqual([
      { from: '01:00', to: '02:00' },
      { from: '04:00', to: '04:00' },
    ])
  })

  it('returns no windows when every hour is hostile', () => {
    const hot = computeHourlyTrueFeel(
      [hour('2026-07-07T03:00', 35, 24), hour('2026-07-07T04:00', 36, 24)],
      CTX,
      calmNight,
    )
    expect(comfortWindows(hot)).toEqual([])
  })
})
