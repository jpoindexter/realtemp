import { displayTemp } from './format-temp'
import { weatherCodeLabel } from './weather-code'

import type { TempUnit } from './format-temp'
import type { WeatherSnapshot } from '@/features/weather/open-meteo'

interface WeatherFactorsProps {
  weather: WeatherSnapshot
  unit: TempUnit
}

const pct = (value: number | null): string => (value === null ? '--' : `${Math.round(value)}%`)
const mm = (value: number | null): string => (value === null ? '--' : `${value.toFixed(1)} mm`)
const wind = (value: number | null): string => (value === null ? '--' : `${value.toFixed(1)} m/s`)

export function WeatherFactors({ weather, unit }: WeatherFactorsProps) {
  // No visible title: the Now tab already names this region, and a per-block
  // header restating the screen cost ~40px of a tight viewport budget. The
  // accessible name survives on the section's aria-label.
  return (
    <section className="weather-factors" aria-label="Current weather factors">
      <div className="factor condition">
        <span>condition</span>
        <b>{weatherCodeLabel(weather.weatherCode)}</b>
      </div>
      <div className="factor">
        <span>humidity</span>
        <b>
          {weather.dewPointC === null ? '--' : `${displayTemp(weather.dewPointC, unit)}° dew`}
          {weather.relativeHumidityPct !== null && <small>{pct(weather.relativeHumidityPct)} RH</small>}
        </b>
      </div>
      <div className="factor">
        <span>rain</span>
        <b>
          {mm(weather.precipitationMm)}
          {weather.showersMm !== null && weather.showersMm > 0 && <small>{mm(weather.showersMm)} showers</small>}
        </b>
      </div>
      <div className="factor">
        <span>clouds</span>
        <b>{pct(weather.cloudCoverPct)}</b>
      </div>
      <div className="factor">
        <span>wind</span>
        <b>{wind(weather.windSpeedMs)}</b>
      </div>
      <div className="factor">
        <span>UV</span>
        <b>{weather.uvIndex === null ? '--' : weather.uvIndex.toFixed(1)}</b>
      </div>
    </section>
  )
}
