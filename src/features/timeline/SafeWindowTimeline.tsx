import { displayTemp } from '@/features/dashboard/format-temp'

import { comfortWindows } from './compute-hourly'

import type { TimelinePoint } from './compute-hourly'
import type { TempUnit } from '@/features/dashboard/format-temp'

const W = 360
const H = 110
const PAD = { top: 8, right: 6, bottom: 18, left: 30 }

interface SafeWindowTimelineProps {
  points: TimelinePoint[]
  unit: TempUnit
}

function scales(points: TimelinePoint[]) {
  const values = points.flatMap((p) => [p.trueFeelC, p.baseC])
  const lo = Math.floor(Math.min(...values)) - 1
  const hi = Math.ceil(Math.max(...values)) + 1
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom)
  return { lo, hi, x, y }
}

const linePath = (points: TimelinePoint[], x: (i: number) => number, y: (v: number) => number, pick: (p: TimelinePoint) => number) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join('')

/** 24 h of True Feel vs base air; comfortable hours shaded. Two encodings: band + summary text. */
export function SafeWindowTimeline({ points, unit }: SafeWindowTimelineProps) {
  if (points.length < 2) return null
  const { lo, hi, x, y } = scales(points)
  const windows = comfortWindows(points)
  const summary =
    windows.length === 0 ? 'no safe window in the next 24 h' : windows.map((w) => `${w.from}–${w.to}`).join(', ')

  // contiguous comfort runs → shaded bands
  const bands: { from: number; to: number }[] = []
  let start: number | null = null
  points.forEach((p, i) => {
    if (p.isComfort && start === null) start = i
    if ((!p.isComfort || i === points.length - 1) && start !== null) {
      bands.push({ from: start, to: p.isComfort ? i : i - 1 })
      start = null
    }
  })

  return (
    <section className="timeline">
      <div className="lbl">
        <span>Next 24 h · safe windows</span>
        <span>{summary}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`True Feel over the next 24 hours versus air temperature. Safe windows: ${summary}.`}
      >
        {bands.map((b) => (
          <rect
            key={b.from}
            className="band"
            x={x(b.from)}
            y={PAD.top}
            width={Math.max(1, x(b.to) - x(b.from))}
            height={H - PAD.top - PAD.bottom}
          />
        ))}
        <text className="axis" x={2} y={y(hi) + 8}>{displayTemp(hi, unit)}°</text>
        <text className="axis" x={2} y={y(lo)}>{displayTemp(lo, unit)}°</text>
        {points.map((p, i) =>
          i % 6 === 0 || i === points.length - 1 ? (
            <text className="axis" key={p.timeIso} x={x(i)} y={H - 4} textAnchor="middle">
              {p.hourLabel.slice(0, 2)}
            </text>
          ) : null,
        )}
        <path className="base-line" d={linePath(points, x, y, (p) => p.baseC)} />
        <path className="feel-line" d={linePath(points, x, y, (p) => p.trueFeelC)} />
        <circle className="feel-end" cx={x(points.length - 1)} cy={y(points[points.length - 1]!.trueFeelC)} r={3} />
      </svg>
      <p className="legend">
        <span className="feel-key">true feel</span> vs <span className="base-key">air</span> · shaded = comfortable
        with your current toggles
      </p>
    </section>
  )
}
