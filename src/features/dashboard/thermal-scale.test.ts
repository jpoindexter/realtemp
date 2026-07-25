import { describe, expect, it } from 'vitest'

import { INK_FLIP_L, thermalStop, thermalPolarity } from './thermal-scale'

describe('thermalStop', () => {
  it('runs cold to hot across the meteorological hue range', () => {
    // cold end sits in the blue/violet arc, hot end in the red arc
    expect(thermalStop(-10).h).toBeGreaterThan(200)
    expect(thermalStop(45).h).toBeLessThan(60)
  })

  it('gets darker as it gets hotter — red only exists at low lightness', () => {
    expect(thermalStop(-10).l).toBeGreaterThan(thermalStop(20).l)
    expect(thermalStop(20).l).toBeGreaterThan(thermalStop(40).l)
  })

  it('clamps below and above the ramp instead of extrapolating into nonsense', () => {
    expect(thermalStop(-100)).toEqual(thermalStop(-10))
    expect(thermalStop(999)).toEqual(thermalStop(46))
  })

  it('interpolates between stops rather than stepping', () => {
    const a = thermalStop(22)
    const b = thermalStop(28)
    const mid = thermalStop(25)
    expect(mid.l).toBeLessThan(a.l)
    expect(mid.l).toBeGreaterThan(b.l)
  })

  it('is continuous — no jump bigger than a hair between adjacent degrees', () => {
    for (let t = -10; t < 46; t++) {
      const here = thermalStop(t)
      const next = thermalStop(t + 1)
      expect(Math.abs(next.l - here.l)).toBeLessThan(0.05)
      expect(Math.abs(next.c - here.c)).toBeLessThan(0.05)
    }
  })

  it('never exceeds the chroma the sRGB gamut holds at that lightness', () => {
    for (let t = -10; t <= 46; t++) {
      expect(thermalStop(t).c).toBeLessThanOrEqual(0.24)
    }
  })
})

describe('thermalPolarity', () => {
  it('asks for dark ink on a light ground and light ink on a dark one', () => {
    expect(thermalPolarity(0.95)).toBe('light')
    expect(thermalPolarity(0.4)).toBe('dark')
  })

  it('flips exactly at the documented lightness, not somewhere near it', () => {
    expect(thermalPolarity(INK_FLIP_L + 0.001)).toBe('light')
    expect(thermalPolarity(INK_FLIP_L - 0.001)).toBe('dark')
  })

  // The ramp is deliberately capped above INK_FLIP_L so it never enters the
  // dead band where no ink reaches 4.5:1. thermalPolarity stays as the guard
  // that catches a future stop being pushed down into it.
  it('keeps every stop on the ramp in dark-ink territory', () => {
    for (let t = -15; t <= 50; t++) {
      expect(thermalPolarity(thermalStop(t).l)).toBe('light')
    }
  })

  it('leaves headroom above the flip, so a small tweak cannot silently cross it', () => {
    expect(thermalStop(46).l).toBeGreaterThan(INK_FLIP_L + 0.05)
  })
})
