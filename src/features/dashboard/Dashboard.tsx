import { DashboardBody } from './DashboardBody'
import { useToggles } from './use-toggles'
import { useWeather } from './use-weather'

import type { TempUnit } from './format-temp'
import type { StoredLocation } from '@/features/location/geocoding'

interface DashboardProps {
  location: StoredLocation
  unit: TempUnit
  onSetUnit: (unit: TempUnit) => void
  onChangeLocation: () => void
  onOpenSettings: () => void
}

export function Dashboard({ location, unit, onSetUnit, onChangeLocation, onOpenSettings }: DashboardProps) {
  const [weather, refetch] = useWeather(location)
  const [toggles, updateToggles] = useToggles()

  return (
    <main className="app">
      <div className="loc-bar">
        <button type="button" onClick={onChangeLocation} aria-label={`Change location, currently ${location.label}`}>
          {location.label}
        </button>
        <span>
          {weather.status === 'ready'
            ? `${weather.snapshot.localTimeIso.slice(11, 16)} · ${weather.isStale ? 'stale' : 'live'}`
            : '· · ·'}
        </span>
        <button type="button" className="gear" onClick={onOpenSettings} aria-label="Settings">
          &#9881;
        </button>
      </div>

      {weather.status === 'loading' && <p className="note">Reading the street…</p>}

      {weather.status === 'error' && (
        <div className="stack">
          <p className="error">{weather.message}</p>
          <button type="button" className="btn" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {weather.status === 'ready' && (
        <DashboardBody
          weather={weather.snapshot}
          location={location}
          toggles={toggles}
          updateToggles={updateToggles}
          unit={unit}
          onSetUnit={onSetUnit}
        />
      )}
    </main>
  )
}
