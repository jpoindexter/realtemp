import { CopyLine } from '@/features/copy/CopyLine'
import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { solarZenithDeg } from '@/features/formula/solar-zenith'
import { ShadeMap } from '@/features/heatmap/ShadeMap'
import { PushPanel } from '@/features/push/PushPanel'
import { ReportButtons } from '@/features/reports/ReportButtons'
import { computeHourlyTrueFeel } from '@/features/timeline/compute-hourly'
import { SafeWindowTimeline } from '@/features/timeline/SafeWindowTimeline'
import { deriveWarnings } from '@/features/warnings/derive-warnings'
import { WarningBanner } from '@/features/warnings/WarningBanner'
import { config } from '@/lib/config'

import { BodyPanel } from './BodyPanel'
import { BreakdownLedger } from './BreakdownLedger'
import { SegmentedControl } from './SegmentedControl'
import { SweatGauge } from './SweatGauge'
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

      <BreakdownLedger result={result} unit={unit} />

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

      <details className="body-panel">
        <summary>Next 24 h + sweat</summary>
        <div className="stack">
          <SweatGauge pct={result.sweatEfficiencyPct} />

          <SafeWindowTimeline
            points={computeHourlyTrueFeel(
              weather.hourly,
              {
                utcOffsetSeconds: weather.utcOffsetSeconds,
                latitude: location.latitude,
                longitude: location.longitude,
                baseline14C: weather.baseline14C,
                bio,
              },
              toggles,
            )}
            unit={unit}
          />
        </div>
      </details>

      <details className="body-panel">
        <summary>Acclimatization</summary>
        <div className="stack">
          <SegmentedControl
            legend="Acclimatized to this weather"
            name="acclimatization"
            options={ACCLIM_OPTIONS}
            value={toggles.acclimatization}
            onChange={(acclimatization) => updateToggles({ acclimatization })}
          />
        </div>
      </details>

      <BodyPanel bio={bio} onChange={updateBio} />

      {config.apiBase && (
        <details className="body-panel">
          <summary>Street feedback</summary>
          <div className="stack">
            <ReportButtons apiBase={config.apiBase} location={location} />
          </div>
        </details>
      )}

      {config.apiBase && <PushPanel apiBase={config.apiBase} location={location} />}

      <ShadeMap location={location} />
    </>
  )
}
