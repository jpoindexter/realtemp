import { describe, expect, it } from 'vitest'

import { MAX_LOCATIONS, addLocation, parseLocations, removeLocation, setActive } from './locations'

const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }
const madrid = { label: 'Madrid', latitude: 40.42, longitude: -3.7 }
const lisbon = { label: 'Lisbon', latitude: 38.72, longitude: -9.14 }

describe('parseLocations', () => {
  it('migrates a legacy single location into a one-item list', () => {
    // v0 stored one bare object under realtemp:location — existing installs must
    // not lose their city on upgrade
    const state = parseLocations(JSON.stringify(valencia))
    expect(state.items).toEqual([valencia])
    expect(state.activeIndex).toBe(0)
  })

  it('parses a stored multi-city list', () => {
    const state = parseLocations(JSON.stringify({ items: [valencia, madrid], activeIndex: 1 }))
    expect(state.items).toHaveLength(2)
    expect(state.activeIndex).toBe(1)
  })

  it('returns an empty list for null, junk, or an unparseable shape', () => {
    expect(parseLocations(null).items).toEqual([])
    expect(parseLocations('not json').items).toEqual([])
    expect(parseLocations(JSON.stringify({ items: 'nope' })).items).toEqual([])
  })

  it('clamps an out-of-range activeIndex rather than rendering nothing', () => {
    const state = parseLocations(JSON.stringify({ items: [valencia], activeIndex: 7 }))
    expect(state.activeIndex).toBe(0)
  })
})

describe('addLocation', () => {
  it('appends a new city and makes it active', () => {
    const state = addLocation({ items: [valencia], activeIndex: 0 }, madrid)
    expect(state.items).toEqual([valencia, madrid])
    expect(state.activeIndex).toBe(1)
  })

  it('does not duplicate a city already in the list — it activates it instead', () => {
    const nudged = { ...valencia, label: 'Valencia, ES' }
    const state = addLocation({ items: [madrid, valencia], activeIndex: 0 }, nudged)
    expect(state.items).toHaveLength(2)
    expect(state.activeIndex).toBe(1)
  })

  it('drops the oldest city once the cap is reached', () => {
    const full = Array.from({ length: MAX_LOCATIONS }, (_, i) => ({
      label: `City ${i}`,
      latitude: i,
      longitude: i,
    }))
    const state = addLocation({ items: full, activeIndex: 0 }, lisbon)
    expect(state.items).toHaveLength(MAX_LOCATIONS)
    expect(state.items[0]?.label).toBe('City 1')
    expect(state.items.at(-1)).toEqual(lisbon)
    expect(state.activeIndex).toBe(MAX_LOCATIONS - 1)
  })
})

describe('removeLocation', () => {
  it('removes the city at the index', () => {
    const state = removeLocation({ items: [valencia, madrid], activeIndex: 0 }, 1)
    expect(state.items).toEqual([valencia])
  })

  it('keeps the same city active when an earlier one is removed', () => {
    const state = removeLocation({ items: [valencia, madrid, lisbon], activeIndex: 2 }, 0)
    expect(state.items.at(state.activeIndex)).toEqual(lisbon)
  })

  it('never leaves activeIndex past the end after removing the last city', () => {
    const state = removeLocation({ items: [valencia, madrid], activeIndex: 1 }, 1)
    expect(state.activeIndex).toBe(0)
    expect(state.items).toEqual([valencia])
  })

  it('ignores an out-of-range index instead of corrupting the list', () => {
    const before = { items: [valencia], activeIndex: 0 }
    expect(removeLocation(before, 9)).toEqual(before)
  })
})

describe('setActive', () => {
  it('switches the active city', () => {
    expect(setActive({ items: [valencia, madrid], activeIndex: 0 }, 1).activeIndex).toBe(1)
  })

  it('ignores an index that does not exist', () => {
    expect(setActive({ items: [valencia], activeIndex: 0 }, 5).activeIndex).toBe(0)
  })
})
