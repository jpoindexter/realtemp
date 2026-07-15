import { displayTemp } from './format-temp'
import { weatherCodeLabel } from './weather-code'

import type { TempUnit } from './format-temp'
import type { TimelinePoint } from '@/features/timeline/compute-hourly'
import type { HourlyPoint } from '@/features/weather/open-meteo'

interface ForecastListProps {
  hourly: HourlyPoint[]
  trueFeel: TimelinePoint[]
  unit: TempUnit
}

const pct = (value: number | null): string => (value === null ? '--' : `${Math.round(value)}%`)
const mm = (value: number | null): string => (value === null ? '--' : `${value.toFixed(1)} mm`)

export function ForecastList({ hourly, trueFeel, unit }: ForecastListProps) {
  const rows = hourly.slice(0, 6)
  if (!rows.length) return null

  return (
    <section className="forecast-list" aria-label="Next hours forecast">
      <div className="lbl">
        <span>Forecast</span>
        <span>next 6 h</span>
      </div>
      <div className="forecast-rows">
        {rows.map((point, i) => {
          const feel = trueFeel[i]
          return (
            <article key={point.timeIso} className="forecast-row">
              <time dateTime={point.timeIso}>{point.timeIso.slice(11, 16)}</time>
              <b>{feel ? `${displayTemp(feel.trueFeelC, unit)}°` : '--'}</b>
              <span>{weatherCodeLabel(point.weatherCode)}</span>
              <div className="forecast-meta">
                <span>{pct(point.precipitationProbabilityPct)} rain</span>
                <span>{mm(point.precipitationMm)}</span>
                <span>{pct(point.cloudCoverPct)} cloud</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
