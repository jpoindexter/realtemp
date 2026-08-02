import { useLayoutEffect, useRef, useState } from 'react'

import { aqiLabel } from '@/features/air/air-quality'

import { displayTemp } from './format-temp'
import { weatherCodeLabel } from './weather-code'

import type { MouseEvent, ReactNode } from 'react'
import type { TempUnit } from './format-temp'
import type { AirQuality } from '@/features/air/air-quality'
import type { WeatherSnapshot } from '@/features/weather/open-meteo'

interface WeatherFactorsProps {
  weather: WeatherSnapshot
  unit: TempUnit
  air: AirQuality | null
}

type WeatherFactorId = 'condition' | 'humidity' | 'rain' | 'clouds' | 'wind' | 'uv' | 'air'

interface WeatherFactor {
  id: WeatherFactorId
  label: string
  value: ReactNode
  currentReading: string
  meaning: string
  guide: string
  realTempUse: string
}

const pct = (value: number | null): string => (value === null ? '--' : `${Math.round(value)}%`)
const mm = (value: number | null): string => (value === null ? '--' : `${value.toFixed(1)} mm`)
const wind = (value: number | null): string => (value === null ? '--' : `${value.toFixed(1)} m/s`)

function makeFactors(weather: WeatherSnapshot, unit: TempUnit, air: AirQuality | null): WeatherFactor[] {
  const condition = weatherCodeLabel(weather.weatherCode)
  const dewPoint = weather.dewPointC === null ? '--' : `${displayTemp(weather.dewPointC, unit)}° dew`
  const relativeHumidity = pct(weather.relativeHumidityPct)
  const precipitation = mm(weather.precipitationMm)
  const showers = weather.showersMm !== null && weather.showersMm > 0 ? mm(weather.showersMm) : null
  const cloudCover = pct(weather.cloudCoverPct)
  const windSpeed = wind(weather.windSpeedMs)
  const uvIndex = weather.uvIndex === null ? '--' : weather.uvIndex.toFixed(1)
  const airLabel = aqiLabel(air?.band ?? null)
  const europeanAqi = air?.europeanAqi === null || air?.europeanAqi === undefined
    ? null
    : Math.round(air.europeanAqi)

  return [
    {
      id: 'condition',
      label: 'condition',
      value: condition,
      currentReading: condition,
      meaning: 'A plain-language translation of the weather provider’s current condition code.',
      guide: 'It names the dominant condition now, not its severity or your chance of rain. Use the rain, clouds, and wind readings for that detail.',
      realTempUse: 'Condition is context only. It does not directly change the True Feel calculation.',
    },
    {
      id: 'humidity',
      label: 'humidity',
      value: (
        <>
          {dewPoint}
          {weather.relativeHumidityPct !== null && <small>{relativeHumidity} RH</small>}
        </>
      ),
      currentReading: weather.relativeHumidityPct === null ? dewPoint : `${dewPoint} · ${relativeHumidity} RH`,
      meaning: 'Dew point is the temperature at which moisture in the air would begin to condense. A higher dew point means the air holds more moisture and sweat evaporates less easily.',
      guide: 'Relative humidity is how full the air is compared with its capacity at the current temperature. It can change as temperature changes; dew point is the steadier measure of how dry or muggy the air feels.',
      realTempUse: 'RealTemp uses dew point—not relative humidity—to calculate humidity friction and sweat efficiency.',
    },
    {
      id: 'rain',
      label: 'rain',
      value: (
        <>
          {precipitation}
          {showers && <small>{showers} showers</small>}
        </>
      ),
      currentReading: showers ? `${precipitation} · ${showers} showers` : precipitation,
      meaning: 'This is the depth of precipitation reported for the current weather interval. One millimetre equals one litre of water over one square metre.',
      guide: 'It is an amount, not the chance that rain will happen. A zero means the current interval is dry; the Forecast tab shows what may arrive next.',
      realTempUse: 'Rain is shown for awareness but does not directly change True Feel; wet clothing and evaporation vary too much to infer safely from rainfall alone.',
    },
    {
      id: 'clouds',
      label: 'clouds',
      value: cloudCover,
      currentReading: cloudCover,
      meaning: 'Cloud cover estimates the percentage of the sky covered by clouds at your location.',
      guide: 'Zero percent is clear sky and 100% is fully overcast. It is not a rain probability—thick cloud can stay dry, and showers can form with partial cloud.',
      realTempUse: 'Cloud cover helps you judge exposure, but RealTemp never silently overrides the Sun, Overcast, or Shade choice in Tune.',
    },
    {
      id: 'wind',
      label: 'wind',
      value: windSpeed,
      currentReading: windSpeed,
      meaning: 'This is wind speed modelled at 10 metres above the ground. One metre per second equals 3.6 kilometres per hour.',
      guide: 'Higher wind usually removes heat from exposed skin faster. Buildings and trees can make the wind on your exact street weaker, stronger, or gustier than the model.',
      realTempUse: 'RealTemp estimates street wind at 60% of this reading, applies wind cooling, and halves activity heat when estimated street wind exceeds 5 m/s.',
    },
    {
      id: 'uv',
      label: 'UV',
      value: uvIndex,
      currentReading: uvIndex,
      meaning: 'The UV index measures sunburn-producing ultraviolet radiation, not air temperature. Higher numbers mean unprotected skin can be damaged faster.',
      guide: '0–2 is low, 3–5 moderate, 6–7 high, 8–10 very high, and 11+ extreme. UV can still be meaningful on a cool or partly cloudy day.',
      realTempUse: 'In direct sun, each UV point adds 0.8°C to True Feel, capped at +8°C. Overcast uses 25% of that premium; Shade and night use zero.',
    },
    {
      id: 'air',
      label: 'air',
      value: (
        <>
          {airLabel}
          {europeanAqi !== null && <small>EAQI {europeanAqi}</small>}
        </>
      ),
      currentReading: europeanAqi === null ? airLabel : `${airLabel} · EAQI ${europeanAqi}`,
      meaning: 'The European Air Quality Index turns measured and modelled air pollutants into one lower-is-better health signal.',
      guide: '0–19 is Good, 20–39 Fair, 40–59 Moderate, 60–79 Poor, 80–99 Very poor, and 100+ Extremely poor.',
      realTempUse: 'Air quality is health context and does not change True Feel. It is kept separate so a thermal comfort number never hides pollution risk.',
    },
  ]
}

export function WeatherFactors({ weather, unit, air }: WeatherFactorsProps) {
  const [selectedId, setSelectedId] = useState<WeatherFactorId | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const factors = makeFactors(weather, unit, air)
  const selected = factors.find((factor) => factor.id === selectedId) ?? null

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!selectedId || !dialog || dialog.open) return

    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')

    // Native dialogs focus the first button by default, which made the close X
    // look permanently selected on every pointer-open. Start on the heading
    // instead: assistive tech still gets useful context, while the close ring
    // appears only when a keyboard user actually tabs to it.
    headingRef.current?.focus({ preventScroll: true })
  }, [selectedId])

  const finishClose = () => {
    setSelectedId(null)
    triggerRef.current?.focus()
  }

  const closeDialog = () => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (typeof dialog.close === 'function') dialog.close()
    else {
      dialog.removeAttribute('open')
      finishClose()
    }
  }

  const openFactor = (factor: WeatherFactor, event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget
    setSelectedId(factor.id)
  }

  // No visible title: the Now tab already names this region. Every cell is a
  // semantic button so touch, keyboard, and assistive-tech users get the same
  // progressive explanation without adding seven permanently visible essays.
  return (
    <section className="weather-factors" aria-label="Current weather factors">
      {factors.map((factor) => (
        <button
          key={factor.id}
          type="button"
          className={`factor${factor.id === 'condition' ? ' condition' : ''}`}
          aria-haspopup="dialog"
          aria-label={`Explain ${factor.label}: ${factor.currentReading}`}
          onClick={(event) => openFactor(factor, event)}
        >
          <span className="factor-label">
            {factor.label}
            <i aria-hidden="true">?</i>
          </span>
          <b>{factor.value}</b>
        </button>
      ))}

      <dialog
        ref={dialogRef}
        className="stat-explainer"
        aria-labelledby="stat-explainer-title"
        aria-describedby="stat-explainer-meaning"
        onCancel={(event) => {
          event.preventDefault()
          closeDialog()
        }}
        onClose={finishClose}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog()
        }}
      >
        {selected && (
          <div className="stat-explainer-card">
            <div className="stat-explainer-head">
              <div>
                <p className="stat-explainer-kicker">Current weather · explained</p>
                <h2 ref={headingRef} id="stat-explainer-title" tabIndex={-1}>{selected.label}</h2>
              </div>
              <button type="button" className="stat-explainer-close" aria-label="Close explanation" onClick={closeDialog}>
                ×
              </button>
            </div>

            <p className="stat-explainer-reading">{selected.currentReading}</p>

            <div className="stat-explainer-section">
              <h3>What it means</h3>
              <p id="stat-explainer-meaning">{selected.meaning}</p>
            </div>
            <div className="stat-explainer-section">
              <h3>How to read it</h3>
              <p>{selected.guide}</p>
            </div>
            <div className="stat-explainer-section realtemp-use">
              <h3>How RealTemp uses it</h3>
              <p>{selected.realTempUse}</p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}
