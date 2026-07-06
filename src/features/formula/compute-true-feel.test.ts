import { describe, expect, it } from 'vitest'

import { computeTrueFeel, sweatEfficiencyPct, vaporPressureHpa } from './compute-true-feel'

import type { Toggles, WeatherInputs } from './types'

// Hand-computed fixture: e(20°C dew) = 6.105·exp(345.4/257.7) ≈ 23.323 hPa
const scorcher: WeatherInputs = {
  airTempC: 30,
  dewPointC: 20,
  windSpeedMs: 2, // street = 1.2 m/s
  uvIndex: 8,
  solarZenithDeg: 20,
  localHour: 16,
}
const streetDay: Toggles = { exposure: 'sun', environment: 'urban', activity: 'walking' }

const delta = (r: ReturnType<typeof computeTrueFeel>, id: string) =>
  r.deltas.find((d) => d.id === id)?.deltaC

describe('vaporPressureHpa', () => {
  it('matches hand-computed value at Td=20', () => {
    expect(vaporPressureHpa(20)).toBeCloseTo(23.323, 2)
  })
})

describe('computeTrueFeel — Valencia scorcher fixture', () => {
  const r = computeTrueFeel(scorcher, streetDay)

  it('computes each premium to hand-checked values', () => {
    expect(delta(r, 'humidity')).toBeCloseTo(3.7, 5) // 0.33·23.323 − 4
    expect(delta(r, 'wind')).toBeCloseTo(-0.8, 5) // −0.7·1.2
    expect(delta(r, 'solar')).toBeCloseTo(6.0, 5) // clamp(6.4)·cos20°
    expect(delta(r, 'environment')).toBe(2) // urban, 16h peak
    expect(delta(r, 'activity')).toBe(1) // walking, calm
  })

  it('totals 41.9 and the ledger sums exactly', () => {
    expect(r.trueFeelC).toBeCloseTo(41.9, 5)
    const sum = r.deltas.reduce((s, d) => s + d.deltaC, r.baseC)
    expect(r.trueFeelC).toBeCloseTo(sum, 5)
    expect(r.missing).toEqual([])
  })
})

describe('solar premium edge cases', () => {
  it('is zero at night even with a stale UV index', () => {
    const r = computeTrueFeel({ ...scorcher, solarZenithDeg: 120 }, streetDay)
    expect(delta(r, 'solar')).toBe(0)
  })

  it('is zero in shade and quartered under overcast', () => {
    const shade = computeTrueFeel(scorcher, { ...streetDay, exposure: 'shade' })
    const overcast = computeTrueFeel(scorcher, { ...streetDay, exposure: 'overcast' })
    expect(delta(shade, 'solar')).toBe(0)
    expect(delta(overcast, 'solar')).toBeCloseTo(1.5, 5) // 6.014·0.25
  })

  it('caps the premium at 8° before weighting', () => {
    const r = computeTrueFeel({ ...scorcher, uvIndex: 14, solarZenithDeg: 0 }, streetDay)
    expect(delta(r, 'solar')).toBe(8)
  })
})

describe('environment and activity', () => {
  it('urban drops to +1 off-peak, nature cools, open is neutral', () => {
    const late = computeTrueFeel({ ...scorcher, localHour: 23 }, streetDay)
    const nature = computeTrueFeel(scorcher, { ...streetDay, environment: 'nature' })
    const open = computeTrueFeel(scorcher, { ...streetDay, environment: 'open' })
    expect(delta(late, 'environment')).toBe(1)
    expect(delta(nature, 'environment')).toBe(-1)
    expect(delta(open, 'environment')).toBe(0)
  })

  it('halves activity heat above the convective wind threshold', () => {
    const windy = computeTrueFeel({ ...scorcher, windSpeedMs: 10 }, { ...streetDay, activity: 'active' })
    expect(delta(windy, 'activity')).toBeCloseTo(1.5, 5) // 3 halved, street wind 6 m/s
    expect(delta(windy, 'wind')).toBeCloseTo(-4.2, 5)
  })
})

describe('degraded inputs', () => {
  it('drops missing premiums into `missing` and never NaNs', () => {
    const r = computeTrueFeel(
      { ...scorcher, dewPointC: null, uvIndex: null, windSpeedMs: null },
      streetDay,
    )
    expect(r.missing.sort()).toEqual(['humidity', 'solar', 'wind'])
    expect(r.sweatEfficiencyPct).toBeNull()
    expect(Number.isFinite(r.trueFeelC)).toBe(true)
    expect(r.trueFeelC).toBeCloseTo(33, 5) // 30 + urban 2 + walking 1
  })

  it('skips wind-halving of activity when wind is unknown', () => {
    const r = computeTrueFeel({ ...scorcher, windSpeedMs: null }, { ...streetDay, activity: 'active' })
    expect(delta(r, 'activity')).toBe(3)
  })
})

describe('sweatEfficiencyPct', () => {
  it('is linear between the dew-point comfort bounds and clamped outside', () => {
    expect(sweatEfficiencyPct(5)).toBe(100)
    expect(sweatEfficiencyPct(10)).toBe(100)
    expect(sweatEfficiencyPct(18)).toBe(50)
    expect(sweatEfficiencyPct(26)).toBe(0)
    expect(sweatEfficiencyPct(30)).toBe(0)
  })
})
