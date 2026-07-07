import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { COMFORT_MAX_TRUEFEEL_C, COMFORT_MIN_TRUEFEEL_C } from '@/features/formula/constants'
import { solarZenithDeg } from '@/features/formula/solar-zenith'

import type { BioProfile, Toggles } from '@/features/formula/types'
import type { HourlyPoint } from '@/features/weather/open-meteo'

export interface TimelinePoint {
  timeIso: string
  hourLabel: string
  trueFeelC: number
  baseC: number
  isComfort: boolean
}

export interface ComfortWindow {
  from: string
  to: string
}

export interface TimelineContext {
  utcOffsetSeconds: number
  latitude: number
  longitude: number
  baseline14C: number | null
  bio?: BioProfile
}

/** The dashboard formula applied to each forecast hour — same toggles, per-hour sun position. */
export function computeHourlyTrueFeel(
  points: HourlyPoint[],
  ctx: TimelineContext,
  toggles: Toggles,
): TimelinePoint[] {
  return points.map((p) => {
    const utcMs = Date.parse(`${p.timeIso}:00Z`) - ctx.utcOffsetSeconds * 1000
    const result = computeTrueFeel(
      {
        airTempC: p.airTempC,
        dewPointC: p.dewPointC,
        windSpeedMs: p.windSpeedMs,
        uvIndex: p.uvIndex,
        solarZenithDeg: solarZenithDeg(new Date(utcMs), ctx.latitude, ctx.longitude),
        localHour: Number(p.timeIso.slice(11, 13)),
        baseline14C: ctx.baseline14C,
      },
      toggles,
      ctx.bio,
    )
    return {
      timeIso: p.timeIso,
      hourLabel: p.timeIso.slice(11, 16),
      trueFeelC: result.trueFeelC,
      baseC: result.baseC,
      isComfort:
        result.trueFeelC >= COMFORT_MIN_TRUEFEEL_C && result.trueFeelC <= COMFORT_MAX_TRUEFEEL_C,
    }
  })
}

/** Contiguous comfortable runs, for the summary line and the shaded bands. */
export function comfortWindows(points: TimelinePoint[]): ComfortWindow[] {
  const windows: ComfortWindow[] = []
  let start: TimelinePoint | null = null
  for (const [i, p] of points.entries()) {
    if (p.isComfort && !start) start = p
    const isLast = i === points.length - 1
    if (start && (!p.isComfort || isLast)) {
      const end = p.isComfort && isLast ? p : points[i - 1]
      if (end) windows.push({ from: start.hourLabel, to: end.hourLabel })
      start = null
    }
  }
  return windows
}
