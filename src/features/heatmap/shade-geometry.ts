/**
 * Shadow casting from building footprints (card L4, v0).
 * Local flat-earth projection is fine at neighborhood scale (<1 km).
 */

export const METERS_PER_DEG_LAT = 111_320
export const METERS_PER_LEVEL = 3
export const DEFAULT_LEVELS = 4 // untagged Valencia block ≈ 4 plantas

export interface Building {
  /** [lat, lon] ring, closed or open */
  ring: [number, number][]
  levels: number
}

export interface XY {
  x: number
  y: number
}

/** Project lat/lon to meters east/south of a center point (screen-friendly: y grows downward). */
export function project(latLon: [number, number], center: [number, number]): XY {
  const kx = Math.cos((center[0] * Math.PI) / 180) * METERS_PER_DEG_LAT
  return {
    x: (latLon[1] - center[1]) * kx,
    y: (center[0] - latLon[0]) * METERS_PER_DEG_LAT,
  }
}

export function shadowLengthM(levels: number, zenithDeg: number): number {
  if (zenithDeg >= 90) return 0
  return levels * METERS_PER_LEVEL * Math.tan((zenithDeg * Math.PI) / 180)
}

/**
 * Screen-space shadow offset. Azimuth is where the sun IS (clockwise from north);
 * the shadow falls the opposite way. North = −y on screen.
 */
export function shadowOffset(azimuthDeg: number, lengthM: number): XY {
  const away = ((azimuthDeg + 180) * Math.PI) / 180
  return { x: Math.sin(away) * lengthM, y: -Math.cos(away) * lengthM }
}

/** One quad per footprint edge + the translated footprint — union rendered via group opacity. */
export function shadowPolygons(ring: XY[], offset: XY): XY[][] {
  if (ring.length < 3) return []
  const moved = ring.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }))
  const quads: XY[][] = ring.map((p, i) => {
    const j = (i + 1) % ring.length
    return [p, ring[j]!, moved[j]!, moved[i]!]
  })
  return [...quads, moved]
}

export const toPath = (poly: XY[]): string =>
  poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('') + 'Z'
