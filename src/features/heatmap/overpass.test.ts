import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/config', () => ({ config: { apiBase: 'https://realtemp-api.example.test' } }))

import { fetchBuildings } from './overpass'

const square: [number, number][] = [
  [39.47, -0.376],
  [39.471, -0.376],
  [39.471, -0.375],
  [39.47, -0.375],
]

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('fetchBuildings — worker-first (card BUG3: browser fetch can never set User-Agent)', () => {
  it('calls the worker proxy, not Overpass directly, when apiBase is configured', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain('realtemp-api.example.test/api/buildings')
      return { ok: true, json: async () => ({ buildings: [{ ring: square, levels: 5 }] }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    const r = await fetchBuildings(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toHaveLength(1)
    expect(r.value[0]?.levels).toBe(5)
    expect(fetchMock).toHaveBeenCalledTimes(1) // never touches Overpass mirrors directly
  })

  it('falls back to direct Overpass mirrors if the worker itself is unreachable', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('realtemp-api')) return { ok: false, json: async () => ({}) }
      return { ok: true, json: async () => ({ elements: [{ type: 'way', geometry: square.map(([lat, lon]) => ({ lat, lon })), tags: {} }] }) }
    })
    vi.stubGlobal('fetch', fetchMock)

    const r = await fetchBuildings(39.47, -0.376)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value).toHaveLength(1)
  })

  it('serves from local cache without any fetch on a second call', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ buildings: [{ ring: square, levels: 3 }] }) }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchBuildings(39.47, -0.376)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const r2 = await fetchBuildings(39.47, -0.376)
    expect(fetchMock).toHaveBeenCalledTimes(1) // cache hit, no new fetch
    expect(r2.ok).toBe(true)
  })

  it('returns a clear error when every path fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    const r = await fetchBuildings(39.47, -0.376)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.message).toContain('unreachable')
  })
})
