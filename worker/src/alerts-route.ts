import { alertMatchesLocation, parseMeteoAlarmAtomAlerts } from './alerts'
import { toCell } from './lib'

import type { OfficialAlert } from './alerts'

const METEOALARM_SPAIN_ATOM_URL = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain'
const CACHE_TTL_S = 600

interface AlertCache {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<unknown>
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

interface PublicAlert {
  headline: string
  level: OfficialAlert['level']
  geocode: string | null
}

export async function officialAlerts(url: URL, cache: AlertCache, fetcher: Fetcher = fetch): Promise<Response> {
  const rawLatitude = url.searchParams.get('latitude')
  const rawLongitude = url.searchParams.get('longitude')
  const latitude = Number(rawLatitude)
  const longitude = Number(rawLongitude)
  if (rawLatitude === null || rawLongitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return json({ error: 'Expected ?latitude=&longitude=' }, 400)
  }

  const key = `official-alerts:v2:${toCell(latitude, longitude)}`
  const cached = await cache.get(key)
  if (cached) return json(JSON.parse(cached))

  const response = await fetcher(METEOALARM_SPAIN_ATOM_URL).catch(() => null)
  if (!response?.ok) return json({ error: 'Official alerts are unreachable right now.' }, 502)
  const alerts: PublicAlert[] = parseMeteoAlarmAtomAlerts(await response.text()).flatMap((alert) =>
    isExpired(alert) || !alertMatchesLocation(alert, latitude, longitude)
      ? []
      : [{
          headline: alert.headline,
          level: alert.level,
          geocode: alert.geocode,
        }],
  )

  const body = { source: 'AEMET', cell: toCell(latitude, longitude), alerts }
  await cache.put(key, JSON.stringify(body), { expirationTtl: CACHE_TTL_S })
  return json(body)
}

function isExpired(alert: OfficialAlert): boolean {
  const expires = Date.parse(alert.expires)
  return Number.isFinite(expires) && expires < Date.now()
}
