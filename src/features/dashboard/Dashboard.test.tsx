import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/heatmap/ShadeMap', () => ({
  ShadeMap: () => (
    <section className="body-panel" aria-labelledby="shade-map-title">
      <h2 id="shade-map-title">Shade nearby · beta</h2>
    </section>
  ),
}))

vi.mock('@/features/radar/RadarMap', () => ({
  RadarMap: () => (
    <section className="body-panel" aria-labelledby="radar-title">
      <h2 id="radar-title">Radar near you</h2>
    </section>
  ),
}))

import { Dashboard } from './Dashboard'

const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }

const payload = {
  utc_offset_seconds: 7200,
  current: {
    time: '2026-07-06T16:15',
    temperature_2m: 30,
    dew_point_2m: 20,
    relative_humidity_2m: 58,
    wind_speed_10m: 2,
    uv_index: 8,
    precipitation: 0.2,
    rain: 0.1,
    showers: 0.1,
    weather_code: 61,
    cloud_cover: 74,
  },
  hourly: {
    time: ['2026-07-06T17:00', '2026-07-06T18:00', '2026-07-06T19:00'],
    temperature_2m: [31, 30, 29],
    dew_point_2m: [20, 20, 19],
    relative_humidity_2m: [55, 58, 60],
    wind_speed_10m: [2, 2.5, 3],
    uv_index: [7, 5, 2],
    precipitation_probability: [20, 40, 60],
    precipitation: [0, 0.2, 0.6],
    rain: [0, 0.2, 0.6],
    showers: [0, 0, 0.2],
    weather_code: [2, 61, 80],
    cloud_cover: [40, 70, 90],
  },
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderDashboard(overrides: Partial<Parameters<typeof Dashboard>[0]> = {}) {
  return render(
    <Dashboard
      location={valencia}
      unit="c"
      onSetUnit={() => {}}
      onChangeLocation={() => {}}
      onOpenSettings={() => {}}
      onOpenAbout={() => {}}
      theme="light"
      onToggleTheme={() => {}}
      {...overrides}
    />,
  )
}

describe('Dashboard', () => {
  it('paints the last good reading immediately on warm launch while refreshing', async () => {
    localStorage.setItem(
      'realtemp:weather:39.47,-0.376',
      JSON.stringify({
        version: 2,
        snapshot: {
          airTempC: 30,
          dewPointC: 20,
          windSpeedMs: 2,
          uvIndex: 8,
          localHour: 16,
          localTimeIso: '2026-07-06T16:15',
          fetchedAt: '2026-07-06T14:15:00.000Z',
          utcOffsetSeconds: 7200,
          hourly: [],
          baseline14C: null,
        },
      }),
    )
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    renderDashboard()

    expect(screen.getByText('true feel')).toBeDefined()
    expect(screen.getByText('humidity friction')).toBeDefined()
    await waitFor(() => expect(screen.getByText(/updating/i)).toBeDefined())
  })

  it('ignores old cached weather so installs do not keep pre-fix readings', async () => {
    localStorage.setItem(
      'realtemp:weather:39.47,-0.376',
      JSON.stringify({
        version: 1,
        snapshot: {
          airTempC: 24,
          dewPointC: 20,
          windSpeedMs: 2,
          uvIndex: 8,
          localHour: 16,
          localTimeIso: '2026-07-06T16:15',
          fetchedAt: '2026-07-06T14:15:00.000Z',
          utcOffsetSeconds: 7200,
          hourly: [],
          baseline14C: null,
        },
      }),
    )
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))

    renderDashboard()

    expect(screen.getByText(/reading the street/i)).toBeDefined()
    await waitFor(() => expect(screen.getByText(/air says 30.0°/i)).toBeDefined())
    expect(screen.queryByText(/air says 24.0°/i)).toBeNull()
  })

  it(
    'renders hero data and separates longer controls into tabs',
    async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
      renderDashboard()

      await waitFor(() => expect(screen.getAllByText(/true feel/i).length).toBeGreaterThan(0))
      // base + humidity + wind + solar(zenith-dependent) + urban 2 + walking 1 — assert structure, not zenith
      expect(screen.getByText('base air')).toBeDefined()
      expect(screen.getByText('humidity friction')).toBeDefined()
      expect(screen.getByText(/sun premium/)).toBeDefined() // regex: label gains '· night' after dark
      expect(screen.getByRole('heading', { name: /current weather factors/i })).toBeDefined()
      expect(screen.getAllByText('rain').length).toBeGreaterThan(0)
      expect(screen.getByText('74%')).toBeDefined()
      expect(screen.getAllByText('0.2 mm').length).toBeGreaterThan(0)
      expect(screen.getAllByRole('tab')).toHaveLength(4)
      expect(screen.getByRole('tab', { name: 'Now', selected: true })).toBeDefined()

      fireEvent.click(screen.getByRole('tab', { name: 'Forecast' }))
      expect(screen.getByRole('tab', { name: 'Forecast', selected: true })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Next 24 h + sweat' })).toBeDefined()
      expect(screen.getByLabelText(/next hours forecast/i)).toBeDefined()
      expect(screen.getByText('40% rain')).toBeDefined()
      expect(screen.getByRole('meter', { name: /sweat efficiency/i })).toBeDefined()
      expect(screen.queryByRole('heading', { name: /radar near you/i })).toBeNull()

      fireEvent.click(screen.getByRole('tab', { name: 'Maps' }))
      expect(screen.getByRole('tab', { name: 'Maps', selected: true })).toBeDefined()
      expect(screen.getByRole('heading', { name: /radar near you/i })).toBeDefined()
      expect(screen.getByRole('heading', { name: /shade nearby/i })).toBeDefined()

      fireEvent.click(screen.getByRole('tab', { name: 'Tune' }))
      expect(screen.getByRole('tab', { name: 'Tune', selected: true })).toBeDefined()
      expect(screen.getAllByRole('radio')).toHaveLength(18)
      expect(screen.getByRole('heading', { name: 'Acclimatization' })).toBeDefined()
      expect(screen.getByRole('heading', { name: /your body/i })).toBeDefined()
      expect(screen.queryByText(/partial data/i)).toBeNull()
    },
    20_000,
  )

  it('exposes settings and about as separate, labeled controls (not folded together)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
    renderDashboard()

    await waitFor(() => expect(screen.getByRole('button', { name: /settings/i })).toBeDefined())
    expect(screen.getByRole('button', { name: /how this works/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /refresh weather reading/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeDefined()
  })

  it('lets the user force-refresh the reading when comparing web and native app', async () => {
    let mainCallCount = 0
    const refreshed = { ...payload, current: { ...payload.current, time: '2026-07-06T16:30', temperature_2m: 36 } }
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('daily=')) return { ok: true, status: 200, json: async () => ({ daily: { time: [], temperature_2m_mean: [] } }) }
      mainCallCount++
      return { ok: true, status: 200, json: async () => (mainCallCount === 1 ? payload : refreshed) }
    })
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    await waitFor(() => expect(screen.getByText(/air says 30.0°/i)).toBeDefined())
    fireEvent.click(screen.getByRole('button', { name: /refresh weather reading/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    await waitFor(() => expect(screen.getByText(/air says 36.0°/i)).toBeDefined())
  })

  it('uses a separate theme button instead of folding theme into settings', async () => {
    const onOpenSettings = vi.fn()
    const onToggleTheme = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
    renderDashboard({ onOpenSettings, onToggleTheme })

    await waitFor(() => expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeDefined())
    screen.getByRole('button', { name: /switch to dark mode/i }).click()
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
    expect(onOpenSettings).not.toHaveBeenCalled()

    screen.getByRole('button', { name: /settings/i }).click()
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('shows the partial-data badge when the feed drops fields', async () => {
    const degraded = { ...payload, current: { ...payload.current, uv_index: null, dew_point_2m: null } }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => degraded })))
    renderDashboard()

    await waitFor(() => expect(screen.getByText(/partial data/i)).toBeDefined())
    expect(screen.queryByText(/sun premium/)).toBeNull()
  })

  it('marks the reading stale past TTL and refetches on visibility, WITHOUT blanking the dashboard mid-refresh', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const hung: { resolve: ((v: unknown) => void) | null } = { resolve: null }
    let mainCallCount = 0
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('daily=')) return { ok: true, status: 200, json: async () => ({ daily: { time: [], temperature_2m_mean: [] } }) }
      mainCallCount++
      if (mainCallCount === 1) return { ok: true, status: 200, json: async () => payload } // initial load
      // the refetch's main current-weather call hangs until released below
      return new Promise((resolve) => {
        hung.resolve = resolve
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    await waitFor(() => expect(screen.getByText(/live/)).toBeDefined())
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.setSystemTime(Date.now() + 11 * 60_000) // past the 10-min TTL
    document.dispatchEvent(new Event('visibilitychange'))
    // Both the refetch's main and baseline calls are recorded synchronously
    // (call count jumps 2→4) even though the main one hangs on its promise.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))

    // The refetch is now in flight (hung on the unresolved promise) — the
    // previously-loaded dashboard must still be fully rendered, not blanked
    // to a loading screen. This is the exact bug: a background refresh used
    // to discard perfectly good data the instant it started refetching.
    expect(screen.getAllByText('true feel').length).toBeGreaterThan(0)
    expect(screen.getByText(/updating/i)).toBeDefined()

    hung.resolve?.({ ok: true, status: 200, json: async () => payload })
    await waitFor(() => expect(screen.getByText(/live/)).toBeDefined())
    expect(screen.queryByText(/updating/i)).toBeNull()
    vi.useRealTimers()
  })

  it('auto-refreshes when an open dashboard crosses the stale TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    let mainCallCount = 0
    const refreshed = { ...payload, current: { ...payload.current, time: '2026-07-06T16:30', temperature_2m: 36 } }
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('daily=')) return { ok: true, status: 200, json: async () => ({ daily: { time: [], temperature_2m_mean: [] } }) }
      mainCallCount++
      return { ok: true, status: 200, json: async () => (mainCallCount === 1 ? payload : refreshed) }
    })
    vi.stubGlobal('fetch', fetchMock)
    renderDashboard()

    await waitFor(() => expect(screen.getByText(/live/)).toBeDefined())
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.setSystemTime(Date.now() + 11 * 60_000)
    act(() => vi.advanceTimersByTime(60_000))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    await waitFor(() => expect(screen.getByText(/air says 36.0°/i)).toBeDefined())
    vi.useRealTimers()
  })

  it(
    'surfaces fetch failure with a retry action',
    async () => {
      // Real timers deliberately: the adapter's retry backoff (~1.2s) fights
      // fake-timer interplay with the dashboard's own stale-check interval.
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))
      renderDashboard()

      await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeDefined(), { timeout: 4000 })
      expect(screen.getByText(/momentarily unreachable/i)).toBeDefined()
    },
    6000,
  )
})
