import { describe, expect, it } from 'vitest'

import { seriesFor } from './rules-routes'

const hourly = {
  time: ['2026-07-25T12:00', '2026-07-25T13:00'],
  temperature_2m: [30, 34],
  dew_point_2m: [18, 20],
  wind_speed_10m: [2, 3],
  uv_index: [7, 9],
}

describe('seriesFor', () => {
  it('returns the raw feed for terms Open-Meteo already provides', () => {
    expect(seriesFor('airTemp', hourly, 39.47, -0.38, 7200)).toEqual([30, 34])
    expect(seriesFor('dewPoint', hourly, 39.47, -0.38, 7200)).toEqual([18, 20])
    expect(seriesFor('uvIndex', hourly, 39.47, -0.38, 7200)).toEqual([7, 9])
  })

  it('computes trueFeel per hour through the real formula, not a copy', () => {
    const series = seriesFor('trueFeel', hourly, 39.47, -0.38, 7200)
    expect(series).toHaveLength(2)
    // hotter air with more sun must not produce a cooler True Feel
    expect(series[1]!).toBeGreaterThan(series[0]!)
    // and it must differ from the raw air temp, or the formula is not running
    expect(series[0]).not.toBe(30)
  })

  it('yields null for an hour with no air temperature rather than inventing one', () => {
    const gappy = { ...hourly, temperature_2m: [null, 34] }
    expect(seriesFor('trueFeel', gappy, 39.47, -0.38, 7200)[0]).toBeNull()
  })

  it('returns an empty series when the feed omits the field entirely', () => {
    expect(seriesFor('uvIndex', { time: [] }, 39.47, -0.38, 0)).toEqual([])
  })
})
