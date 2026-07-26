import { CityRail } from '@/features/location/CityRail'

import { DashboardBody } from './DashboardBody'
import { GearIcon, InfoIcon, MoonIcon, RefreshIcon, SunIcon } from './icons'
import { useToggles } from './use-toggles'
import { useWeather } from './use-weather'

import type { TempUnit } from './format-temp'
import type { StoredLocation } from '@/features/location/geocoding'
import type { LocationState } from '@/features/location/locations'

type ThemeMode = 'light' | 'dark'

interface DashboardProps {
  location: StoredLocation
  locations: LocationState
  onSelectCity: (index: number) => void
  onAddCity: () => void
  unit: TempUnit
  onSetUnit: (unit: TempUnit) => void
  onChangeLocation: () => void
  onOpenSettings: () => void
  onOpenAbout: () => void
  theme: ThemeMode
  onToggleTheme: () => void
}

export function Dashboard({
  location,
  locations,
  onSelectCity,
  onAddCity,
  unit,
  onSetUnit,
  onChangeLocation,
  onOpenSettings,
  onOpenAbout,
  theme,
  onToggleTheme,
}: DashboardProps) {
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
          {weather.status === 'ready' && (
            <button
              type="button"
              className="icon-btn"
              onClick={refetch}
              disabled={weather.isRefreshing}
              aria-label={weather.isRefreshing ? 'Refreshing weather reading' : 'Refresh weather reading'}
            >
              <RefreshIcon />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={onOpenAbout} aria-label="How this works">
            <InfoIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
      </div>

      <CityRail state={locations} onSelect={onSelectCity} onAdd={onAddCity} />

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
          theme={theme}
        />
      )}
    </main>
  )
}
