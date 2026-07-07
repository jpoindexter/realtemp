/**
 * Server-side Overpass proxy (card BUG3). Browser fetch() can never set a
 * custom User-Agent — it's a forbidden header enforced by the browser itself
 * — and Overpass's own usage policy requires one to identify the client.
 * Unidentified requests now get 406/503'd outright, unconditionally, which
 * is why the client-side mirror rotation never helped: every mirror rejects
 * an anonymous request the same way, every time. Only a server (which CAN
 * set the header) can talk to Overpass reliably.
 */

const OVERPASS_USER_AGENT = 'RealTemp/0.1 (https://realtemp-rho.vercel.app; contact: jason@theft.studio)'
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const RADIUS_M = 220
const ATTEMPT_TIMEOUT_MS = 8000
const CACHE_TTL_S = 30 * 24 * 3600 // 30 days — buildings don't move; shared across all users of this cell

export interface Building {
  ring: [number, number][]
  levels: number
}

function levelsFromTags(tags: Record<string, string> | undefined): number {
  const levels = Number(tags?.['building:levels'])
  if (Number.isFinite(levels) && levels > 0) return Math.min(levels, 40)
  const height = Number(tags?.height)
  if (Number.isFinite(height) && height > 0) return Math.max(1, Math.min(40, height / 3))
  return 4
}

interface OverpassElement {
  type: string
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
}

async function tryMirror(url: string, query: string): Promise<Building[] | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const payload = (await response.json()) as { elements?: OverpassElement[] }
    if (!Array.isArray(payload.elements)) return null
    return payload.elements.flatMap((el): Building[] => {
      if (!el.geometry || el.geometry.length < 3) return []
      return [{ ring: el.geometry.map((g) => [g.lat, g.lon] as [number, number]), levels: levelsFromTags(el.tags) }]
    })
  } catch {
    return null
  }
}

const cellKey = (lat: number, lon: number): string => `buildings:${lat.toFixed(3)},${lon.toFixed(3)}`

export async function fetchBuildingsServerSide(
  latitude: number,
  longitude: number,
  cache: KVNamespace,
): Promise<{ buildings: Building[]; cached: boolean } | null> {
  const key = cellKey(latitude, longitude)
  const cached = await cache.get(key)
  if (cached) return { buildings: JSON.parse(cached) as Building[], cached: true }

  const query = `[out:json][timeout:15];way[building](around:${RADIUS_M},${latitude},${longitude});out geom 400;`
  for (const mirror of OVERPASS_MIRRORS) {
    const buildings = await tryMirror(mirror, query)
    if (buildings) {
      await cache.put(key, JSON.stringify(buildings), { expirationTtl: CACHE_TTL_S })
      return { buildings, cached: false }
    }
  }
  return null
}
