import { useEffect, useState } from 'react'

const TERMS = [
  { value: 'trueFeel', label: 'True Feel' },
  { value: 'airTemp', label: 'Air temp' },
  { value: 'dewPoint', label: 'Dew point' },
  { value: 'uvIndex', label: 'UV index' },
] as const

const DIRECTIONS = [
  { value: 'above', label: 'goes above' },
  { value: 'below', label: 'drops below' },
] as const

type Term = (typeof TERMS)[number]['value']
type Direction = (typeof DIRECTIONS)[number]['value']

interface Rule {
  id: string
  term: Term
  direction: Direction
  threshold: number
  summary: string
}

interface AlertRulesProps {
  apiBase: string
  endpoint: string
}

/**
 * Rules over the terms the ledger already shows (roadmap C4a).
 *
 * Deliberately one sentence: [term] [goes above / drops below] [number]. The
 * value is alerting on the app's own vocabulary, not a query builder.
 */
export function AlertRules({ apiBase, endpoint }: AlertRulesProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [term, setTerm] = useState<Term>('trueFeel')
  const [direction, setDirection] = useState<Direction>('above')
  const [threshold, setThreshold] = useState('36')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Refetch is driven by a counter rather than calling a loader from inside the
  // effect: react-hooks v7 forbids setState reachable synchronously from an
  // effect body, the same constraint use-weather and use-air-quality work under.
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    void fetch(`${apiBase}/api/push/rules?endpoint=${encodeURIComponent(endpoint)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data: { rules?: Rule[] } | null) => {
        if (!cancelled) setRules(data?.rules ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [apiBase, endpoint, refresh])

  const add = async () => {
    const value = Number(threshold)
    if (!Number.isFinite(value)) {
      setError('Enter a number for the threshold.')
      return
    }
    setBusy(true)
    setError(null)
    const r = await fetch(`${apiBase}/api/push/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, rule: { term, direction, threshold: value } }),
    }).catch(() => null)
    setBusy(false)
    if (!r?.ok) {
      setError('Could not save that rule. Check the threshold is in a sensible range.')
      return
    }
    setRefresh((n) => n + 1)
  }

  const remove = async (id: string) => {
    setBusy(true)
    await fetch(`${apiBase}/api/push/rules`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => null)
    setBusy(false)
    setRefresh((n) => n + 1)
  }

  return (
    <div className="alert-rules stack">
      <div className="lbl">
        <span>Your rules</span>
        <span>{rules.length ? `${rules.length} active` : 'none yet'}</span>
      </div>

      {rules.length > 0 && (
        <ul className="rule-list">
          {rules.map((rule) => (
            <li key={rule.id}>
              <span>{rule.summary}</span>
              <button
                type="button"
                className="mini-btn"
                onClick={() => void remove(rule.id)}
                disabled={busy}
                aria-label={`Remove rule: ${rule.summary}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rule-builder">
        <label className="field">
          <span>Alert me when</span>
          <select value={term} onChange={(e) => setTerm(e.target.value as Term)}>
            {TERMS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Direction</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            {DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Threshold</span>
          <input
            className="search-input"
            type="number"
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="btn" onClick={() => void add()} disabled={busy}>
        Add rule
      </button>
    </div>
  )
}
