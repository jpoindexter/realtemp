import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchCurrentWeather } from './open-meteo'

const validPayload = {
  utc_offset_seconds: 7200,
  current: {
    time: '2026-07-06T16:15',
    temperature_2m: 30.4,
    dew_point_2m: 19.8,
    wind_speed_10m: 2.3,
    uv_index: 7.5,
  },
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, status, json: async () => body })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchCurrentWeather', () => {
  it('parses a valid payload and derives the local hour', async () => {
    mockFetchOnce(validPayload)
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.airTempC).toBe(30.4)
    expect(r.value.localHour).toBe(16)
    expect(r.value.uvIndex).toBe(7.5)
  })

  it('requests wind in m/s explicitly (km/h default would corrupt the formula)', async () => {
    mockFetchOnce(validPayload)
    await fetchCurrentWeather(39.47, -0.376)
    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string
    expect(url).toContain('wind_speed_unit=ms')
    expect(url).toContain('timezone=auto')
  })

  it('normalizes missing optional fields to null instead of failing', async () => {
    const current: Record<string, unknown> = { ...validPayload.current, dew_point_2m: null }
    delete current.uv_index
    mockFetchOnce({ ...validPayload, current })
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.uvIndex).toBeNull()
    expect(r.value.dewPointC).toBeNull()
  })

  it('parses hourly arrays, dropping rows with no air temperature', async () => {
    const withHourly = {
      ...validPayload,
      hourly: {
        time: ['2026-07-07T01:00', '2026-07-07T02:00', '2026-07-07T03:00'],
        temperature_2m: [20, null, 22],
        dew_point_2m: [10, 11, null],
        wind_speed_10m: [2, 2, 2],
        uv_index: [0, 0, 0],
      },
    }
    mockFetchOnce(withHourly)
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.hourly).toHaveLength(2) // null-temp row dropped
    expect(r.value.hourly[1]).toEqual({
      timeIso: '2026-07-07T03:00',
      airTempC: 22,
      dewPointC: null,
      windSpeedMs: 2,
      uvIndex: 0,
    })
    expect(r.value.utcOffsetSeconds).toBe(7200)
    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string
    expect(url).toContain('forecast_hours=24')
  })

  it('returns a network error value on HTTP failure', async () => {
    mockFetchOnce({}, false, 503)
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.kind).toBe('network')
    expect(r.error.message).toContain('503')
  })

  it('returns a parse error value on shape drift', async () => {
    mockFetchOnce({ current: { time: 42 } })
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.kind).toBe('parse')
  })
})
