import { SegmentedControl } from './SegmentedControl'

import type { BioProfile } from '@/features/formula/types'

const METABOLIC_OPTIONS = [
  { value: 'low', label: 'Runs cold' },
  { value: 'normal', label: 'Typical' },
  { value: 'high', label: 'Runs hot' },
] as const

const CLOTHING_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'warm', label: 'Layered' },
] as const

interface BodyPanelProps {
  bio: BioProfile
  onChange: (patch: Partial<BioProfile>) => void
}

/** Sanitizes a numeric field: empty or out-of-range input stores null (no effect). */
function toBounded(raw: string, min: number, max: number): number | null {
  const v = Number(raw)
  return Number.isFinite(v) && v >= min && v <= max ? v : null
}

/** Opt-in personal calibration, stored on-device only. */
export function BodyPanel({ bio, onChange }: BodyPanelProps) {
  return (
    <section className="body-panel" aria-labelledby="body-panel-title">
      <h2 id="body-panel-title" className="body-panel-title">Your body · optional, stays on this device</h2>
      <div className="stack">
        <div className="body-fields">
          <div className="field">
            <label htmlFor="bio-height">Height (cm)</label>
            <input
              id="bio-height"
              className="search-input"
              type="number"
              inputMode="numeric"
              min={100}
              max={230}
              defaultValue={bio.heightCm ?? ''}
              onChange={(e) => onChange({ heightCm: toBounded(e.target.value, 100, 230) })}
            />
          </div>
          <div className="field">
            <label htmlFor="bio-weight">Weight (kg)</label>
            <input
              id="bio-weight"
              className="search-input"
              type="number"
              inputMode="numeric"
              min={30}
              max={250}
              defaultValue={bio.weightKg ?? ''}
              onChange={(e) => onChange({ weightKg: toBounded(e.target.value, 30, 250) })}
            />
          </div>
        </div>
        <SegmentedControl
          legend="Metabolism"
          name="metabolic"
          options={METABOLIC_OPTIONS}
          value={bio.metabolic}
          onChange={(metabolic) => onChange({ metabolic })}
        />
        <SegmentedControl
          legend="Clothing today"
          name="clothing"
          options={CLOTHING_OPTIONS}
          value={bio.clothing}
          onChange={(clothing) => onChange({ clothing })}
        />
      </div>
    </section>
  )
}
