import { afterEach, describe, expect, it, vi } from 'vitest'

import { aqiBand, aqiLabel, fetchAirQuality } from './air-quality'

afterEach(() => {
  vi.unstubAllGlobals()
})

const payload = {
  utc_offset_seconds: 7200,
  current: { time: '2026-07-25T17:00', european_aqi: 45, pm2_5: 4.5, pm10: 6.8 },
}

const stubFetch = (body: unknown, ok = true, status = 200) =>
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status, json: async () => body })))

describe('aqiBand', () => {
  // CAMS European AQI bands, upper-bound exclusive except the last
  it('maps each official band boundary', () => {
    expect(aqiBand(0)).toBe('good')
    expect(aqiBand(19.9)).toBe('good')
    expect(aqiBand(20)).toBe('fair')
    expect(aqiBand(40)).toBe('moderate')
    expect(aqiBand(60)).toBe('poor')
    expect(aqiBand(80)).toBe('very-poor')
    expect(aqiBand(100)).toBe('extremely-poor')
    expect(aqiBand(250)).toBe('extremely-poor')
  })

  it('returns null for a missing reading rather than guessing good', () => {
    expect(aqiBand(null)).toBeNull()
  })
})

describe('aqiLabel', () => {
  it('reads as words, because a bare number means nothing to most people', () => {
    expect(aqiLabel('good')).toBe('Good')
    expect(aqiLabel('very-poor')).toBe('Very poor')
    expect(aqiLabel(null)).toBe('--')
  })
})

describe('fetchAirQuality', () => {
  it('returns the parsed reading with its band', async () => {
    stubFetch(payload)
    const r = await fetchAirQuality(39.47, -0.38)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.europeanAqi).toBe(45)
    expect(r.value.pm25).toBe(4.5)
    expect(r.value.band).toBe('moderate')
  })

  it('degrades to nulls when the feed omits fields, instead of failing the screen', async () => {
    stubFetch({ utc_offset_seconds: 0, current: { time: '2026-07-25T17:00' } })
    const r = await fetchAirQuality(39.47, -0.38)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.europeanAqi).toBeNull()
    expect(r.value.band).toBeNull()
  })

  it('returns a network error as a value, never throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const r = await fetchAirQuality(39.47, -0.38)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.kind).toBe('network')
  })

  it('reports a non-OK response as a network error', async () => {
    stubFetch({}, false, 503)
    const r = await fetchAirQuality(39.47, -0.38)
    expect(r.ok).toBe(false)
  })

  it('requests the air-quality host, not the forecast host', async () => {
    const seen: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        seen.push(input)
        return { ok: true, status: 200, json: async () => payload }
      }),
    )
    await fetchAirQuality(39.47, -0.38)
    const url = seen[0] ?? ''
    expect(url).toContain('air-quality-api.open-meteo.com')
    expect(url).toContain('european_aqi')
  })
})
