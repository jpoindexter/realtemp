import { z } from 'zod'

import { err, ok } from '@/lib/result'

import { DEFAULT_LEVELS } from './shade-geometry'

import type { Building } from './shade-geometry'
import type { WeatherError } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RADIUS_M = 220

const overpassSchema = z.object({
  elements: z.array(
    z.object({
      type: z.string(),
      geometry: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
})

function levelsFromTags(tags: Record<string, string> | undefined): number {
  const levels = Number(tags?.['building:levels'])
  if (Number.isFinite(levels) && levels > 0) return Math.min(levels, 40)
  const height = Number(tags?.height)
  if (Number.isFinite(height) && height > 0) return Math.max(1, Math.min(40, height / 3))
  return DEFAULT_LEVELS
}

/** Buildings within ~220 m of a point, via the public Overpass API (no key). */
export async function fetchBuildings(
  latitude: number,
  longitude: number,
): Promise<Result<Building[], WeatherError>> {
  const query = `[out:json][timeout:15];way[building](around:${RADIUS_M},${latitude},${longitude});out geom 400;`

  let payload: unknown
  try {
    const response = await fetch(OVERPASS_URL, { method: 'POST', body: `data=${encodeURIComponent(query)}` })
    if (!response.ok) {
      return err({ kind: 'network', message: `Building data answered ${response.status}. Try again in a minute.` })
    }
    payload = await response.json()
  } catch {
    return err({ kind: 'network', message: 'No connection to building data. Check network and retry.' })
  }

  const parsed = overpassSchema.safeParse(payload)
  if (!parsed.success) return err({ kind: 'parse', message: 'Building data returned an unexpected shape.' })

  const buildings = parsed.data.elements.flatMap((el): Building[] => {
    if (!el.geometry || el.geometry.length < 3) return []
    return [{ ring: el.geometry.map((g) => [g.lat, g.lon] as [number, number]), levels: levelsFromTags(el.tags) }]
  })
  return ok(buildings)
}
