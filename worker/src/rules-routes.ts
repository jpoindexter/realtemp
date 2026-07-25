import { isAlertRule, ruleFires, ruleSummary } from './alert-rules'
import { computeTrueFeel } from '../../src/features/formula/compute-true-feel'
import { solarZenithDeg } from '../../src/features/formula/solar-zenith'

import type { AlertRule, RuleTerm } from './alert-rules'
import type { Env } from './index'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })

/**
 * Created on demand rather than in a migration step. D1 DDL is cheap and
 * idempotent, and this keeps a fresh deploy from needing a manual
 * `wrangler d1 execute` before the feature works.
 */
async function ensureTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS alert_rules (
       id TEXT PRIMARY KEY,
       endpoint TEXT NOT NULL,
       term TEXT NOT NULL,
       direction TEXT NOT NULL,
       threshold REAL NOT NULL,
       created_at INTEGER NOT NULL
     )`,
  ).run()
}

export interface RuleRow {
  id: string
  endpoint: string
  term: RuleTerm
  direction: 'above' | 'below'
  threshold: number
}

export async function listRules(url: URL, env: Env): Promise<Response> {
  const endpoint = url.searchParams.get('endpoint')
  if (!endpoint) return json({ error: 'Expected ?endpoint=' }, 400)
  await ensureTable(env)
  const { results } = await env.DB.prepare(
    'SELECT id, term, direction, threshold FROM alert_rules WHERE endpoint = ? ORDER BY created_at',
  )
    .bind(endpoint)
    .all<Omit<RuleRow, 'endpoint'>>()
  return json({
    rules: results.map((r) => ({ ...r, summary: ruleSummary(r as AlertRule) })),
  })
}

export async function addRule(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const endpoint = body?.endpoint
  const rule = body?.rule
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
    return json({ error: 'Expected { endpoint, rule }' }, 400)
  }
  if (!isAlertRule(rule)) {
    return json({ error: 'rule must be { term, direction, threshold } within range' }, 400)
  }
  await ensureTable(env)
  const id = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO alert_rules (id, endpoint, term, direction, threshold, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, endpoint, rule.term, rule.direction, rule.threshold, Date.now())
    .run()
  return json({ id, summary: ruleSummary(rule) })
}

export async function deleteRule(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (typeof body?.id !== 'string') return json({ error: 'Expected { id }' }, 400)
  await ensureTable(env)
  await env.DB.prepare('DELETE FROM alert_rules WHERE id = ?').bind(body.id).run()
  return json({ ok: true })
}

interface HourlyFeed {
  time?: string[]
  temperature_2m?: (number | null)[]
  dew_point_2m?: (number | null)[]
  wind_speed_10m?: (number | null)[]
  uv_index?: (number | null)[]
}

/**
 * The day's hourly series for one term.
 *
 * `trueFeel` runs the real formula from src/features/formula rather than a copy
 * — the whole product is that number, and two implementations would drift.
 * Toggles are left at their neutral defaults: the cron has no way to know what
 * the user has selected, and a rule should fire on the conditions, not on a
 * stale toggle state.
 */
export function seriesFor(
  term: RuleTerm,
  hourly: HourlyFeed,
  latitude: number,
  longitude: number,
  utcOffsetSeconds: number,
): (number | null)[] {
  const times = hourly.time ?? []
  if (term === 'airTemp') return hourly.temperature_2m ?? []
  if (term === 'dewPoint') return hourly.dew_point_2m ?? []
  if (term === 'uvIndex') return hourly.uv_index ?? []

  return times.map((iso, i) => {
    const airTempC = hourly.temperature_2m?.[i] ?? null
    if (airTempC === null) return null
    const utcMs = Date.parse(`${iso}:00Z`) - utcOffsetSeconds * 1000
    const result = computeTrueFeel(
      {
        airTempC,
        dewPointC: hourly.dew_point_2m?.[i] ?? null,
        windSpeedMs: hourly.wind_speed_10m?.[i] ?? null,
        uvIndex: hourly.uv_index?.[i] ?? null,
        solarZenithDeg: solarZenithDeg(new Date(utcMs), latitude, longitude),
        localHour: Number(iso.slice(11, 13)),
        baseline14C: null,
      },
      { exposure: 'sun', environment: 'open', activity: 'stagnant', acclimatization: 'local' },
    )
    return result.trueFeelC
  })
}

/** Every rule for a subscription that fires against today's forecast. */
export async function firingRules(
  env: Env,
  endpoint: string,
  latitude: number,
  longitude: number,
): Promise<RuleRow[]> {
  await ensureTable(env)
  const { results } = await env.DB.prepare(
    'SELECT id, endpoint, term, direction, threshold FROM alert_rules WHERE endpoint = ?',
  )
    .bind(endpoint)
    .all<RuleRow>()
  if (!results.length) return []

  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&hourly=temperature_2m,dew_point_2m,wind_speed_10m,uv_index&wind_speed_unit=ms&forecast_days=1&timezone=auto`,
  ).catch(() => null)
  if (!r || !r.ok) return []
  const data = (await r.json().catch(() => null)) as {
    hourly?: HourlyFeed
    utc_offset_seconds?: number
  } | null
  const hourly = data?.hourly
  if (!hourly) return []

  return results.filter((row) =>
    ruleFires(row, seriesFor(row.term, hourly, latitude, longitude, data?.utc_offset_seconds ?? 0)),
  )
}
