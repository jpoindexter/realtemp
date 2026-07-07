import { useState } from 'react'

import { solarAzimuthDeg } from '@/features/formula/solar-azimuth'
import { solarZenithDeg } from '@/features/formula/solar-zenith'

import { fetchBuildings } from './overpass'
import { project, shadowLengthM, shadowOffset, shadowPolygons, toPath } from './shade-geometry'

import type { Building } from './shade-geometry'
import type { StoredLocation } from '@/features/location/geocoding'

const VIEW_M = 440 // width/height of the window in meters

type MapState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'ready'; buildings: Building[] }
  | { status: 'error'; message: string }

/** Figure/ground shade map (card L4 v0): where shadow actually is right now. */
export function ShadeMap({ location }: { location: StoredLocation }) {
  const [state, setState] = useState<MapState>({ status: 'idle' })

  const load = async () => {
    setState({ status: 'busy' })
    const result = await fetchBuildings(location.latitude, location.longitude)
    if (result.ok) setState({ status: 'ready', buildings: result.value })
    else setState({ status: 'error', message: result.error.message })
  }

  const now = new Date()
  const zenith = solarZenithDeg(now, location.latitude, location.longitude)
  const isNight = zenith >= 90

  return (
    <details
      className="body-panel"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && state.status === 'idle') void load()
      }}
    >
      <summary>Shade nearby · beta</summary>
      <div className="stack" style={{ paddingTop: 12 }}>
        {isNight && <p className="note">Night — everything is shade. Open again in daylight.</p>}
        {!isNight && state.status === 'busy' && <p className="note">Reading the buildings…</p>}
        {!isNight && state.status === 'error' && (
          <div className="stack">
            <p className="error">{state.message}</p>
            <button type="button" className="btn quiet" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}
        {!isNight && state.status === 'ready' && (
          <ShadeSvg buildings={state.buildings} location={location} zenith={zenith} now={now} />
        )}
      </div>
    </details>
  )
}

interface ShadeSvgProps {
  buildings: Building[]
  location: StoredLocation
  zenith: number
  now: Date
}

function ShadeSvg({ buildings, location, zenith, now }: ShadeSvgProps) {
  if (buildings.length === 0) return <p className="note">No mapped buildings here — open ground, trust the sun toggle.</p>

  const center: [number, number] = [location.latitude, location.longitude]
  const azimuth = solarAzimuthDeg(now, location.latitude, location.longitude)
  const rings = buildings.map((b) => b.ring.map((p) => project(p, center)))

  return (
    <figure className="shade-map">
      <svg
        viewBox={`${-VIEW_M / 2} ${-VIEW_M / 2} ${VIEW_M} ${VIEW_M}`}
        role="img"
        aria-label={`Buildings and their current shadows within about 200 meters. Sun azimuth ${Math.round(azimuth)} degrees.`}
      >
        <g className="shadows">
          {buildings.flatMap((b, i) => {
            const offset = shadowOffset(azimuth, shadowLengthM(b.levels, zenith))
            return shadowPolygons(rings[i]!, offset).map((poly, k) => (
              <path key={`${i}-${k}`} d={toPath(poly)} />
            ))
          })}
        </g>
        <g className="footprints">
          {rings.map((ring, i) => (
            <path key={i} d={toPath(ring)} />
          ))}
        </g>
        <circle className="you" cx={0} cy={0} r={5} />
      </svg>
      <figcaption className="legend">
        You are the dot · dark = building · blue = shadow right now ({Math.round(zenith)}&deg; sun)
      </figcaption>
    </figure>
  )
}
