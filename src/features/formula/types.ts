export type Exposure = 'sun' | 'shade' | 'overcast'
export type Environment = 'urban' | 'open' | 'nature'
export type Activity = 'stagnant' | 'walking' | 'active'
export type Acclimatization = 'new' | 'settling' | 'local'

export interface Toggles {
  exposure: Exposure
  environment: Environment
  activity: Activity
  acclimatization: Acclimatization
}

/** Nullable fields mean "provider didn't return it" — the formula degrades, never NaNs. */
export interface WeatherInputs {
  airTempC: number
  dewPointC: number | null
  /** 10 m wind speed in m/s (adapter must request m/s — Open-Meteo defaults to km/h). */
  windSpeedMs: number | null
  uvIndex: number | null
  solarZenithDeg: number
  localHour: number
  /** Mean of the past 14 daily-mean temps; null when the feed can't provide it. */
  baseline14C?: number | null
}

export type DeltaId = 'humidity' | 'wind' | 'solar' | 'environment' | 'activity' | 'acclimatization'

export interface Delta {
  id: DeltaId
  label: string
  deltaC: number
}

export interface TrueFeel {
  baseC: number
  deltas: Delta[]
  /** Always exactly baseC + Σ deltas — the ledger must sum. */
  trueFeelC: number
  sweatEfficiencyPct: number | null
  /** Premiums that could not be computed from the available data. */
  missing: DeltaId[]
  /** Sun below the horizon — solar premium is 0 whatever the exposure toggle says. */
  isNight: boolean
  /** Today's air temp sits ≥ 8°C off the 14-day baseline — flag the spike. */
  isWeatherShock: boolean
}
