import { fetchBuildingsServerSide } from './buildings'
import {
  COPY_CACHE_TTL_S,
  RATE_LIMIT_MS,
  REPORT_WINDOW_MS,
  copyCacheKey,
  copyPrompt,
  isCopyRequest,
  isVote,
  toCell,
} from './lib'
import { runHeatCheck, subscribePush, unsubscribePush } from './push-routes'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  ANTHROPIC_API_KEY?: string
  VAPID_PRIVATE_JWK?: string
  VAPID_PUBLIC_KEY?: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    if (url.pathname === '/api/reports' && request.method === 'POST') return postReport(request, env)
    if (url.pathname === '/api/reports/summary' && request.method === 'GET') return reportSummary(url, env)
    if (url.pathname === '/api/copy' && request.method === 'POST') return copy(request, env)
    if (url.pathname === '/api/push/subscribe' && request.method === 'POST') return subscribePush(request, env)
    if (url.pathname === '/api/push/subscribe' && request.method === 'DELETE') return unsubscribePush(request, env)
    if (url.pathname === '/api/buildings' && request.method === 'GET') return buildings(url, env)

    return json({ error: 'Not found' }, 404)
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const result = await runHeatCheck(env)
    console.log('heat-check', JSON.stringify(result))
  },
}

async function postReport(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const lat = Number(body?.latitude)
  const lon = Number(body?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isVote(body?.vote)) {
    return json({ error: 'Expected { latitude, longitude, vote: hotter|cooler|spot-on }' }, 400)
  }

  // One report per IP per 10 min — dead-simple anti-spam for a one-tap loop.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  const rateKey = `rate:${ip}`
  if (await env.CACHE.get(rateKey)) return json({ error: 'One report per 10 minutes.' }, 429)
  await env.CACHE.put(rateKey, '1', { expirationTtl: RATE_LIMIT_MS / 1000 })

  await env.DB.prepare('INSERT INTO reports (cell, vote, created_at) VALUES (?, ?, ?)')
    .bind(toCell(lat, lon), body.vote, Date.now())
    .run()
  return json({ ok: true })
}

async function reportSummary(url: URL, env: Env): Promise<Response> {
  const lat = Number(url.searchParams.get('latitude'))
  const lon = Number(url.searchParams.get('longitude'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: 'Expected ?latitude=&longitude=' }, 400)
  }
  const { results } = await env.DB.prepare(
    'SELECT vote, COUNT(*) as n FROM reports WHERE cell = ? AND created_at > ? GROUP BY vote',
  )
    .bind(toCell(lat, lon), Date.now() - REPORT_WINDOW_MS)
    .all<{ vote: string; n: number }>()

  const counts = { hotter: 0, cooler: 0, 'spot-on': 0, ...Object.fromEntries(results.map((r) => [r.vote, r.n])) }
  return json({ windowHours: 3, counts })
}

async function buildings(url: URL, env: Env): Promise<Response> {
  const lat = Number(url.searchParams.get('latitude'))
  const lon = Number(url.searchParams.get('longitude'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: 'Expected ?latitude=&longitude=' }, 400)
  }
  const result = await fetchBuildingsServerSide(lat, lon, env.CACHE)
  if (!result) return json({ error: 'Building data is unreachable right now. Try again shortly.' }, 502)
  return json(result)
}

async function copy(request: Request, env: Env): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ available: false, reason: 'ANTHROPIC_API_KEY not configured' }, 503)
  }
  const body = await request.json().catch(() => null)
  const lat = Number((body as Record<string, unknown> | null)?.latitude)
  const lon = Number((body as Record<string, unknown> | null)?.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isCopyRequest(body)) {
    return json({ error: 'Expected { latitude, longitude, trueFeelC, baseC, deltas[] }' }, 400)
  }

  const cacheKey = copyCacheKey(lat, lon, Date.now())
  const cached = await env.CACHE.get(cacheKey)
  if (cached) return json({ available: true, line: cached, cached: true })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      messages: [{ role: 'user', content: copyPrompt(body) }],
    }),
  })
  if (!response.ok) return json({ available: false, reason: `LLM answered ${response.status}` }, 502)

  const data = (await response.json()) as { content?: { type: string; text?: string }[] }
  const line = data.content?.find((c) => c.type === 'text')?.text?.trim()
  if (!line) return json({ available: false, reason: 'Empty LLM response' }, 502)

  await env.CACHE.put(cacheKey, line, { expirationTtl: COPY_CACHE_TTL_S })
  return json({ available: true, line, cached: false })
}
