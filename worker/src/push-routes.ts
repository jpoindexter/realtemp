import { sendEmptyPush } from './push'
import { firingRules } from './rules-routes'

import type { VapidConfig } from './push'
import type { Env } from './index'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })

export async function subscribePush(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const endpoint = body?.endpoint
  const lat = Number(body?.latitude)
  const lon = Number(body?.longitude)
  const threshold = Number(body?.thresholdC)
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(threshold)) {
    return json({ error: 'Expected { endpoint, latitude, longitude, thresholdC }' }, 400)
  }
  await env.DB.prepare(
    'INSERT INTO push_subscriptions (endpoint, latitude, longitude, threshold_c, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude, threshold_c=excluded.threshold_c',
  )
    .bind(endpoint, lat, lon, threshold, Date.now())
    .run()
  return json({ ok: true })
}

export async function unsubscribePush(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (typeof body?.endpoint !== 'string') return json({ error: 'Expected { endpoint }' }, 400)
  await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(body.endpoint).run()
  return json({ ok: true })
}

interface SubRow {
  endpoint: string
  latitude: number
  longitude: number
  threshold_c: number
}

/** Daily cron: warn each subscriber whose forecast max air temp crosses their threshold. */
export async function runHeatCheck(env: Env): Promise<{ checked: number; sent: number; pruned: number }> {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return { checked: 0, sent: 0, pruned: 0 }
  const vapid: VapidConfig = {
    privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey,
    publicKeyB64u: env.VAPID_PUBLIC_KEY,
    subject: 'mailto:jason@theft.studio',
  }

  const { results } = await env.DB.prepare('SELECT endpoint, latitude, longitude, threshold_c FROM push_subscriptions').all<SubRow>()
  let sent = 0
  let pruned = 0
  // ~0.1° dedupe: one forecast call per area, not per subscriber
  const maxByArea = new Map<string, number | null>()

  for (const sub of results) {
    const area = `${sub.latitude.toFixed(1)},${sub.longitude.toFixed(1)}`
    if (!maxByArea.has(area)) {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${sub.latitude}&longitude=${sub.longitude}&daily=temperature_2m_max&forecast_days=1&timezone=auto`,
      ).catch(() => null)
      const data = r?.ok ? ((await r.json()) as { daily?: { temperature_2m_max?: (number | null)[] } }) : null
      maxByArea.set(area, data?.daily?.temperature_2m_max?.[0] ?? null)
    }
    const maxC = maxByArea.get(area) ?? null
    const heatCrossed = maxC !== null && maxC >= sub.threshold_c
    // Custom rules (C4a) fire alongside the original heat threshold. A
    // subscriber with no rules keeps exactly the previous behaviour.
    const fired = await firingRules(env, sub.endpoint, sub.latitude, sub.longitude).catch(() => [])
    if (!heatCrossed && fired.length === 0) continue

    const status = await sendEmptyPush(sub.endpoint, vapid).catch(() => 0)
    if (status === 404 || status === 410) {
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(sub.endpoint).run()
      pruned++
    } else if (status >= 200 && status < 300) sent++
  }
  return { checked: results.length, sent, pruned }
}
