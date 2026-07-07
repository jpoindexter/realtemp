import { useState } from 'react'
import { z } from 'zod'

import type { Toggles } from '@/features/formula/types'

const TOGGLES_KEY = 'realtemp:toggles'

const togglesSchema = z.object({
  exposure: z.enum(['sun', 'shade', 'overcast']),
  environment: z.enum(['urban', 'open', 'nature']),
  activity: z.enum(['stagnant', 'walking', 'active']),
  // default keeps toggles stored before this field existed valid — and no effect until opted in
  acclimatization: z.enum(['new', 'settling', 'local']).default('local'),
})

const DEFAULT_TOGGLES: Toggles = {
  exposure: 'sun',
  environment: 'urban',
  activity: 'walking',
  acclimatization: 'local',
}

function readStoredToggles(): Toggles {
  try {
    const raw = localStorage.getItem(TOGGLES_KEY)
    if (!raw) return DEFAULT_TOGGLES
    const parsed = togglesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_TOGGLES
  } catch {
    return DEFAULT_TOGGLES
  }
}

export function useToggles(): [Toggles, (patch: Partial<Toggles>) => void] {
  const [toggles, setToggles] = useState<Toggles>(readStoredToggles)

  const update = (patch: Partial<Toggles>) => {
    setToggles((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(TOGGLES_KEY, JSON.stringify(next))
      } catch {
        // storage full/blocked — toggles still work for the session
      }
      return next
    })
  }

  return [toggles, update]
}
