import type { WeatherWarning } from './derive-warnings'

/**
 * Auto warning strips — level encoded by color AND label, never color alone.
 * Danger interrupts screen readers (role="alert", assertive); caution
 * announces politely (role="status") — sighted users already get that
 * urgency split from scorch-red vs solar-amber, AT users deserve the same.
 */
export function WarningBanner({ warnings }: { warnings: WeatherWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <div className="warnings" aria-label="Weather warnings">
      {warnings.map((w) => (
        <p key={w.id} className={`warning ${w.level}`} role={w.level === 'danger' ? 'alert' : 'status'}>
          <span className="warning-level">{w.level === 'danger' ? 'Danger' : 'Caution'}</span>
          {w.text}
        </p>
      ))}
    </div>
  )
}
