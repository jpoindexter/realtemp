import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchBuildingsServerSide } from './buildings'

const square = [
  { lat: 39.47, lon: -0.376 },
  { lat: 39.471, lon: -0.376 },
  { lat: 39.471, lon: -0.375 },
  { lat: 39.47, lon: -0.375 },
]

function fakeKV(): KVNamespace {
  const store = new Map<string, string>()
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
  } as unknown as KVNamespace
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchBuildingsServerSide', () => {
  it('sets a proper User-Agent — the actual root cause of the client-side 406s', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>>(
      async () => ({
        ok: true,
        json: async () => ({ elements: [{ type: 'way', geometry: square, tags: { 'building:levels': '5' } }] }),
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchBuildingsServerSide(39.47, -0.376, fakeKV())
    expect(result?.buildings).toHaveLength(1)
    expect(result?.buildings[0]?.levels).toBe(5)

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['User-Agent']).toContain('RealTemp')
  })

  it('falls through mirrors on failure and only calls Overpass once per cell thereafter (KV cache)', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls++
      if (calls === 1) return { ok: false, json: async () => ({}) } // first mirror fails
      return { ok: true, json: async () => ({ elements: [{ type: 'way', geometry: square, tags: {} }] }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    const kv = fakeKV()

    const first = await fetchBuildingsServerSide(39.47, -0.376, kv)
    expect(first?.cached).toBe(false)
    expect(calls).toBe(2) // one failed mirror, one success

    const second = await fetchBuildingsServerSide(39.47, -0.376, kv)
    expect(second?.cached).toBe(true)
    expect(calls).toBe(2) // no new fetch — served from cache
  })

  it('returns null (not a thrown error) when every mirror fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    const result = await fetchBuildingsServerSide(39.47, -0.376, fakeKV())
    expect(result).toBeNull()
  })

  it('drops degenerate geometry and applies the default-levels fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          elements: [
            { type: 'way', geometry: [{ lat: 1, lon: 1 }], tags: {} }, // too few points
            { type: 'way', geometry: square, tags: {} }, // no levels/height tag
          ],
        }),
      })),
    )
    const result = await fetchBuildingsServerSide(39.47, -0.376, fakeKV())
    expect(result?.buildings).toHaveLength(1)
    expect(result?.buildings[0]?.levels).toBe(4) // DEFAULT_LEVELS
  })
})
