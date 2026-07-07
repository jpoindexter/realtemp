import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { solarZenithDeg } from '@/features/formula/solar-zenith'

import { CopyLine } from '@/features/copy/CopyLine'
import { ReportButtons } from '@/features/reports/ReportButtons'
import { computeHourlyTrueFeel } from '@/features/timeline/compute-hourly'
import { SafeWindowTimeline } from '@/features/timeline/SafeWindowTimeline'
import { config } from '@/lib/config'

import { BodyPanel } from './BodyPanel'
import { BreakdownLedger } from './BreakdownLedger'
import { SegmentedControl } from './SegmentedControl'
import { SweatGauge } from './SweatGauge'
import { displayTemp } from './format-temp'
import { useBio } from './use-bio'
import { useToggles } from './use-toggles'
import { useUnit } from './use-unit'
import { useWeather } from './use-weather'

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

interface DashboardProps {
  location: StoredLocation
  onChangeLocation: () => void
}

export function Dashboard({ location, onChangeLocation }: DashboardProps) {
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
        <DashboardBody weather={weather.snapshot} location={location} toggles={toggles} updateToggles={updateToggles} />
      )}
    </main>
  )
}

type BodyProps = {
  weather: WeatherSnapshot
  location: StoredLocation
  toggles: ReturnType<typeof useToggles>[0]
  updateToggles: ReturnType<typeof useToggles>[1]
}

function DashboardBody({ weather, location, toggles, updateToggles }: BodyProps) {
  const [unit, toggleUnit] = useUnit()
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
            onClick={toggleUnit}
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
        <SegmentedControl
          legend="Acclimatized to this weather"
          name="acclimatization"
          options={ACCLIM_OPTIONS}
          value={toggles.acclimatization}
          onChange={(acclimatization) => updateToggles({ acclimatization })}
        />
      </div>

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

      <BodyPanel bio={bio} onChange={updateBio} />

      {config.apiBase && <ReportButtons apiBase={config.apiBase} location={location} />}
    </>
  )
}
