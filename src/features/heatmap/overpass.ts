import { z } from 'zod'

import { config } from '@/lib/config'
import { err, ok } from '@/lib/result'

import { DEFAULT_LEVELS } from './shade-geometry'

import type { Building } from './shade-geometry'
import type { WeatherError } from '@/features/weather/open-meteo'
import type { Result } from '@/lib/result'

/**
 * Building data is fetched server-side (the realtemp-api Worker) because
 * Overpass's usage policy requires a client User-Agent header — and browser
 * fetch() can never set one (it's forbidden, enforced by the browser itself).
 * Confirmed root cause of persistent 406s: identical request, only the
 * User-Agent differs, and only the identified one succeeds. No client-side
 * retry or mirror rotation can fix a header the browser refuses to send.
 *
 * Direct-to-Overpass stays as a fallback only for local dev without
 * VITE_API_BASE configured — it will hit the same 406 in a real browser,
 * but keeps `wrangler dev`-less local development from hard-failing.
 */
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const ATTEMPT_TIMEOUT_MS = 8000
const RADIUS_M = 220
const CACHE_PREFIX = 'realtemp:buildings:'
const CACHE_TTL_MS = 30 * 24 * 3600 * 1000

const overpassSchema = z.object({
  elements: z.array(
    z.object({
      type: z.string(),
      geometry: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
})

const workerSchema = z.object({
  buildings: z.array(z.object({ ring: z.array(z.tuple([z.number(), z.number()])), levels: z.number() })),
})

const cachedSchema = z.object({
  at: z.number(),
  buildings: z.array(z.object({ ring: z.array(z.tuple([z.number(), z.number()])), levels: z.number() })),
})

function levelsFromTags(tags: Record<string, string> | undefined): number {
  const levels = Number(tags?.['building:levels'])
  if (Number.isFinite(levels) && levels > 0) return Math.min(levels, 40)
  const height = Number(tags?.height)
  if (Number.isFinite(height) && height > 0) return Math.max(1, Math.min(40, height / 3))
  return DEFAULT_LEVELS
}

const cacheKey = (lat: number, lon: number): string => `${CACHE_PREFIX}${lat.toFixed(3)},${lon.toFixed(3)}`

function readCache(lat: number, lon: number): Building[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lon))
    if (!raw) return null
    const parsed = cachedSchema.safeParse(JSON.parse(raw))
    if (!parsed.success || Date.now() - parsed.data.at > CACHE_TTL_MS) return null
    return parsed.data.buildings as Building[]
  } catch {
    return null
  }
}

function writeCache(lat: number, lon: number, buildings: Building[]): void {
  try {
    localStorage.setItem(cacheKey(lat, lon), JSON.stringify({ at: Date.now(), buildings }))
  } catch {
    // storage full — cache is an optimization, not a requirement
  }
}

async function fetchViaWorker(apiBase: string, latitude: number, longitude: number): Promise<Building[] | null> {
  try {
    const response = await fetch(`${apiBase}/api/buildings?latitude=${latitude}&longitude=${longitude}`, {
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const parsed = workerSchema.safeParse(await response.json())
    return parsed.success ? (parsed.data.buildings as Building[]) : null
  } catch {
    return null
  }
}

async function tryMirrorDirect(url: string, query: string): Promise<Building[] | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const parsed = overpassSchema.safeParse(await response.json())
    if (!parsed.success) return null
    return parsed.data.elements.flatMap((el): Building[] => {
      if (!el.geometry || el.geometry.length < 3) return []
      return [{ ring: el.geometry.map((g) => [g.lat, g.lon] as [number, number]), levels: levelsFromTags(el.tags) }]
    })
  } catch {
    return null
  }
}

/** Buildings within ~220 m — local cache first, then the worker proxy, then direct-fetch as a last resort. */
export async function fetchBuildings(
  latitude: number,
  longitude: number,
): Promise<Result<Building[], WeatherError>> {
  const cached = readCache(latitude, longitude)
  if (cached) return ok(cached)

  if (config.apiBase) {
    const buildings = await fetchViaWorker(config.apiBase, latitude, longitude)
    if (buildings) {
      writeCache(latitude, longitude, buildings)
      return ok(buildings)
    }
  }

  const query = `[out:json][timeout:15];way[building](around:${RADIUS_M},${latitude},${longitude});out geom 400;`
  for (const mirror of OVERPASS_MIRRORS) {
    const buildings = await tryMirrorDirect(mirror, query)
    if (buildings) {
      writeCache(latitude, longitude, buildings)
      return ok(buildings)
    }
  }
  return err({
    kind: 'network',
    message: 'Building data is unreachable right now. Try again shortly.',
  })
}
