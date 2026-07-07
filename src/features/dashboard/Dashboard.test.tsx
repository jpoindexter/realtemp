import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('Dashboard', () => {
  it('renders hero, a summing ledger, all toggles and the gauge from live data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
    render(<Dashboard location={valencia} unit="c" onSetUnit={() => {}} onChangeLocation={() => {}} onOpenSettings={() => {}} onOpenAbout={() => {}} />)

    await waitFor(() => expect(screen.getAllByText(/true feel/i).length).toBeGreaterThan(0))
    // base + humidity + wind + solar(zenith-dependent) + urban 2 + walking 1 — assert structure, not zenith
    expect(screen.getByText('base air')).toBeDefined()
    expect(screen.getByText('humidity friction')).toBeDefined()
    expect(screen.getByText(/sun premium/)).toBeDefined() // regex: label gains '· night' after dark
    expect(screen.getAllByRole('radio')).toHaveLength(18) // 4 toggle groups + 2 body-panel groups
    expect(screen.getByRole('meter', { name: /sweat efficiency/i })).toBeDefined()
    expect(screen.queryByText(/partial data/i)).toBeNull()
  })

  it('exposes settings and about as separate, labeled controls (not folded together)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })))
    render(<Dashboard location={valencia} unit="c" onSetUnit={() => {}} onChangeLocation={() => {}} onOpenSettings={() => {}} onOpenAbout={() => {}} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /settings/i })).toBeDefined())
    expect(screen.getByRole('button', { name: /how this works/i })).toBeDefined()
  })

  it('shows the partial-data badge when the feed drops fields', async () => {
    const degraded = { ...payload, current: { ...payload.current, uv_index: null, dew_point_2m: null } }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => degraded })))
    render(<Dashboard location={valencia} unit="c" onSetUnit={() => {}} onChangeLocation={() => {}} onOpenSettings={() => {}} onOpenAbout={() => {}} />)

    await waitFor(() => expect(screen.getByText(/partial data/i)).toBeDefined())
    expect(screen.queryByText(/sun premium/)).toBeNull()
  })

  it('marks the reading stale past TTL and refetches on visibility', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => payload }))
    vi.stubGlobal('fetch', fetchMock)
    render(<Dashboard location={valencia} unit="c" onSetUnit={() => {}} onChangeLocation={() => {}} onOpenSettings={() => {}} onOpenAbout={() => {}} />)

    await waitFor(() => expect(screen.getByText(/live/)).toBeDefined())
    expect(fetchMock).toHaveBeenCalledTimes(2) // current + baseline

    vi.setSystemTime(Date.now() + 11 * 60_000) // past the 10-min TTL
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    vi.useRealTimers()
  })

  it(
    'surfaces fetch failure with a retry action',
    async () => {
      // Real timers deliberately: the adapter's retry backoff (~1.2s) fights
      // fake-timer interplay with the dashboard's own stale-check interval.
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))
      render(<Dashboard location={valencia} unit="c" onSetUnit={() => {}} onChangeLocation={() => {}} onOpenSettings={() => {}} onOpenAbout={() => {}} />)

      await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeDefined(), { timeout: 4000 })
      expect(screen.getByText(/momentarily unreachable/i)).toBeDefined()
    },
    6000,
  )
})
