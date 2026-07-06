import type { TrueFeel } from '@/features/formula/types'

const signed = (v: number): string => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)}°`

function valClass(id: string, deltaC: number): string {
  if (id === 'environment') return 'val env'
  return deltaC < 0 ? 'val cool' : 'val heat'
}

/** The receipt: base + each premium = True Feel. Sign and color both encode direction. */
export function BreakdownLedger({ result }: { result: TrueFeel }) {
  return (
    <dl className="ledger" aria-label="True Feel calculation breakdown">
      <div className="row">
        <dt>base air</dt>
        <dd className="val">{result.baseC.toFixed(1)}&deg;</dd>
      </div>
      {result.deltas.map((d) => (
        <div className="row" key={d.id}>
          <dt>{d.id === 'solar' && result.isNight ? 'sun premium · night' : d.label}</dt>
          <dd className={valClass(d.id, d.deltaC)}>{signed(d.deltaC)}</dd>
        </div>
      ))}
      <div className="row total">
        <dt>true feel</dt>
        <dd className="val">= {result.trueFeelC.toFixed(1)}&deg;</dd>
      </div>
    </dl>
  )
}
