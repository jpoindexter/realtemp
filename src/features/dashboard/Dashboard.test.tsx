import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/heatmap/ShadeMap', () => ({
  ShadeMap: () => (
    <section className="body-panel" aria-labelledby="shade-map-title">
      <h2 id="shade-map-title">Shade nearby · beta</h2>
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
    wind_speed_10m: 2,
    uv_index: 8,
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
        version: 1,
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

  it(
    'renders hero, a summing ledger, all toggles and the gauge from live data',
    async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
      renderDashboard()

      await waitFor(() => expect(screen.getAllByText(/true feel/i).length).toBeGreaterThan(0))
      // base + humidity + wind + solar(zenith-dependent) + urban 2 + walking 1 — assert structure, not zenith
      expect(screen.getByText('base air')).toBeDefined()
      expect(screen.getByText('humidity friction')).toBeDefined()
      expect(screen.getByText(/sun premium/)).toBeDefined() // regex: label gains '· night' after dark
      expect(screen.getAllByRole('radio')).toHaveLength(18)
      expect(screen.getByRole('heading', { name: 'Next 24 h + sweat' })).toBeDefined()
      expect(screen.getByRole('heading', { name: 'Acclimatization' })).toBeDefined()
      expect(screen.getByRole('heading', { name: /your body/i })).toBeDefined()
      expect(screen.getByRole('meter', { name: /sweat efficiency/i })).toBeDefined()
      expect(screen.queryByText(/partial data/i)).toBeNull()
    },
    10_000,
  )

  it('exposes settings and about as separate, labeled controls (not folded together)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
    renderDashboard()

    await waitFor(() => expect(screen.getByRole('button', { name: /settings/i })).toBeDefined())
    expect(screen.getByRole('button', { name: /how this works/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeDefined()
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
    expect(screen.getByText('true feel')).toBeDefined()
    expect(screen.getByText(/updating/i)).toBeDefined()

    hung.resolve?.({ ok: true, status: 200, json: async () => payload })
    await waitFor(() => expect(screen.getByText(/live/)).toBeDefined())
    expect(screen.queryByText(/updating/i)).toBeNull()
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
