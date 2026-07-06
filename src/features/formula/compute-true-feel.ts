import {
  ACTIVITY_DELTA_C,
  CONVECTIVE_ACTIVITY_FACTOR,
  CONVECTIVE_WIND_THRESHOLD_MS,
  EXPOSURE_FACTOR,
  NATURE_DELTA_C,
  SOLAR_PREMIUM_MAX_C,
  STEADMAN_BASELINE,
  STEADMAN_VAPOR_COEF,
  STEADMAN_WIND_COEF,
  STREET_WIND_FACTOR,
  SWEAT_TD_FULL_C,
  SWEAT_TD_ZERO_C,
  URBAN_DELTA_OFFPEAK_C,
  URBAN_DELTA_PEAK_C,
  URBAN_PEAK_END_HOUR,
  URBAN_PEAK_START_HOUR,
  UV_TO_PREMIUM,
  VAPOR_A,
  VAPOR_B,
  VAPOR_C,
} from './constants'

import type { Delta, DeltaId, Toggles, TrueFeel, WeatherInputs } from './types'

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

const round1 = (v: number): number => Math.round(v * 10) / 10

/** Vapor pressure (hPa) from dew point — the PRD's absolute-moisture stance. */
export function vaporPressureHpa(dewPointC: number): number {
  return VAPOR_A * Math.exp((VAPOR_B * dewPointC) / (VAPOR_C + dewPointC))
}

function humidityDelta(dewPointC: number): number {
  return STEADMAN_VAPOR_COEF * vaporPressureHpa(dewPointC) - STEADMAN_BASELINE
}

function windDelta(streetWindMs: number): number {
  return -STEADMAN_WIND_COEF * streetWindMs
}

function solarDelta(uvIndex: number, zenithDeg: number, exposure: Toggles['exposure']): number {
  const zenithWeight = Math.max(0, Math.cos((zenithDeg * Math.PI) / 180))
  const premium = clamp(uvIndex * UV_TO_PREMIUM, 0, SOLAR_PREMIUM_MAX_C)
  return premium * zenithWeight * EXPOSURE_FACTOR[exposure]
}

function environmentDelta(environment: Toggles['environment'], localHour: number): number {
  if (environment === 'nature') return NATURE_DELTA_C
  if (environment === 'open') return 0
  const isPeak = localHour >= URBAN_PEAK_START_HOUR && localHour < URBAN_PEAK_END_HOUR
  return isPeak ? URBAN_DELTA_PEAK_C : URBAN_DELTA_OFFPEAK_C
}

function activityDelta(activity: Toggles['activity'], streetWindMs: number | null): number {
  const base = ACTIVITY_DELTA_C[activity]
  const windy = streetWindMs !== null && streetWindMs > CONVECTIVE_WIND_THRESHOLD_MS
  return windy ? base * CONVECTIVE_ACTIVITY_FACTOR : base
}

/** 100% at/below Td 10°C, linearly to 0% at/above Td 26°C. */
export function sweatEfficiencyPct(dewPointC: number): number {
  const span = SWEAT_TD_ZERO_C - SWEAT_TD_FULL_C
  return round1(clamp(((SWEAT_TD_ZERO_C - dewPointC) / span) * 100, 0, 100))
}

/**
 * The whole product. Pure; missing inputs drop their premium into `missing`
 * instead of corrupting the total. Ledger invariant: trueFeelC = baseC + Σ deltas.
 */
export function computeTrueFeel(inputs: WeatherInputs, toggles: Toggles): TrueFeel {
  const streetWindMs = inputs.windSpeedMs === null ? null : inputs.windSpeedMs * STREET_WIND_FACTOR
  const deltas: Delta[] = []
  const missing: DeltaId[] = []

  if (inputs.dewPointC === null) missing.push('humidity')
  else deltas.push({ id: 'humidity', label: 'humidity friction', deltaC: round1(humidityDelta(inputs.dewPointC)) })

  if (streetWindMs === null) missing.push('wind')
  else deltas.push({ id: 'wind', label: 'wind', deltaC: round1(windDelta(streetWindMs)) })

  if (inputs.uvIndex === null) missing.push('solar')
  else deltas.push({ id: 'solar', label: 'sun premium', deltaC: round1(solarDelta(inputs.uvIndex, inputs.solarZenithDeg, toggles.exposure)) })

  deltas.push({ id: 'environment', label: 'surroundings', deltaC: round1(environmentDelta(toggles.environment, inputs.localHour)) })
  deltas.push({ id: 'activity', label: 'activity', deltaC: round1(activityDelta(toggles.activity, streetWindMs)) })

  const baseC = round1(inputs.airTempC)
  const trueFeelC = round1(deltas.reduce((sum, d) => sum + d.deltaC, baseC))

  return {
    baseC,
    deltas,
    trueFeelC,
    sweatEfficiencyPct: inputs.dewPointC === null ? null : sweatEfficiencyPct(inputs.dewPointC),
    missing,
  }
}
