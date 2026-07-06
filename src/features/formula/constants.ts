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
