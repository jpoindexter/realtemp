import { useState } from 'react'
import { z } from 'zod'

import { DEFAULT_BIO } from '@/features/formula/types'

import type { BioProfile } from '@/features/formula/types'

const BIO_KEY = 'realtemp:bio'

const bioSchema = z.object({
  heightCm: z.number().min(100).max(230).nullable().catch(null),
  weightKg: z.number().min(30).max(250).nullable().catch(null),
  metabolic: z.enum(['low', 'normal', 'high']).default('normal'),
  clothing: z.enum(['light', 'normal', 'warm']).default('normal'),
})

function readStoredBio(): BioProfile {
  try {
    const raw = localStorage.getItem(BIO_KEY)
    if (!raw) return DEFAULT_BIO
    const parsed = bioSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_BIO
  } catch {
    return DEFAULT_BIO
  }
}

export function useBio(): [BioProfile, (patch: Partial<BioProfile>) => void] {
  const [bio, setBio] = useState<BioProfile>(readStoredBio)

  const update = (patch: Partial<BioProfile>) => {
    setBio((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(BIO_KEY, JSON.stringify(next))
      } catch {
        // storage blocked — profile still works for the session
      }
      return next
    })
  }

  return [bio, update]
}
