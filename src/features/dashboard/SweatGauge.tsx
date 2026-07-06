/** Evaporative-cooling effectiveness. Number + bar — color is never the only encoding. */
export function SweatGauge({ pct }: { pct: number | null }) {
  return (
    <div className="gauge">
      <div className="lbl">
        <span>Sweat efficiency</span>
        <span>{pct === null ? '—' : `${Math.round(pct)}%`}</span>
      </div>
      <div
        className="bar"
        role="meter"
        aria-label="Sweat efficiency"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(pct === null ? {} : { 'aria-valuenow': Math.round(pct) })}
      >
        {pct !== null && <div className="fill" style={{ width: `${pct}%` }} />}
      </div>
    </div>
  )
}
