import { describe, expect, it } from 'vitest'

import { isAlertRule, ruleFires, ruleSummary } from './alert-rules'

describe('ruleFires', () => {
  it('fires an "above" rule when any hour reaches the threshold', () => {
    const rule = { term: 'trueFeel', direction: 'above', threshold: 36 } as const
    expect(ruleFires(rule, [30, 34, 36])).toBe(true)
  })

  it('does not fire an "above" rule when every hour stays under', () => {
    const rule = { term: 'trueFeel', direction: 'above', threshold: 36 } as const
    expect(ruleFires(rule, [30, 34, 35.9])).toBe(false)
  })

  it('fires a "below" rule when any hour drops to the threshold', () => {
    const rule = { term: 'trueFeel', direction: 'below', threshold: 2 } as const
    expect(ruleFires(rule, [8, 5, 2])).toBe(true)
  })

  it('does not fire a "below" rule when every hour stays above', () => {
    const rule = { term: 'trueFeel', direction: 'below', threshold: 2 } as const
    expect(ruleFires(rule, [8, 5, 2.1])).toBe(false)
  })

  it('ignores missing hours rather than treating them as zero', () => {
    const rule = { term: 'trueFeel', direction: 'below', threshold: 2 } as const
    // a null hour must not read as 0 and trigger a freeze alert
    expect(ruleFires(rule, [null, 18, null])).toBe(false)
  })

  it('never fires on an empty or fully-missing series', () => {
    const above = { term: 'uvIndex', direction: 'above', threshold: 8 } as const
    expect(ruleFires(above, [])).toBe(false)
    expect(ruleFires(above, [null, null])).toBe(false)
  })
})

describe('isAlertRule', () => {
  it('accepts a well-formed rule', () => {
    expect(isAlertRule({ term: 'uvIndex', direction: 'above', threshold: 8 })).toBe(true)
  })

  it('rejects an unknown term', () => {
    expect(isAlertRule({ term: 'moonPhase', direction: 'above', threshold: 8 })).toBe(false)
  })

  it('rejects an unknown direction', () => {
    expect(isAlertRule({ term: 'uvIndex', direction: 'sideways', threshold: 8 })).toBe(false)
  })

  it('rejects a non-finite threshold', () => {
    expect(isAlertRule({ term: 'uvIndex', direction: 'above', threshold: Number.NaN })).toBe(false)
    expect(isAlertRule({ term: 'uvIndex', direction: 'above', threshold: '8' })).toBe(false)
  })

  it('rejects a threshold outside the plausible range for its term', () => {
    // UV index tops out around 13; 400 is a typo, not an alert anyone wants
    expect(isAlertRule({ term: 'uvIndex', direction: 'above', threshold: 400 })).toBe(false)
    expect(isAlertRule({ term: 'trueFeel', direction: 'above', threshold: 300 })).toBe(false)
  })
})

describe('ruleSummary', () => {
  it('reads back as the sentence the user built', () => {
    expect(ruleSummary({ term: 'trueFeel', direction: 'above', threshold: 36 })).toBe(
      'True Feel goes above 36°',
    )
    expect(ruleSummary({ term: 'uvIndex', direction: 'above', threshold: 8 })).toBe('UV index goes above 8')
    expect(ruleSummary({ term: 'dewPoint', direction: 'below', threshold: 2 })).toBe(
      'Dew point drops below 2°',
    )
  })
})
