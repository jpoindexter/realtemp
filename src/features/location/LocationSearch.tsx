import { useState } from 'react'

import { getGeolocation, searchPlaces } from './geocoding'

import type { Place, StoredLocation } from './geocoding'

interface LocationSearchProps {
  onPick: (location: StoredLocation) => void
}

type SearchState =
  | { status: 'idle' }
  | { status: 'busy' }
  | { status: 'results'; places: Place[] }
  | { status: 'error'; message: string }

export function LocationSearch({ onPick }: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  const runSearch = async () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    setState({ status: 'busy' })
    const result = await searchPlaces(trimmed)
    if (!result.ok) setState({ status: 'error', message: result.error.message })
    else if (result.value.length === 0)
      setState({ status: 'error', message: `No places match “${trimmed}”. Try another spelling.` })
    else setState({ status: 'results', places: result.value })
  }

  const useMyLocation = async () => {
    setState({ status: 'busy' })
    const result = await getGeolocation()
    if (result.ok) onPick(result.value)
    else setState({ status: 'error', message: result.error.message })
  }

  return (
    <main className="app stack">
      <h1 className="title">RealTemp</h1>
      <p className="note">The temperature your body actually meets on the street — math included. Where are you?</p>

      <button type="button" className="btn" onClick={useMyLocation} disabled={state.status === 'busy'}>
        Use my location
      </button>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void runSearch()
        }}
      >
        <label htmlFor="city-search" className="note">
          Or search for a city
        </label>
        <input
          id="city-search"
          className="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Valencia"
          autoComplete="off"
        />
        <button type="submit" className="btn quiet" disabled={state.status === 'busy'}>
          Search
        </button>
      </form>

      {state.status === 'busy' && <p className="note">Looking…</p>}
      {state.status === 'error' && <p className="error">{state.message}</p>}
      {state.status === 'results' && (
        <ul className="place-list">
          {state.places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() =>
                  onPick({ label: place.name, latitude: place.latitude, longitude: place.longitude })
                }
              >
                <span>{place.name}</span>
                <span className="region">{place.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
