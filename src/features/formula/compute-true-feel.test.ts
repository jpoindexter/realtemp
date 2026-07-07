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
const streetDay: Toggles = {
  exposure: 'sun',
  environment: 'urban',
  activity: 'walking',
  acclimatization: 'local',
}

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
  it('is zero at night even with a stale UV index, and flags isNight', () => {
    const r = computeTrueFeel({ ...scorcher, solarZenithDeg: 120 }, streetDay)
    expect(delta(r, 'solar')).toBe(0)
    expect(r.isNight).toBe(true)
    expect(computeTrueFeel(scorcher, streetDay).isNight).toBe(false)
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

describe('cold-weather wind (JAG/TI blend)', () => {
  const winterNight: WeatherInputs = {
    airTempC: 0,
    dewPointC: -5,
    windSpeedMs: 5, // 18 km/h at 10 m
    uvIndex: 0,
    solarZenithDeg: 120,
    localHour: 22,
  }

  it('uses pure wind chill at 0°C — hand-computed WCT delta', () => {
    // WCT = 13.12 − 11.37·18^0.16 = −4.936 → delta −4.9
    const r = computeTrueFeel(winterNight, streetDay)
    expect(delta(r, 'wind')).toBeCloseTo(-4.9, 5)
  })

  it('blends 50/50 at 12.5°C', () => {
    // warm −0.7·3 = −2.1 · cold WCT(12.5, 18 km/h) − 12.5 = −1.796 → −1.948 → −1.9
    const r = computeTrueFeel({ ...winterNight, airTempC: 12.5 }, streetDay)
    expect(delta(r, 'wind')).toBeCloseTo(-1.9, 5)
  })

  it('falls back to the Steadman term under the 4.8 km/h validity floor', () => {
    const r = computeTrueFeel({ ...winterNight, windSpeedMs: 1 }, streetDay) // 3.6 km/h
    expect(delta(r, 'wind')).toBeCloseTo(-0.4, 5) // −0.7·0.6
  })

  it('keeps the warm path untouched at 30°C (scorcher regression)', () => {
    const r = computeTrueFeel(scorcher, streetDay)
    expect(delta(r, 'wind')).toBeCloseTo(-0.8, 5)
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

describe('acclimatization + weather shock', () => {
  const heatwave = { ...scorcher, airTempC: 36, baseline14C: 26 } // +10° over the local norm

  it('a newcomer feels a clamped share of the deviation from the baseline', () => {
    const r = computeTrueFeel(heatwave, { ...streetDay, acclimatization: 'new' })
    expect(delta(r, 'acclimatization')).toBe(3) // 10 × 0.3 = 3, at the clamp
    const s = computeTrueFeel(heatwave, { ...streetDay, acclimatization: 'settling' })
    expect(delta(s, 'acclimatization')).toBeCloseTo(1.5, 5)
  })

  it('locals get no row at all — zero-noise default', () => {
    const r = computeTrueFeel(heatwave, streetDay)
    expect(delta(r, 'acclimatization')).toBeUndefined()
    expect(r.missing).not.toContain('acclimatization')
  })

  it('flags weather shock at ≥8° off baseline, both directions', () => {
    expect(computeTrueFeel(heatwave, streetDay).isWeatherShock).toBe(true)
    expect(computeTrueFeel({ ...heatwave, airTempC: 30 }, streetDay).isWeatherShock).toBe(false)
    expect(computeTrueFeel({ ...heatwave, airTempC: 17 }, streetDay).isWeatherShock).toBe(true)
  })

  it('degrades to missing when opted in but the baseline is unavailable', () => {
    const r = computeTrueFeel({ ...scorcher, baseline14C: null }, { ...streetDay, acclimatization: 'new' })
    expect(delta(r, 'acclimatization')).toBeUndefined()
    expect(r.missing).toContain('acclimatization')
  })
})

describe('bio-calibration', () => {
  const bio = { heightCm: 180, weightKg: 90, metabolic: 'high', clothing: 'warm' } as const
  // BMI 27.78 → (5.78 × 0.1) = 0.578, thermal sign +1 at 30°C

  it('adds body and clothing rows in heat — hand-checked', () => {
    const r = computeTrueFeel(scorcher, streetDay, bio)
    expect(delta(r, 'body')).toBeCloseTo(1.1, 5) // 0.578 + 0.5 metabolic
    expect(delta(r, 'clothing')).toBeCloseTo(1.5, 5) // warm layers in heat
  })

  it('flips the mass sign in cold — insulation, not burden', () => {
    const cold = { ...scorcher, airTempC: 0 }
    const r = computeTrueFeel(cold, streetDay, bio)
    expect(delta(r, 'body')).toBeCloseTo(-0.1, 5) // −0.578 + 0.5
    expect(delta(r, 'clothing')).toBeCloseTo(2, 5) // warm layers help at 0°C
  })

  it('produces no rows without a profile or with the zero-effect default', () => {
    const none = computeTrueFeel(scorcher, streetDay)
    const defaults = computeTrueFeel(scorcher, streetDay, {
      heightCm: null,
      weightKg: null,
      metabolic: 'normal',
      clothing: 'normal',
    })
    expect(delta(none, 'body')).toBeUndefined()
    expect(delta(defaults, 'body')).toBeUndefined()
    expect(delta(defaults, 'clothing')).toBeUndefined()
  })

  it('keeps the ledger-sum invariant with bio rows present', () => {
    const r = computeTrueFeel(scorcher, streetDay, bio)
    const sum = r.deltas.reduce((s, d) => s + d.deltaC, r.baseC)
    expect(r.trueFeelC).toBeCloseTo(sum, 5)
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
