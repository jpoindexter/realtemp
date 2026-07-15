import { useEffect, useState } from 'react'

import type { StoredLocation } from '@/features/location/geocoding'

interface OfficialAlertsPanelProps {
  apiBase: string
  location: StoredLocation
}

interface OfficialAlert {
  headline: string
  level: 'yellow' | 'orange' | 'red' | 'unknown'
  geocode: string | null
}

type AlertsState = 'idle' | 'loading' | 'ready' | 'error'

export function OfficialAlertsPanel({ apiBase, location }: OfficialAlertsPanelProps) {
  const [state, setState] = useState<AlertsState>('idle')
  const [alerts, setAlerts] = useState<OfficialAlert[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setState('loading')
      try {
        const response = await fetch(`${apiBase}/api/alerts?latitude=${location.latitude}&longitude=${location.longitude}`)
        if (!response.ok) {
          if (!cancelled) setState('error')
          return
        }
        const data = (await response.json()) as { alerts?: OfficialAlert[] }
        if (cancelled) return
        setAlerts(Array.isArray(data.alerts) ? data.alerts : [])
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [apiBase, location.latitude, location.longitude])

  return (
    <section className="body-panel" aria-labelledby="official-alerts-title">
      <h2 id="official-alerts-title" className="body-panel-title">Official alerts &middot; AEMET</h2>
      <div className="stack official-alerts">
        {state === 'loading' && <p className="note" role="status">Checking official CAP alerts...</p>}
        {state === 'error' && <p className="error" role="alert">Official alerts are unreachable right now.</p>}
        {state === 'ready' && alerts.length === 0 && (
          <p className="note" role="status">No official AEMET alerts for this exact area.</p>
        )}
        {alerts.map((alert) => (
          <article key={`${alert.geocode ?? 'unknown'}:${alert.headline}`} className={`official-alert ${alert.level}`}>
            <div className="lbl">
              <span>{alert.level}</span>
              {alert.geocode && <span>{alert.geocode}</span>}
            </div>
            <p>{alert.headline}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
