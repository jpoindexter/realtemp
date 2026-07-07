export type TempUnit = 'c' | 'f'

export const cToF = (c: number): number => (c * 9) / 5 + 32

/** Absolute temperature for display, converted but never re-rounded upstream. */
export const displayTemp = (celsius: number, unit: TempUnit): string =>
  (unit === 'c' ? celsius : cToF(celsius)).toFixed(1)

/** Deltas convert by scale only (×1.8) — an offset would corrupt a difference. */
export const displayDelta = (deltaC: number, unit: TempUnit): string => {
  const v = unit === 'c' ? deltaC : deltaC * 1.8
  return `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)}°`
}
