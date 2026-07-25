import { useState } from 'react'

import { addLocation, parseLocations, removeLocation, setActive } from './locations'

import type { LocationState } from './locations'
import type { StoredLocation } from './geocoding'

/** Same key as the v0 single-location store — parseLocations migrates the old
 *  shape in place, so upgrading installs keep their city. */
const LOCATION_KEY = 'realtemp:location'

function read(): LocationState {
  try {
    return parseLocations(localStorage.getItem(LOCATION_KEY))
  } catch {
    return { items: [], activeIndex: 0 }
  }
}

function persist(state: LocationState): void {
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(state))
  } catch {
    // storage blocked — the list still works for this session
  }
}

export interface LocationsApi {
  state: LocationState
  active: StoredLocation | null
  add: (location: StoredLocation) => void
  remove: (index: number) => void
  select: (index: number) => void
  clear: () => void
}

export function useLocations(): LocationsApi {
  const [state, setState] = useState<LocationState>(read)

  const commit = (next: LocationState) => {
    persist(next)
    setState(next)
  }

  return {
    state,
    active: state.items[state.activeIndex] ?? null,
    add: (location) => commit(addLocation(state, location)),
    remove: (index) => commit(removeLocation(state, index)),
    select: (index) => commit(setActive(state, index)),
    clear: () => commit({ items: [], activeIndex: 0 }),
  }
}
