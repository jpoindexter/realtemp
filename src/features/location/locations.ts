import { z } from 'zod'

import { storedLocationSchema } from './geocoding'

import type { StoredLocation } from './geocoding'

/**
 * Saved cities. Pure state transitions — the hook and localStorage live
 * elsewhere so every rule here is testable without a DOM.
 */

/** Enough for a home city, a work city, and somewhere you're travelling to. */
export const MAX_LOCATIONS = 6

/** ~100m. Two searches for the same place must not become two entries. */
const DEDUPE_DECIMALS = 3

export interface LocationState {
  items: StoredLocation[]
  activeIndex: number
}

const EMPTY: LocationState = { items: [], activeIndex: 0 }

const listSchema = z.object({
  items: z.array(storedLocationSchema),
  activeIndex: z.number().int().nonnegative(),
})

const coordKey = (l: StoredLocation): string =>
  `${l.latitude.toFixed(DEDUPE_DECIMALS)},${l.longitude.toFixed(DEDUPE_DECIMALS)}`

/** Keeps activeIndex pointing at a real item, whatever the caller did. */
function clamp(state: LocationState): LocationState {
  if (state.items.length === 0) return EMPTY
  const activeIndex = Math.min(Math.max(0, state.activeIndex), state.items.length - 1)
  return { items: state.items, activeIndex }
}

/**
 * Reads stored cities, accepting the v0 shape — a single bare location object
 * under `realtemp:location`. Existing installs upgrade without losing their city.
 */
export function parseLocations(raw: string | null): LocationState {
  if (!raw) return EMPTY
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return EMPTY
  }

  const list = listSchema.safeParse(json)
  if (list.success) return clamp(list.data)

  const legacy = storedLocationSchema.safeParse(json)
  if (legacy.success) return { items: [legacy.data], activeIndex: 0 }

  return EMPTY
}

/** Adds a city and activates it. An existing city is activated, not duplicated. */
export function addLocation(state: LocationState, next: StoredLocation): LocationState {
  const existing = state.items.findIndex((l) => coordKey(l) === coordKey(next))
  if (existing !== -1) return { items: state.items, activeIndex: existing }

  const items = [...state.items, next]
  // Oldest out first — the list is a recency window, not an archive.
  const trimmed = items.slice(Math.max(0, items.length - MAX_LOCATIONS))
  return { items: trimmed, activeIndex: trimmed.length - 1 }
}

/** Removes a city, keeping whichever city was active still active where possible. */
export function removeLocation(state: LocationState, index: number): LocationState {
  if (index < 0 || index >= state.items.length) return state
  const items = state.items.filter((_, i) => i !== index)
  const activeIndex = index < state.activeIndex ? state.activeIndex - 1 : state.activeIndex
  return clamp({ items, activeIndex })
}

export function setActive(state: LocationState, index: number): LocationState {
  if (index < 0 || index >= state.items.length) return state
  return { items: state.items, activeIndex: index }
}
