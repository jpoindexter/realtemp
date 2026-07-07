import { useState } from 'react'

import type { TempUnit } from './format-temp'

const UNIT_KEY = 'realtemp:unit'

function readStoredUnit(): TempUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === 'f' ? 'f' : 'c'
  } catch {
    return 'c'
  }
}

export function useUnit(): [TempUnit, () => void] {
  const [unit, setUnit] = useState<TempUnit>(readStoredUnit)

  const toggle = () => {
    setUnit((prev) => {
      const next = prev === 'c' ? 'f' : 'c'
      try {
        localStorage.setItem(UNIT_KEY, next)
      } catch {
        // storage blocked — unit still works for the session
      }
      return next
    })
  }

  return [unit, toggle]
}
