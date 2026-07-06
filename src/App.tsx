import { useState } from 'react'

import { Dashboard } from '@/features/dashboard/Dashboard'
import { LocationSearch } from '@/features/location/LocationSearch'
import { storedLocationSchema } from '@/features/location/geocoding'

import type { StoredLocation } from '@/features/location/geocoding'

const LOCATION_KEY = 'realtemp:location'

function readStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    const parsed = storedLocationSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function App() {
  const [location, setLocation] = useState<StoredLocation | null>(readStoredLocation)

  const pickLocation = (next: StoredLocation) => {
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(next))
    } catch {
      // storage blocked — location still works for the session
    }
    setLocation(next)
  }

  if (!location) return <LocationSearch onPick={pickLocation} />
  return <Dashboard location={location} onChangeLocation={() => setLocation(null)} />
}
