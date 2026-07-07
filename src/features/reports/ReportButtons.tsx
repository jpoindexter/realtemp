import { useEffect, useState } from 'react'

import type { StoredLocation } from '@/features/location/geocoding'

const VOTES = [
  { value: 'hotter', label: 'Hotter' },
  { value: 'spot-on', label: 'Spot-on' },
  { value: 'cooler', label: 'Cooler' },
] as const

type Vote = (typeof VOTES)[number]['value']

interface Counts {
  hotter: number
  cooler: number
  'spot-on': number
}

type SendState = 'idle' | 'sending' | 'sent' | 'limited'

interface ReportButtonsProps {
  apiBase: string
  location: StoredLocation
}

/** One-tap validation loop (card L1): does True Feel match the street? */
export function ReportButtons({ apiBase, location }: ReportButtonsProps) {
  const [state, setState] = useState<SendState>('idle')
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(
      `${apiBase}/api/reports/summary?latitude=${location.latitude}&longitude=${location.longitude}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { counts: Counts } | null) => {
        if (!cancelled && data) setCounts(data.counts)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [apiBase, location.latitude, location.longitude])

  const send = async (vote: Vote) => {
    setState('sending')
    try {
      const r = await fetch(`${apiBase}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude, vote }),
      })
      setState(r.status === 429 ? 'limited' : r.ok ? 'sent' : 'idle')
    } catch {
      setState('idle')
    }
  }

  const nearby =
    counts && counts.hotter + counts.cooler + counts['spot-on'] > 0
      ? `nearby, last 3h: ${counts.hotter} hotter · ${counts['spot-on']} spot-on · ${counts.cooler} cooler`
      : null

  return (
    <section className="reports">
      <div className="lbl">
        <span>Does it feel right?</span>
        {nearby && <span>{nearby}</span>}
      </div>
      {state === 'sent' && <p className="note" role="status">Logged — thanks. It tunes the formula.</p>}
      {state === 'limited' && <p className="note" role="status">Already logged — one report per 10 minutes.</p>}
      {(state === 'idle' || state === 'sending') && (
        <div className="report-row">
          {VOTES.map((v) => (
            <button
              key={v.value}
              type="button"
              className="btn quiet"
              disabled={state === 'sending'}
              onClick={() => void send(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
