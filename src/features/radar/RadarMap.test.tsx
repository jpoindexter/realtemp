import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RadarMap, tilesForLocation } from './RadarMap'

const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RadarMap', () => {
  it('renders the latest RainViewer frame over a centered tile grid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          generated: 1784130000,
          host: 'https://tilecache.rainviewer.com',
          radar: {
            past: [{ time: 1784129400, path: '/v2/radar/1784129400' }],
            nowcast: [{ time: 1784130000, path: '/v2/radar/1784130000' }],
          },
        }),
      })),
    )

    render(<RadarMap location={valencia} />)

    expect(screen.getByRole('img', { name: /precipitation radar centered on valencia/i })).toBeDefined()
    await waitFor(() => expect(screen.getByText(/rainviewer frame/i)).toBeDefined())

    const radarTiles = Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="tilecache.rainviewer.com"]'))
    expect(radarTiles).toHaveLength(9)
    expect(radarTiles[0]?.src).toContain('/v2/radar/1784130000/256/7/')
    expect(screen.getByText(/openstreetmap contributors/i)).toBeDefined()
  })

  it('shows an inline failure state without breaking the forecast tab', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })))

    render(<RadarMap location={valencia} />)

    await waitFor(() => expect(screen.getByText(/radar is unavailable right now/i)).toBeDefined())
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDefined()
  })

  it('keeps the selected location centered in the tile math', () => {
    const tiles = tilesForLocation(valencia.latitude, valencia.longitude)

    expect(tiles).toHaveLength(9)
    expect(tiles.some((tile) => tile.left < 256 && tile.top < 256)).toBe(true)
    expect(tiles.every((tile) => tile.x >= 0 && tile.x < 128)).toBe(true)
    expect(tiles.every((tile) => tile.y >= 0 && tile.y < 128)).toBe(true)
  })
})
