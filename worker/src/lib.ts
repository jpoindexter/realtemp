/** Pure helpers — unit-tested without the Workers runtime. */

export const COPY_CACHE_TTL_S = 3600

/** ~1 km grid: 0.01° buckets keep cache keys local without storing raw coordinates. */
export function toCell(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`
}

export interface CopyRequest {
  trueFeelC: number
  baseC: number
  deltas: { label: string; deltaC: number }[]
  sweatEfficiencyPct: number | null
}

export function isCopyRequest(body: unknown): body is CopyRequest {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.trueFeelC === 'number' &&
    typeof b.baseC === 'number' &&
    Array.isArray(b.deltas) &&
    b.deltas.every(
      (d) =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as Record<string, unknown>).label === 'string' &&
        typeof (d as Record<string, unknown>).deltaC === 'number',
    )
  )
}

export function copyPrompt(req: CopyRequest): string {
  const parts = req.deltas.map((d) => `${d.label} ${d.deltaC >= 0 ? '+' : ''}${d.deltaC}°`).join(', ')
  return (
    `Weather data: air ${req.baseC}°C feels like ${req.trueFeelC}°C (${parts})` +
    `${req.sweatEfficiencyPct !== null ? `, sweat efficiency ${req.sweatEfficiencyPct}%` : ''}. ` +
    `Write ONE dry, punchy sentence (max 18 words) telling a person on the street what this actually feels like. ` +
    `No emoji, no exclamation marks, no weather-app clichés.`
  )
}

/** Cache key per ~1 km cell per hour — the same hour reads the same line. */
export function copyCacheKey(latitude: number, longitude: number, nowMs: number): string {
  return `copy:${toCell(latitude, longitude)}:${Math.floor(nowMs / 3_600_000)}`
}
