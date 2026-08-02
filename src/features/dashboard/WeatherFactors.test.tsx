import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WeatherFactors } from './WeatherFactors'

import type { AirQuality } from '@/features/air/air-quality'
import type { WeatherSnapshot } from '@/features/weather/open-meteo'

const weather: WeatherSnapshot = {
  airTempC: 30,
  dewPointC: 20,
  relativeHumidityPct: 58,
  windSpeedMs: 2,
  uvIndex: 8,
  precipitationMm: 0.2,
  rainMm: 0.1,
  showersMm: 0.1,
  weatherCode: 61,
  cloudCoverPct: 74,
  localHour: 16,
  localTimeIso: '2026-07-06T16:15',
  fetchedAt: new Date('2026-07-06T14:15:00.000Z'),
  utcOffsetSeconds: 7200,
  hourly: [],
  baseline14C: 25,
}

const air: AirQuality = {
  europeanAqi: 45,
  pm25: 4.5,
  pm10: 6.8,
  band: 'moderate',
}

afterEach(cleanup)

describe('WeatherFactors', () => {
  it('makes every current stat an explanation control', () => {
    render(<WeatherFactors weather={weather} unit="c" air={air} />)

    expect(screen.getAllByRole('button', { name: /^explain /i })).toHaveLength(7)
    expect(screen.getByRole('button', { name: /explain condition: rain/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /explain humidity: 20\.0° dew · 58% RH/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /explain air: Moderate · EAQI 45/i })).toBeDefined()
  })

  it.each([
    ['condition', /condition is context only/i],
    ['humidity', /uses dew point—not relative humidity/i],
    ['rain', /does not directly change True Feel/i],
    ['clouds', /never silently overrides/i],
    ['wind', /estimates street wind at 60%/i],
    ['UV', /each UV point adds 0\.8°C/i],
    ['air', /does not change True Feel/i],
  ])('opens useful help for %s and closes back to its trigger', (label, expectedCopy) => {
    render(<WeatherFactors weather={weather} unit="c" air={air} />)
    const trigger = screen.getByRole('button', { name: new RegExp(`explain ${label}`, 'i') })

    fireEvent.click(trigger)

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByRole('heading', { name: label, level: 2 })).toBeDefined()
    expect(screen.getByText(expectedCopy)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /close explanation/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('still explains a metric when its live reading is unavailable', () => {
    render(
      <WeatherFactors
        weather={{ ...weather, dewPointC: null, relativeHumidityPct: null }}
        unit="c"
        air={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /explain humidity: --/i }))
    expect(screen.getByText(/Dew point is the temperature/i)).toBeDefined()
  })
})
