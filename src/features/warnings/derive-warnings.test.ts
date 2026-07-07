import { describe, expect, it } from 'vitest'

import { deriveWarnings } from './derive-warnings'

const calm = { trueFeelC: 25, uvIndex: 5, windSpeedMs: 3, isNight: false }

describe('deriveWarnings', () => {
  it('stays silent in benign conditions', () => {
    expect(deriveWarnings(calm)).toEqual([])
  })

  it('escalates heat from caution at 33 to danger at 40', () => {
    expect(deriveWarnings({ ...calm, trueFeelC: 33 })[0]).toMatchObject({ id: 'heat', level: 'caution' })
    expect(deriveWarnings({ ...calm, trueFeelC: 41.2 })[0]).toMatchObject({ id: 'heat', level: 'danger' })
    expect(deriveWarnings({ ...calm, trueFeelC: 32.9 })).toEqual([])
  })

  it('warns for cold both ways', () => {
    expect(deriveWarnings({ ...calm, trueFeelC: -1 })[0]).toMatchObject({ id: 'cold', level: 'caution' })
    expect(deriveWarnings({ ...calm, trueFeelC: -12 })[0]).toMatchObject({ id: 'cold', level: 'danger' })
  })

  it('flags extreme UV only in daylight, and tolerates missing fields', () => {
    expect(deriveWarnings({ ...calm, uvIndex: 9 })[0]).toMatchObject({ id: 'uv' })
    expect(deriveWarnings({ ...calm, uvIndex: 9, isNight: true })).toEqual([])
    expect(deriveWarnings({ ...calm, uvIndex: null, windSpeedMs: null })).toEqual([])
  })

  it('stacks heat + uv + wind when the street is genuinely hostile', () => {
    const hostile = deriveWarnings({ trueFeelC: 42, uvIndex: 10, windSpeedMs: 12, isNight: false })
    expect(hostile.map((w) => w.id)).toEqual(['heat', 'uv', 'wind'])
  })
})
