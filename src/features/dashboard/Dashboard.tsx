import { DashboardBody } from './DashboardBody'
import { GearIcon, InfoIcon } from './icons'
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
  onOpenAbout: () => void
}

export function Dashboard({ location, unit, onSetUnit, onChangeLocation, onOpenSettings, onOpenAbout }: DashboardProps) {
  const [weather, refetch] = useWeather(location)
  const [toggles, updateToggles] = useToggles()

  return (
    <main className="app">
      <div className="loc-bar">
        <button type="button" onClick={onChangeLocation} aria-label={`Change location, currently ${location.label}`}>
          {location.label}
        </button>
        <span role="status">
          {weather.status === 'ready'
            ? `${weather.snapshot.localTimeIso.slice(11, 16)} · ${weather.isRefreshing ? 'updating…' : weather.isStale ? 'stale' : 'live'}`
            : '· · ·'}
        </span>
        <div className="icon-btns">
          <button type="button" className="icon-btn" onClick={onOpenAbout} aria-label="How this works">
            <InfoIcon />
          </button>
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
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
