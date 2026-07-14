import { useState } from 'react'

import { SegmentedControl } from '@/features/dashboard/SegmentedControl'

import type { TempUnit } from '@/features/dashboard/format-temp'
import type { StoredLocation } from '@/features/location/geocoding'

const UNIT_OPTIONS = [
  { value: 'c', label: 'Metric °C' },
  { value: 'f', label: 'Imperial °F' },
] as const

interface SettingsProps {
  unit: TempUnit
  onSetUnit: (unit: TempUnit) => void
  location: StoredLocation
  onChangeLocation: () => void
  onBack: () => void
}

function clearAllData(): void {
  const mine = Object.keys(localStorage).filter((k) => k.startsWith('realtemp:'))
  mine.forEach((k) => localStorage.removeItem(k))
  window.location.reload()
}

export function Settings({ unit, onSetUnit, location, onChangeLocation, onBack }: SettingsProps) {
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <main className="app stack">
      <div className="loc-bar">
        <button type="button" onClick={onBack}>&larr; back</button>
        <span>settings</span>
      </div>

      <SegmentedControl legend="Temperature unit" name="unit" options={UNIT_OPTIONS} value={unit} onChange={onSetUnit} />

      <section className="settings-block">
        <h2 className="settings-label">Location</h2>
        <div className="settings-row">
          <span>{location.label}</span>
          <button type="button" className="btn quiet" onClick={onChangeLocation}>
            Change
          </button>
        </div>
      </section>

      <section className="settings-block">
        <h2 className="settings-label">Your data</h2>
        <p className="note">
          Everything lives on this device — location, toggles, body profile, and building cache. No account, no
          tracking.
        </p>
        {!confirmClear ? (
          <button type="button" className="btn quiet" onClick={() => setConfirmClear(true)}>
            Clear all saved data
          </button>
        ) : (
          <button type="button" className="btn danger" onClick={clearAllData}>
            Tap again to erase everything
          </button>
        )}
      </section>
    </main>
  )
}
