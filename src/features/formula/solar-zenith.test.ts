import { describe, expect, it } from 'vitest'

import { solarZenithDeg } from './solar-zenith'

const VALENCIA = { lat: 39.47, lon: -0.376 }

describe('solarZenithDeg', () => {
  it('puts Valencia near-noon July sun high in the sky (zenith ≈ lat − declination)', () => {
    const z = solarZenithDeg(new Date(Date.UTC(2026, 6, 6, 12, 0)), VALENCIA.lat, VALENCIA.lon)
    expect(z).toBeGreaterThan(13)
    expect(z).toBeLessThan(21)
  })

  it('puts the midnight sun well below the horizon', () => {
    const z = solarZenithDeg(new Date(Date.UTC(2026, 6, 6, 0, 0)), VALENCIA.lat, VALENCIA.lon)
    expect(z).toBeGreaterThan(105)
    expect(z).toBeLessThan(130)
  })

  it('winter noon sits far lower than summer noon', () => {
    const summer = solarZenithDeg(new Date(Date.UTC(2026, 6, 6, 12, 0)), VALENCIA.lat, VALENCIA.lon)
    const winter = solarZenithDeg(new Date(Date.UTC(2026, 11, 21, 12, 0)), VALENCIA.lat, VALENCIA.lon)
    expect(winter - summer).toBeGreaterThan(40)
  })
})
