import { describe, expect, it } from 'vitest'

import { copyCacheKey, copyPrompt, isCopyRequest, toCell } from './lib'

describe('toCell', () => {
  it('buckets to a ~1km 0.01° grid', () => {
    expect(toCell(39.4699, -0.3763)).toBe('39.47,-0.38')
    expect(toCell(39.4749, -0.3763)).toBe('39.47,-0.38')
    expect(toCell(39.4849, -0.3763)).toBe('39.48,-0.38')
  })
})

describe('isCopyRequest / copyPrompt', () => {
  const req = {
    trueFeelC: 37.9,
    baseC: 30,
    deltas: [{ label: 'sun premium', deltaC: 5.2 }],
    sweatEfficiencyPct: 38,
  }

  it('validates shape', () => {
    expect(isCopyRequest(req)).toBe(true)
    expect(isCopyRequest({ ...req, deltas: [{ label: 1 }] })).toBe(false)
    expect(isCopyRequest(null)).toBe(false)
  })

  it('builds a prompt containing the ledger', () => {
    const p = copyPrompt(req)
    expect(p).toContain('feels like 37.9°C')
    expect(p).toContain('sun premium +5.2°')
    expect(p).toContain('sweat efficiency 38%')
  })
})

describe('copyCacheKey', () => {
  it('is stable within an hour and rolls over after it', () => {
    const t = 1_800_000_000_000
    expect(copyCacheKey(39.47, -0.376, t)).toBe(copyCacheKey(39.47, -0.376, t + 59 * 60_000))
    expect(copyCacheKey(39.47, -0.376, t)).not.toBe(copyCacheKey(39.47, -0.376, t + 61 * 60_000))
  })
})
