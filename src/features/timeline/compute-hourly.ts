import { computeTrueFeel } from '@/features/formula/compute-true-feel'
import { COMFORT_MAX_TRUEFEEL_C, COMFORT_MIN_TRUEFEEL_C } from '@/features/formula/constants'
import { solarZenithDeg } from '@/features/formula/solar-zenith'

import type { Toggles } from '@/features/formula/types'
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

export interface ComfortRun {
  fromIdx: number
  toIdx: number
}

/** Contiguous comfortable index runs — one source of truth for bands and labels. */
export function comfortRuns(points: TimelinePoint[]): ComfortRun[] {
  const runs: ComfortRun[] = []
  let start: number | null = null
  points.forEach((p, i) => {
    if (p.isComfort && start === null) start = i
    if (start !== null && (!p.isComfort || i === points.length - 1)) {
      runs.push({ fromIdx: start, toIdx: p.isComfort ? i : i - 1 })
      start = null
    }
  })
  return runs
}

/** The same runs as hour-label ranges, for the summary line. */
export function comfortWindows(points: TimelinePoint[]): ComfortWindow[] {
  return comfortRuns(points).map((r) => ({
    from: points[r.fromIdx]!.hourLabel,
    to: points[r.toIdx]!.hourLabel,
  }))
}
