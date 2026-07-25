import { useState } from 'react'

import { useAirQuality } from '@/features/air/use-air-quality'
import { CopyLine } from '@/features/copy/CopyLine'
import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { solarZenithDeg } from '@/features/formula/solar-zenith'
import { ShadeMap } from '@/features/heatmap/ShadeMap'
import { OfficialAlertsPanel } from '@/features/official-alerts/OfficialAlertsPanel'
import { PushPanel } from '@/features/push/PushPanel'
import { RadarMap } from '@/features/radar/RadarMap'
import { computeHourlyTrueFeel } from '@/features/timeline/compute-hourly'
import { SafeWindowTimeline } from '@/features/timeline/SafeWindowTimeline'
import { deriveWarnings } from '@/features/warnings/derive-warnings'
import { WarningBanner } from '@/features/warnings/WarningBanner'
import { config } from '@/lib/config'

import { BreakdownLedger } from './BreakdownLedger'
import { ForecastList } from './ForecastList'
import { SegmentedControl } from './SegmentedControl'
import { SweatGauge } from './SweatGauge'
import { WeatherFactors } from './WeatherFactors'
import { displayTemp } from './format-temp'
import { useThermal } from './use-thermal'

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
  { value: 'maps', label: 'Maps' },
  { value: 'tune', label: 'Tune' },
] as const

/* Radar and shade are both square, so stacking them costs ~860px and the tab
   could never fit a phone. They answer different questions ("is rain coming?"
   vs "where is shade now?"), so only one is ever wanted at a time. */
const MAP_VIEW_OPTIONS = [
  { value: 'radar', label: 'Radar' },
  { value: 'shade', label: 'Shade' },
] as const

type DashboardTab = (typeof TAB_OPTIONS)[number]['value']
type MapView = (typeof MAP_VIEW_OPTIONS)[number]['value']

interface DashboardBodyProps {
  weather: WeatherSnapshot
  location: StoredLocation
  toggles: ReturnType<typeof useToggles>[0]
  updateToggles: ReturnType<typeof useToggles>[1]
  unit: TempUnit
  onSetUnit: (unit: TempUnit) => void
}

export function DashboardBody({ weather, location, toggles, updateToggles, unit, onSetUnit }: DashboardBodyProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('now')
  const [mapView, setMapView] = useState<MapView>('radar')
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
  )
  const hourlyTrueFeel = computeHourlyTrueFeel(
    weather.hourly,
    {
      utcOffsetSeconds: weather.utcOffsetSeconds,
      latitude: location.latitude,
      longitude: location.longitude,
      baseline14C: weather.baseline14C,
    },
    toggles,
  )
  useThermal(result.trueFeelC)
  const air = useAirQuality(location)

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
          True Feel &middot; Open-Meteo air says {displayTemp(result.baseC, unit)}&deg;
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
          <WeatherFactors weather={weather} unit={unit} air={air} />
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
          <SweatGauge pct={result.sweatEfficiencyPct} />
          <SafeWindowTimeline points={hourlyTrueFeel} unit={unit} />
          <ForecastList hourly={weather.hourly} trueFeel={hourlyTrueFeel} unit={unit} />
        </section>
      )}

      {activeTab === 'maps' && (
        <section
          className="tab-panel"
          id="dashboard-panel-maps"
          role="tabpanel"
          aria-labelledby="dashboard-tab-maps"
        >
          <SegmentedControl
            legend="Map"
            name="map-view"
            options={MAP_VIEW_OPTIONS}
            value={mapView}
            onChange={setMapView}
          />
          {mapView === 'radar' ? <RadarMap location={location} /> : <ShadeMap location={location} />}
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
            {/* Was a bordered panel titled "Acclimatization" wrapping a legend
                that said "Acclimatized to this weather" — two labels for one
                control, in a different container idiom than the three toggles
                above it. It is the same kind of control, so it joins them. */}
            <SegmentedControl
              legend="Acclimatized to this weather"
              name="acclimatization"
              options={ACCLIM_OPTIONS}
              value={toggles.acclimatization}
              onChange={(acclimatization) => updateToggles({ acclimatization })}
            />
          </div>

          {config.apiBase && <PushPanel apiBase={config.apiBase} location={location} />}
        </section>
      )}
    </>
  )
}
