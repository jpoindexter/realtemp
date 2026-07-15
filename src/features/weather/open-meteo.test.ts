import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchCurrentWeather } from './open-meteo'

const validPayload = {
  utc_offset_seconds: 7200,
  current: {
    time: '2026-07-06T16:15',
    temperature_2m: 30.4,
    dew_point_2m: 19.8,
    relative_humidity_2m: 58,
    wind_speed_10m: 2.3,
    uv_index: 7.5,
    precipitation: 0.2,
    rain: 0.1,
    showers: 0.1,
    weather_code: 61,
    cloud_cover: 74,
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
    expect(r.value.relativeHumidityPct).toBe(58)
    expect(r.value.precipitationMm).toBe(0.2)
    expect(r.value.rainMm).toBe(0.1)
    expect(r.value.showersMm).toBe(0.1)
    expect(r.value.weatherCode).toBe(61)
    expect(r.value.cloudCoverPct).toBe(74)
  })

  it('requests wind in m/s explicitly and includes sky/rain/humidity fields', async () => {
    mockFetchOnce(validPayload)
    await fetchCurrentWeather(39.47, -0.376)
    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string
    expect(url).toContain('wind_speed_unit=ms')
    expect(url).toContain('timezone=auto')
    expect(url).toContain('relative_humidity_2m')
    expect(url).toContain('precipitation')
    expect(url).toContain('precipitation_probability')
    expect(url).toContain('weather_code')
    expect(url).toContain('cloud_cover')
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
        relative_humidity_2m: [50, 55, 60],
        wind_speed_10m: [2, 2, 2],
        uv_index: [0, 0, 0],
        precipitation_probability: [10, 20, 30],
        precipitation: [0, 0.1, 0.2],
        rain: [0, 0.1, 0.2],
        showers: [0, 0, 0.1],
        weather_code: [0, 2, 61],
        cloud_cover: [5, 50, 90],
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
      relativeHumidityPct: 60,
      windSpeedMs: 2,
      uvIndex: 0,
      precipitationMm: 0.2,
      precipitationProbabilityPct: 30,
      rainMm: 0.2,
      showersMm: 0.1,
      weatherCode: 61,
      cloudCoverPct: 90,
    })
    expect(r.value.utcOffsetSeconds).toBe(7200)
    const url = vi.mocked(fetch).mock.calls[0]?.[0] as string
    expect(url).toContain('forecast_hours=24')
  })

  it('computes the 14-day baseline excluding today', async () => {
    const daily = {
      time: Array.from({ length: 15 }, (_, i) => `2026-06-${23 + i}`),
      temperature_2m_mean: [...Array.from({ length: 14 }, () => 20), 99], // today's 99 must not count
    }
    mockFetchOnce({ ...validPayload, daily })
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.baseline14C).toBe(20)
  })

  it('degrades baseline to null when the daily block is absent', async () => {
    mockFetchOnce(validPayload)
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.baseline14C).toBeNull()
  })

  it('returns a network error value once retries are exhausted', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    )
    const pending = fetchCurrentWeather(39.47, -0.376)
    await vi.runAllTimersAsync()
    const r = await pending
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.kind).toBe('network')
    // Main URL retried 3x; the baseline call (separate, non-retrying) adds a 4th.
    expect(vi.mocked(fetch).mock.calls.length).toBe(4)
    vi.useRealTimers()
  })

  it('recovers transparently when Open-Meteo blips then succeeds — the actual production bug', async () => {
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('daily=')) return { ok: true, status: 200, json: async () => ({ daily: { time: [], temperature_2m_mean: [] } }) }
      calls++
      if (calls < 3) return { ok: false, status: 502, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => validPayload }
    }))
    const pending = fetchCurrentWeather(39.47, -0.376)
    await vi.runAllTimersAsync()
    const r = await pending
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.airTempC).toBe(30.4)
    expect(calls).toBe(3)
    vi.useRealTimers()
  })

  it('returns a parse error value on shape drift', async () => {
    mockFetchOnce({ current: { time: 42 } })
    const r = await fetchCurrentWeather(39.47, -0.376)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.kind).toBe('parse')
  })
})
