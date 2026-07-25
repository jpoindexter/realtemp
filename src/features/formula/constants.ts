/**
 * Every coefficient of the True Feel formula. These are tuning knobs on top of
 * Steadman Apparent Temperature, not physics claims — see PRD.md and DECISIONS.md.
 */

// Steadman AT = Ta + STEADMAN_VAPOR_COEF·e − STEADMAN_WIND_COEF·ws − STEADMAN_BASELINE
export const STEADMAN_VAPOR_COEF = 0.33
export const STEADMAN_WIND_COEF = 0.7
export const STEADMAN_BASELINE = 4.0

// Vapor pressure from dew point (hPa): e = A·exp(B·Td / (C + Td))
export const VAPOR_A = 6.105
export const VAPOR_B = 17.27
export const VAPOR_C = 237.7

// 10 m wind → street-level coefficient (PRD "2-meter street coefficient")
export const STREET_WIND_FACTOR = 0.6

// Solar premium: clamp(UVI × UV_TO_PREMIUM, 0, SOLAR_PREMIUM_MAX_C), zenith-cos-weighted
export const UV_TO_PREMIUM = 0.8
export const SOLAR_PREMIUM_MAX_C = 8
export const EXPOSURE_FACTOR = { sun: 1, overcast: 0.25, shade: 0 } as const

// Environment deltas (°C); urban is time-gated for masonry heat retention
export const URBAN_DELTA_PEAK_C = 2
export const URBAN_DELTA_OFFPEAK_C = 1
export const URBAN_PEAK_START_HOUR = 12
export const URBAN_PEAK_END_HOUR = 22
export const NATURE_DELTA_C = -1

// Activity deltas (°C), halved above the convective wind threshold
export const ACTIVITY_DELTA_C = { stagnant: 0, walking: 1, active: 3 } as const
export const CONVECTIVE_WIND_THRESHOLD_MS = 5
export const CONVECTIVE_ACTIVITY_FACTOR = 0.5

// Sweat efficiency: 100% at/below TD_FULL, 0% at/above TD_ZERO (linear between)
export const SWEAT_TD_FULL_C = 10
export const SWEAT_TD_ZERO_C = 26

// Auto warning bands (in-app, derived — push is separate and opt-in by platform rule)
export const WARN_HEAT_CAUTION_C = 33
export const WARN_HEAT_DANGER_C = 40
export const WARN_COLD_CAUTION_C = 0
export const WARN_COLD_DANGER_C = -10
export const WARN_UV_INDEX = 8
export const WARN_WIND_MS = 10

// Acclimatization: perceived share of the deviation from the 14-day baseline
export const ACCLIM_FACTOR = { new: 0.3, settling: 0.15, local: 0 } as const
export const ACCLIM_MAX_DELTA_C = 3
export const WEATHER_SHOCK_DELTA_C = 8
export const BASELINE_DAYS = 14

// Bio-calibration (height/weight/metabolism/clothing) was removed 2026-07-25 and
// returned to PARKED.md — no personal data is collected, so no coefficients here.

// Safe Window comfort band on True Feel (°C) — v0 heuristic, tune with lived use
export const COMFORT_MIN_TRUEFEEL_C = 5
export const COMFORT_MAX_TRUEFEEL_C = 32

// Cold: JAG/TI wind chill (Environment Canada / NWS 2001), 10 m wind in km/h.
// WCT = A + B·Ta + C·v^E + D·Ta·v^E — defined for Ta ≤ 10°C and v ≥ 4.8 km/h.
export const WIND_CHILL_A = 13.12
export const WIND_CHILL_B = 0.6215
export const WIND_CHILL_C = -11.37
export const WIND_CHILL_D = 0.3965
export const WIND_CHILL_EXP = 0.16
export const WIND_CHILL_MIN_KMH = 4.8
// Blend between Steadman wind (warm) and wind chill (cold) so the formula is continuous
export const COLD_BLEND_LOW_C = 10
export const COLD_BLEND_HIGH_C = 15
export const MS_TO_KMH = 3.6

// Thermal tint range (presentation only — never enters the formula). The UI's
// warmth is linear between these two True Feel readings and clamps outside them.
// Chosen to span "genuinely cold" to "the Valencia plaza this app exists for".
export const THERMAL_COLD_C = 5
export const THERMAL_HOT_C = 42
