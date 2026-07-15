import { useState } from 'react'

import { CopyLine } from '@/features/copy/CopyLine'
import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { solarZenithDeg } from '@/features/formula/solar-zenith'
import { ShadeMap } from '@/features/heatmap/ShadeMap'
import { OfficialAlertsPanel } from '@/features/official-alerts/OfficialAlertsPanel'
import { PushPanel } from '@/features/push/PushPanel'
import { computeHourlyTrueFeel } from '@/features/timeline/compute-hourly'
import { SafeWindowTimeline } from '@/features/timeline/SafeWindowTimeline'
import { deriveWarnings } from '@/features/warnings/derive-warnings'
import { WarningBanner } from '@/features/warnings/WarningBanner'
import { config } from '@/lib/config'

import { BodyPanel } from './BodyPanel'
import { BreakdownLedger } from './BreakdownLedger'
import { ForecastList } from './ForecastList'
import { SegmentedControl } from './SegmentedControl'
import { SweatGauge } from './SweatGauge'
import { WeatherFactors } from './WeatherFactors'
import { displayTemp } from './format-temp'
import { useBio } from './use-bio'

import type { TempUnit } from './format-temp'
import type { useToggles } from './use-toggles'
import type { StoredLocation } from '@/features/location/geocoding'
import type { WeatherSnapshot } from '@/features/weather/open-meteo'

const EXPOSURE_OPTIONS = [
  { value: 'sun', label: 'Sun' },
  { value: 'shade', label: 'Shade' },
  { value: 'overcast', label: 'Overcast' },
] as const

const ENVIRONMENT_OPTIONS = [
  { value: 'urban', label: 'Urban' },
  { value: 'open', label: 'Open' },
  { value: 'nature', label: 'Nature' },
] as const

const ACTIVITY_OPTIONS = [
  { value: 'stagnant', label: 'Stagnant' },
  { value: 'walking', label: 'Walking' },
  { value: 'active', label: 'Active' },
] as const

const ACCLIM_OPTIONS = [
  { value: 'new', label: 'New here' },
  { value: 'settling', label: 'Settling' },
  { value: 'local', label: 'Local' },
] as const

const TAB_OPTIONS = [
  { value: 'now', label: 'Now' },
  { value: 'forecast', label: 'Forecast' },
  { value: 'tune', label: 'Tune' },
] as const

type DashboardTab = (typeof TAB_OPTIONS)[number]['value']

interface DashboardBodyProps {
  weather: WeatherSnapshot
  location: StoredLocation
  toggles: ReturnType<typeof useToggles>[0]
  updateToggles: ReturnType<typeof useToggles>[1]
  unit: TempUnit
  onSetUnit: (unit: TempUnit) => void
}

export function DashboardBody({ weather, location, toggles, updateToggles, unit, onSetUnit }: DashboardBodyProps) {
  const [bio, updateBio] = useBio()
  const [activeTab, setActiveTab] = useState<DashboardTab>('now')
  const zenith = solarZenithDeg(weather.fetchedAt, location.latitude, location.longitude)
  const result = computeTrueFeel(
    {
      airTempC: weather.airTempC,
      dewPointC: weather.dewPointC,
      windSpeedMs: weather.windSpeedMs,
      uvIndex: weather.uvIndex,
      solarZenithDeg: zenith,
      localHour: weather.localHour,
      baseline14C: weather.baseline14C,
    },
    toggles,
    bio,
  )
  const hourlyTrueFeel = computeHourlyTrueFeel(
    weather.hourly,
    {
      utcOffsetSeconds: weather.utcOffsetSeconds,
      latitude: location.latitude,
      longitude: location.longitude,
      baseline14C: weather.baseline14C,
      bio,
    },
    toggles,
  )

  return (
    <>
      <section className="hero" aria-live="polite">
        <div className="big">
          {displayTemp(result.trueFeelC, unit)}
          <button
            type="button"
            className="unit"
            onClick={() => onSetUnit(unit === 'c' ? 'f' : 'c')}
            aria-label={`Shown in ${unit === 'c' ? 'Celsius' : 'Fahrenheit'} — switch to ${unit === 'c' ? 'Fahrenheit' : 'Celsius'}`}
          >
            &deg;{unit === 'c' ? 'C' : 'F'}
          </button>
        </div>
        <p className="cap">
          True Feel &middot; air says {displayTemp(result.baseC, unit)}&deg;
          {result.isWeatherShock && <span className="badge shock">weather shock</span>}
          {result.missing.length > 0 && <span className="badge">partial data</span>}
        </p>
        {config.apiBase && <CopyLine apiBase={config.apiBase} location={location} result={result} />}
      </section>

      <WarningBanner
        warnings={deriveWarnings({
          trueFeelC: result.trueFeelC,
          uvIndex: weather.uvIndex,
          windSpeedMs: weather.windSpeedMs,
          isNight: result.isNight,
        })}
      />

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`dashboard-tab-${tab.value}`}
            aria-selected={activeTab === tab.value}
            aria-controls={`dashboard-panel-${tab.value}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'now' && (
        <section
          className="tab-panel"
          id="dashboard-panel-now"
          role="tabpanel"
          aria-labelledby="dashboard-tab-now"
        >
          <WeatherFactors weather={weather} unit={unit} />
          <BreakdownLedger result={result} unit={unit} />
          {config.apiBase && <OfficialAlertsPanel apiBase={config.apiBase} location={location} />}
        </section>
      )}

      {activeTab === 'forecast' && (
        <section
          className="tab-panel"
          id="dashboard-panel-forecast"
          role="tabpanel"
          aria-labelledby="dashboard-tab-forecast"
        >
          <section className="body-panel" aria-labelledby="next-24h-title">
            <h2 id="next-24h-title" className="body-panel-title">Next 24 h + sweat</h2>
            <div className="stack">
              <SweatGauge pct={result.sweatEfficiencyPct} />
              <SafeWindowTimeline points={hourlyTrueFeel} unit={unit} />
              <ForecastList hourly={weather.hourly} trueFeel={hourlyTrueFeel} unit={unit} />
            </div>
          </section>
          <ShadeMap location={location} />
        </section>
      )}

      {activeTab === 'tune' && (
        <section
          className="tab-panel"
          id="dashboard-panel-tune"
          role="tabpanel"
          aria-labelledby="dashboard-tab-tune"
        >
          <div className="segs">
            <SegmentedControl
              legend="Exposure"
              name="exposure"
              options={EXPOSURE_OPTIONS}
              value={toggles.exposure}
              onChange={(exposure) => updateToggles({ exposure })}
            />
            {result.isNight && (
              <p className="note" role="status">
                Night — there's no sun to toggle. Your exposure choice kicks back in at dawn.
              </p>
            )}
            <SegmentedControl
              legend="Surroundings"
              name="environment"
              options={ENVIRONMENT_OPTIONS}
              value={toggles.environment}
              onChange={(environment) => updateToggles({ environment })}
            />
            <SegmentedControl
              legend="Activity"
              name="activity"
              options={ACTIVITY_OPTIONS}
              value={toggles.activity}
              onChange={(activity) => updateToggles({ activity })}
            />
          </div>

          <section className="body-panel" aria-labelledby="acclimatization-title">
            <h2 id="acclimatization-title" className="body-panel-title">Acclimatization</h2>
            <div className="stack">
              <SegmentedControl
                legend="Acclimatized to this weather"
                name="acclimatization"
                options={ACCLIM_OPTIONS}
                value={toggles.acclimatization}
                onChange={(acclimatization) => updateToggles({ acclimatization })}
              />
            </div>
          </section>

          <BodyPanel bio={bio} onChange={updateBio} />
          {config.apiBase && <PushPanel apiBase={config.apiBase} location={location} />}
        </section>
      )}
    </>
  )
}
