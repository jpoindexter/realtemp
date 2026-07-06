export type Exposure = 'sun' | 'shade' | 'overcast'
export type Environment = 'urban' | 'open' | 'nature'
export type Activity = 'stagnant' | 'walking' | 'active'

export interface Toggles {
  exposure: Exposure
  environment: Environment
  activity: Activity
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
}

export type DeltaId = 'humidity' | 'wind' | 'solar' | 'environment' | 'activity'

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
}
