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
          Everything lives on this device — location, toggles, body profile, building cache. A street report (if
          you send one) stores a ~1 km cell and your vote, nothing else. No account, no tracking.
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

      <section className="settings-block">
        <h2 className="settings-label">How this works</h2>
        <p className="note">
          Weather stations measure air in a shaded box. Your body isn&rsquo;t in a box. RealTemp starts from the
          station number and adds what the street adds:
        </p>
        <ul className="how-list">
          <li><b>humidity friction</b> — moist air blocks sweat from cooling you (we use dew point, the honest measure)</li>
          <li><b>wind</b> — carries heat away; below 10&deg; it becomes wind chill</li>
          <li><b>sun premium</b> — direct sun by UV strength and how high the sun sits; zero in shade or at night</li>
          <li><b>surroundings</b> — concrete re-radiates heat into the evening; greenery cools</li>
          <li><b>activity</b> — moving bodies make their own heat</li>
          <li><b>acclimatization &amp; body</b> — optional: how adapted you are, your build, your clothes</li>
        </ul>
        <p className="note">
          The ledger always adds up — every degree is accounted for. Sweat efficiency shows how well sweating even
          works right now. Safe windows apply the same math to the next 24 hours. The shade map draws real building
          shadows for this minute&rsquo;s sun.
        </p>
      </section>

      <section className="settings-block">
        <h2 className="settings-label">About</h2>
        <p className="note">
          RealTemp v0.1 &middot; every coefficient in the formula is a named constant, not a black box. Weather by
          Open-Meteo &middot; buildings by OpenStreetMap.
        </p>
      </section>
    </main>
  )
}
