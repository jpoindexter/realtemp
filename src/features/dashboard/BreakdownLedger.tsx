import { displayDelta, displayTemp } from './format-temp'

import type { TempUnit } from './format-temp'
import type { TrueFeel } from '@/features/formula/types'

function valClass(id: string, deltaC: number): string {
  if (id === 'environment') return 'val env'
  return deltaC < 0 ? 'val cool' : 'val heat'
}

/** The receipt: base + each premium = True Feel. Sign and color both encode direction. */
export function BreakdownLedger({ result, unit }: { result: TrueFeel; unit: TempUnit }) {
  return (
    <dl className="ledger" aria-label="True Feel calculation breakdown">
      <div className="row">
        <dt>base air</dt>
        <dd className="val">{displayTemp(result.baseC, unit)}&deg;</dd>
      </div>
      {result.deltas.map((d) => (
        <div className="row" key={d.id}>
          <dt>{d.id === 'solar' && result.isNight ? 'sun premium · night' : d.label}</dt>
          <dd className={valClass(d.id, d.deltaC)}>{displayDelta(d.deltaC, unit)}</dd>
        </div>
      ))}
      <div className="row total">
        <dt>true feel</dt>
        <dd className="val">= {displayTemp(result.trueFeelC, unit)}&deg;</dd>
      </div>
    </dl>
  )
}
