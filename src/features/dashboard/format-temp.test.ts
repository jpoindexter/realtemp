import { describe, expect, it } from 'vitest'

import { cToF, displayDelta, displayTemp } from './format-temp'

describe('format-temp', () => {
  it('converts absolutes with the full formula', () => {
    expect(cToF(0)).toBe(32)
    expect(displayTemp(37.9, 'f')).toBe('100.2')
    expect(displayTemp(37.9, 'c')).toBe('37.9')
  })

  it('converts deltas by scale only — no 32° offset on a difference', () => {
    expect(displayDelta(5, 'f')).toBe('+9.0°')
    expect(displayDelta(-1.5, 'f')).toBe('−2.7°')
    expect(displayDelta(-1.5, 'c')).toBe('−1.5°')
  })
})
