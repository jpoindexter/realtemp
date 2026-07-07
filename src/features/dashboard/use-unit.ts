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

export function useUnit(): [TempUnit, (next: TempUnit) => void] {
  const [unit, setUnitState] = useState<TempUnit>(readStoredUnit)

  const setUnit = (next: TempUnit) => {
    try {
      localStorage.setItem(UNIT_KEY, next)
    } catch {
      // storage blocked — unit still works for the session
    }
    setUnitState(next)
  }

  return [unit, setUnit]
}
