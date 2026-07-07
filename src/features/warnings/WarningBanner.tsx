import type { WeatherWarning } from './derive-warnings'

/** Auto warning strips — level encoded by color AND label, never color alone. */
export function WarningBanner({ warnings }: { warnings: WeatherWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <div className="warnings" role="status" aria-label="Weather warnings">
      {warnings.map((w) => (
        <p key={w.id} className={`warning ${w.level}`}>
          <span className="warning-level">{w.level === 'danger' ? 'Danger' : 'Caution'}</span>
          {w.text}
        </p>
      ))}
    </div>
  )
}
