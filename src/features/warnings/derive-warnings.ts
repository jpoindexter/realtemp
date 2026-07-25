import {
  WARN_COLD_CAUTION_C,
  WARN_COLD_DANGER_C,
  WARN_HEAT_CAUTION_C,
  WARN_HEAT_DANGER_C,
  WARN_UV_INDEX,
  WARN_WIND_MS,
} from '@/features/formula/constants'

export interface WeatherWarning {
  id: 'heat' | 'cold' | 'uv' | 'wind'
  level: 'caution' | 'danger'
  text: string
}

interface WarningInputs {
  trueFeelC: number
  uvIndex: number | null
  windSpeedMs: number | null
  isNight: boolean
}

/**
 * Automatic in-app warnings, derived from the same numbers on screen —
 * deterministic and transparent like everything else. Official CAP alerts
 * (AEMET/MeteoAlarm) are a separate, worker-proxied card.
 */
export function deriveWarnings(inputs: WarningInputs): WeatherWarning[] {
  const warnings: WeatherWarning[] = []

  if (inputs.trueFeelC >= WARN_HEAT_DANGER_C) {
    warnings.push({ id: 'heat', level: 'danger', text: `Dangerous heat — ${Math.round(inputs.trueFeelC)}° True Feel. Shade, water, short exposure.` })
  } else if (inputs.trueFeelC >= WARN_HEAT_CAUTION_C) {
    warnings.push({ id: 'heat', level: 'caution', text: `High heat strain — check Forecast for safe windows.` })
  }

  if (inputs.trueFeelC <= WARN_COLD_DANGER_C) {
    warnings.push({ id: 'cold', level: 'danger', text: `Severe cold — ${Math.round(inputs.trueFeelC)}° True Feel. Cover skin, limit time out.` })
  } else if (inputs.trueFeelC <= WARN_COLD_CAUTION_C) {
    warnings.push({ id: 'cold', level: 'caution', text: `Freezing conditions — layer up.` })
  }

  if (!inputs.isNight && inputs.uvIndex !== null && inputs.uvIndex >= WARN_UV_INDEX) {
    warnings.push({ id: 'uv', level: 'caution', text: `Extreme UV (${Math.round(inputs.uvIndex)}) — sunscreen or shade, even if it feels fine.` })
  }

  if (inputs.windSpeedMs !== null && inputs.windSpeedMs >= WARN_WIND_MS) {
    warnings.push({ id: 'wind', level: 'caution', text: `Strong wind (${Math.round(inputs.windSpeedMs)} m/s) — matters more than the temperature says.` })
  }

  return warnings
}
