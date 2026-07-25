import { useEffect, useState } from 'react'

import { fetchAirQuality } from './air-quality'

import type { AirQuality } from './air-quality'
import type { StoredLocation } from '@/features/location/geocoding'

interface AirState {
  key: string
  air: AirQuality | null
}

/**
 * Air quality for the current location. Secondary to the reading, so it fails
 * quietly: null means "no figure to show" and the cell renders `--` rather than
 * taking the screen down with it.
 *
 * The result is keyed by coordinates and the staleness is *derived* rather than
 * cleared with a setState at the top of the effect — react-hooks v7 forbids
 * synchronous setState inside an effect, the same constraint use-weather works
 * around.
 */
export function useAirQuality(location: StoredLocation): AirQuality | null {
  const key = `${location.latitude},${location.longitude}`
  const [state, setState] = useState<AirState>({ key, air: null })

  useEffect(() => {
    let cancelled = false
    void fetchAirQuality(location.latitude, location.longitude).then((result) => {
      if (!cancelled && result.ok) setState({ key, air: result.value })
    })
    return () => {
      cancelled = true
    }
  }, [key, location.latitude, location.longitude])

  // A result from a previous location is not this location's air quality.
  return state.key === key ? state.air : null
}
