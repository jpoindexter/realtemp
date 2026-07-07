import { useEffect, useState } from 'react'

import type { StoredLocation } from '@/features/location/geocoding'
import type { TrueFeel } from '@/features/formula/types'

interface CopyLineProps {
  apiBase: string
  location: StoredLocation
  result: TrueFeel
}

/**
 * One LLM-written street line (card L5). Fetched once per location — the
 * Worker caches per location-hour, so this stays a single cheap call.
 * Renders nothing until a line exists; failure is silence, not noise.
 */
export function CopyLine({ apiBase, location, result }: CopyLineProps) {
  const [line, setLine] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`${apiBase}/api/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        trueFeelC: result.trueFeelC,
        baseC: result.baseC,
        deltas: result.deltas.map((d) => ({ label: d.label, deltaC: d.deltaC })),
        sweatEfficiencyPct: result.sweatEfficiencyPct,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { available: boolean; line?: string } | null) => {
        if (!cancelled && data?.available && data.line) setLine(data.line)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Intentionally keyed on location only: the server caches per location-hour,
    // and toggle taps shouldn't spam the LLM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, location.latitude, location.longitude])

  if (!line) return null
  return <p className="copy-line">{line}</p>
}
