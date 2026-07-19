import { useEffect, useState } from 'react'
import { z } from 'zod'

import type { StoredLocation } from '@/features/location/geocoding'

const RADAR_API_URL = 'https://api.rainviewer.com/public/weather-maps.json'
const OSM_TILE_URL = 'https://tile.openstreetmap.org'
const RADAR_ZOOM = 7
const TILE_SIZE = 256
const GRID_RADIUS = 1

const frameSchema = z.object({
  time: z.number(),
  path: z.string(),
})

const radarSchema = z.object({
  generated: z.number(),
  host: z.string().url(),
  radar: z.object({
    past: z.array(frameSchema).default([]),
    nowcast: z.array(frameSchema).default([]),
  }),
})

interface RadarFrame {
  host: string
  path: string
  generated: number
  time: number
}

interface RadarTile {
  key: string
  left: number
  top: number
  x: number
  y: number
}

type RadarState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; frame: RadarFrame }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function wrapTileX(x: number, max: number): number {
  return ((x % max) + max) % max
}

export function tilesForLocation(latitude: number, longitude: number, zoom = RADAR_ZOOM): RadarTile[] {
  const max = 2 ** zoom
  const lat = clamp(latitude, -85.05112878, 85.05112878)
  const latRad = (lat * Math.PI) / 180
  const centerX = ((longitude + 180) / 360) * max
  const centerY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * max
  const baseX = Math.floor(centerX)
  const baseY = Math.floor(centerY)
  const centerPx = (GRID_RADIUS + 0.5) * TILE_SIZE
  const tiles: RadarTile[] = []

  for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      const rawX = baseX + dx
      const rawY = baseY + dy
      if (rawY < 0 || rawY >= max) continue
      tiles.push({
        key: `${rawX}:${rawY}`,
        left: (rawX - centerX) * TILE_SIZE + centerPx,
        top: (rawY - centerY) * TILE_SIZE + centerPx,
        x: wrapTileX(rawX, max),
        y: rawY,
      })
    }
  }

  return tiles
}

function latestFrame(data: z.output<typeof radarSchema>): RadarFrame | null {
  const frames = [...data.radar.past, ...data.radar.nowcast]
  const frame = frames.at(-1)
  if (!frame) return null
  return { host: data.host, path: frame.path, generated: data.generated, time: frame.time }
}

function radarTileSrc(frame: RadarFrame, tile: RadarTile): string {
  return `${frame.host}${frame.path}/256/${RADAR_ZOOM}/${tile.x}/${tile.y}/2/1_1.png`
}

function osmTileSrc(tile: RadarTile): string {
  return `${OSM_TILE_URL}/${RADAR_ZOOM}/${tile.x}/${tile.y}.png`
}

function timeLabel(unixSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(unixSeconds * 1000))
}

export function RadarMap({ location }: { location: StoredLocation }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<RadarState>({ status: 'loading' })
  const tiles = tilesForLocation(location.latitude, location.longitude)

  useEffect(() => {
    let cancelled = false
    void fetch(RADAR_API_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const parsed = radarSchema.safeParse(await response.json())
        if (!parsed.success) throw new Error('Unexpected radar feed shape')
        const frame = latestFrame(parsed.data)
        if (!frame) throw new Error('No radar frames available')
        if (!cancelled) setState({ status: 'ready', frame })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', message: 'Radar is unavailable right now.' })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <section className="body-panel radar-panel" aria-labelledby="radar-title">
      <div className="panel-head">
        <div>
          <h2 id="radar-title" className="body-panel-title">Radar near you</h2>
          <span className="radar-kicker">Live precip · 3 tile radius</span>
          <p className="note">
            {state.status === 'ready'
              ? `RainViewer frame ${timeLabel(state.frame.time)}`
              : state.status === 'loading'
                ? 'Loading live precipitation radar...'
                : state.message}
          </p>
        </div>
        <button
          type="button"
          className="mini-btn"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
        >
          Refresh
        </button>
      </div>

      <div className="radar-map" role="img" aria-label={`Precipitation radar centered on ${location.label}`}>
        <div className="radar-grid-label top">N</div>
        <div className="radar-grid-label right">E</div>
        <div className="radar-grid-label bottom">S</div>
        <div className="radar-grid-label left">W</div>
        <div className="radar-layer radar-base">
          {tiles.map((tile) => (
            <img
              key={`base-${tile.key}`}
              src={osmTileSrc(tile)}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
            />
          ))}
        </div>
        {state.status === 'ready' && (
          <div className="radar-layer radar-rain">
            {tiles.map((tile) => (
              <img
                key={`radar-${tile.key}`}
                src={radarTileSrc(state.frame, tile)}
                alt=""
                loading="lazy"
                decoding="async"
                style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
              />
            ))}
          </div>
        )}
        <div className="radar-crosshair" aria-hidden="true" />
        <div className="radar-attribution">
          Radar: RainViewer · Map: © OpenStreetMap contributors
        </div>
      </div>
      <div className="radar-legend" aria-label="Radar intensity legend">
        <span><i className="dry" /> dry</span>
        <span><i className="rain" /> rain</span>
        <span><i className="core" /> heavy</span>
      </div>

      {state.status === 'error' && (
        <p className="note" role="status">
          The rest of RealTemp still works; this panel only depends on the public radar feed.
        </p>
      )}
    </section>
  )
}
