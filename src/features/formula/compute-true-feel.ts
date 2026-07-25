import {
  ACCLIM_FACTOR,
  ACCLIM_MAX_DELTA_C,
  ACTIVITY_DELTA_C,
  COLD_BLEND_HIGH_C,
  COLD_BLEND_LOW_C,
  CONVECTIVE_ACTIVITY_FACTOR,
  CONVECTIVE_WIND_THRESHOLD_MS,
  EXPOSURE_FACTOR,
  MS_TO_KMH,
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
  WEATHER_SHOCK_DELTA_C,
  WIND_CHILL_A,
  WIND_CHILL_B,
  WIND_CHILL_C,
  WIND_CHILL_D,
  WIND_CHILL_EXP,
  WIND_CHILL_MIN_KMH,
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

/** Steadman's wind term — the warm-weather path, street-scaled wind. */
function warmWindDelta(streetWindMs: number): number {
  return -STEADMAN_WIND_COEF * streetWindMs
}

/** JAG/TI wind chill expressed as a delta from air temp; 10 m wind, km/h. */
function coldWindDelta(airTempC: number, windSpeedMs10: number): number {
  const vKmh = windSpeedMs10 * MS_TO_KMH
  if (vKmh < WIND_CHILL_MIN_KMH) return warmWindDelta(windSpeedMs10 * STREET_WIND_FACTOR)
  const vE = Math.pow(vKmh, WIND_CHILL_EXP)
  const wct = WIND_CHILL_A + WIND_CHILL_B * airTempC + WIND_CHILL_C * vE + WIND_CHILL_D * airTempC * vE
  return Math.min(0, wct - airTempC)
}

/** Continuous across seasons: pure Steadman ≥ 15°C, pure wind chill ≤ 10°C, blended between. */
function windDelta(airTempC: number, windSpeedMs10: number, streetWindMs: number): number {
  const coldWeight = clamp(
    (COLD_BLEND_HIGH_C - airTempC) / (COLD_BLEND_HIGH_C - COLD_BLEND_LOW_C),
    0,
    1,
  )
  if (coldWeight === 0) return warmWindDelta(streetWindMs)
  return (1 - coldWeight) * warmWindDelta(streetWindMs) + coldWeight * coldWindDelta(airTempC, windSpeedMs10)
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

  if (streetWindMs === null || inputs.windSpeedMs === null) missing.push('wind')
  else
    deltas.push({
      id: 'wind',
      label: 'wind',
      deltaC: round1(windDelta(inputs.airTempC, inputs.windSpeedMs, streetWindMs)),
    })

  if (inputs.uvIndex === null) missing.push('solar')
  else deltas.push({ id: 'solar', label: 'sun premium', deltaC: round1(solarDelta(inputs.uvIndex, inputs.solarZenithDeg, toggles.exposure)) })

  deltas.push({ id: 'environment', label: 'surroundings', deltaC: round1(environmentDelta(toggles.environment, inputs.localHour)) })
  deltas.push({ id: 'activity', label: 'activity', deltaC: round1(activityDelta(toggles.activity, streetWindMs)) })

  // Acclimatization: a newcomer feels a share of the deviation from the local 14-day norm.
  const baseline = inputs.baseline14C ?? null
  const acclimFactor = ACCLIM_FACTOR[toggles.acclimatization]
  if (acclimFactor > 0) {
    if (baseline === null) missing.push('acclimatization')
    else {
      const raw = clamp((inputs.airTempC - baseline) * acclimFactor, -ACCLIM_MAX_DELTA_C, ACCLIM_MAX_DELTA_C)
      deltas.push({ id: 'acclimatization', label: 'acclimatization', deltaC: round1(raw) })
    }
  }

  const baseC = round1(inputs.airTempC)
  const trueFeelC = round1(deltas.reduce((sum, d) => sum + d.deltaC, baseC))

  return {
    baseC,
    deltas,
    trueFeelC,
    sweatEfficiencyPct: inputs.dewPointC === null ? null : sweatEfficiencyPct(inputs.dewPointC),
    missing,
    isNight: inputs.solarZenithDeg > 90,
    isWeatherShock: baseline !== null && Math.abs(inputs.airTempC - baseline) >= WEATHER_SHOCK_DELTA_C,
  }
}
