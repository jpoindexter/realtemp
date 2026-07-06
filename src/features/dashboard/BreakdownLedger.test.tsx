import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BreakdownLedger } from './BreakdownLedger'

import type { TrueFeel } from '@/features/formula/types'

afterEach(cleanup)

const base: TrueFeel = {
  baseC: 24,
  deltas: [
    { id: 'humidity', label: 'humidity friction', deltaC: 1.6 },
    { id: 'wind', label: 'wind', deltaC: -1.6 },
    { id: 'solar', label: 'sun premium', deltaC: 0 },
    { id: 'environment', label: 'surroundings', deltaC: 2 },
    { id: 'activity', label: 'activity', deltaC: 1 },
  ],
  trueFeelC: 27,
  sweatEfficiencyPct: 69,
  missing: [],
  isNight: false,
}

describe('BreakdownLedger', () => {
  it('labels the zeroed solar row as night so the exposure toggle never looks broken', () => {
    render(<BreakdownLedger result={{ ...base, isNight: true }} />)
    expect(screen.getByText('sun premium · night')).toBeDefined()
  })

  it('keeps the plain label in daylight', () => {
    render(<BreakdownLedger result={base} />)
    expect(screen.getByText('sun premium')).toBeDefined()
  })
})
