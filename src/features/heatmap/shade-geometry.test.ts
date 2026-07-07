import { describe, expect, it } from 'vitest'

import { solarAzimuthDeg } from '@/features/formula/solar-azimuth'

import { project, shadowLengthM, shadowOffset, shadowPolygons } from './shade-geometry'

const VALENCIA: [number, number] = [39.47, -0.376]

describe('project', () => {
  it('maps north to −y and east to +x, in meters', () => {
    const north = project([39.471, -0.376], VALENCIA)
    const east = project([39.47, -0.375], VALENCIA)
    expect(north.y).toBeCloseTo(-111.32, 1)
    expect(north.x).toBeCloseTo(0, 5)
    expect(east.x).toBeCloseTo(111.32 * Math.cos((39.47 * Math.PI) / 180), 1)
  })
})

describe('shadowLengthM', () => {
  it('grows with zenith and vanishes at night', () => {
    expect(shadowLengthM(4, 45)).toBeCloseTo(12, 5) // 12 m building, 45° sun → 12 m shadow
    expect(shadowLengthM(4, 20)).toBeLessThan(shadowLengthM(4, 70))
    expect(shadowLengthM(4, 95)).toBe(0)
  })
})

describe('shadowOffset', () => {
  it('casts north-falling shadows when the sun is due south', () => {
    const o = shadowOffset(180, 10) // sun south → shadow north → −y on screen
    expect(o.x).toBeCloseTo(0, 5)
    expect(o.y).toBeCloseTo(-10, 5)
  })

  it('casts west-falling shadows for a morning eastern sun', () => {
    const o = shadowOffset(90, 10) // sun east → shadow west → −x
    expect(o.x).toBeCloseTo(-10, 5)
    expect(o.y).toBeCloseTo(0, 1)
  })
})

describe('shadowPolygons', () => {
  it('emits one quad per edge plus the translated footprint', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const polys = shadowPolygons(square, { x: 5, y: -5 })
    expect(polys).toHaveLength(5)
    expect(polys[4]![0]).toEqual({ x: 5, y: -5 })
  })

  it('returns nothing for degenerate rings', () => {
    expect(shadowPolygons([{ x: 0, y: 0 }], { x: 1, y: 1 })).toEqual([])
  })
})

describe('solarAzimuthDeg', () => {
  it('puts the July sun east of south in the morning, west after solar noon', () => {
    const morning = solarAzimuthDeg(new Date(Date.UTC(2026, 6, 7, 7, 0)), ...VALENCIA)
    const afternoon = solarAzimuthDeg(new Date(Date.UTC(2026, 6, 7, 16, 0)), ...VALENCIA)
    expect(morning).toBeGreaterThan(60)
    expect(morning).toBeLessThan(180)
    expect(afternoon).toBeGreaterThan(180)
    expect(afternoon).toBeLessThan(300)
  })

  it('is ~south at solar noon', () => {
    const noon = solarAzimuthDeg(new Date(Date.UTC(2026, 6, 7, 12, 5)), ...VALENCIA)
    expect(noon).toBeGreaterThan(160)
    expect(noon).toBeLessThan(200)
  })
})
