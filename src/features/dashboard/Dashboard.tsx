import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { solarZenithDeg } from '@/features/formula/solar-zenith'

import { BreakdownLedger } from './BreakdownLedger'
import { SegmentedControl } from './SegmentedControl'
import { SweatGauge } from './SweatGauge'
import { useToggles } from './use-toggles'
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
          {weather.status === 'ready' ? `${weather.snapshot.localTimeIso.slice(11, 16)} · live` : '· · ·'}
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
  const zenith = solarZenithDeg(weather.fetchedAt, location.latitude, location.longitude)
  const result = computeTrueFeel(
    {
      airTempC: weather.airTempC,
      dewPointC: weather.dewPointC,
      windSpeedMs: weather.windSpeedMs,
      uvIndex: weather.uvIndex,
      solarZenithDeg: zenith,
      localHour: weather.localHour,
    },
    toggles,
  )

  return (
    <>
      <section className="hero" aria-live="polite">
        <div className="big">
          {result.trueFeelC.toFixed(1)}
          <span className="unit">&deg;C</span>
        </div>
        <p className="cap">
          True Feel &middot; air says {result.baseC.toFixed(1)}&deg;
          {result.missing.length > 0 && <span className="badge">partial data</span>}
        </p>
      </section>

      <BreakdownLedger result={result} />

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

      <SweatGauge pct={result.sweatEfficiencyPct} />
    </>
  )
}
