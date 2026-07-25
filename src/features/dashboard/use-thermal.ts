import { useEffect } from 'react'

import { THERMAL_COLD_C, THERMAL_HOT_C } from '@/features/formula/constants'

/**
 * Drives the interface's thermal tint from the reading on screen.
 *
 * Presentation only — this never touches the formula. It maps True Feel onto a
 * 0..1 scalar and writes the resulting ground colour as a literal.
 *
 * Why a literal rather than `color-mix(... var(--thermal))` in CSS: Chrome does
 * not reliably invalidate a var() chain nested inside a colour function. Both
 * `oklch(from var(--ground) l c var(--hue))` and
 * `color-mix(..., var(--ground-hot) var(--thermal-mix))` computed once at the
 * cold end and then ignored every later change, while the same expressions
 * evaluated correctly when written inline on a probe element. The endpoints
 * still live in tokens.css; only the interpolation happens here.
 */

/** Parse `oklch(L C H)` — accepts the `95.8%` form Chrome serialises to. */
function parseOklch(value: string): [number, number, number] | null {
  const m = value.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return null
  const l = Number(m[1]) / (m[2] === '%' ? 100 : 1)
  return [l, Number(m[3]), Number(m[4])]
}

export function useThermal(trueFeelC: number | null): void {
  useEffect(() => {
    const root = document.documentElement
    const clear = () => {
      root.style.removeProperty('--thermal')
      root.style.removeProperty('--thermal-wash')
      document.body.style.removeProperty('background-color')
    }
    if (trueFeelC === null || !Number.isFinite(trueFeelC)) return clear()

    const styles = getComputedStyle(root)
    const cold = parseOklch(styles.getPropertyValue('--ground-cold'))
    const hot = parseOklch(styles.getPropertyValue('--ground-hot'))
    if (!cold || !hot) return clear()

    const span = THERMAL_HOT_C - THERMAL_COLD_C
    const t = Math.min(1, Math.max(0, (trueFeelC - THERMAL_COLD_C) / span))
    const lerp = (a: number, b: number) => a + (b - a) * t

    const wash = `oklch(${lerp(cold[0], hot[0]).toFixed(4)} ${lerp(cold[1], hot[1]).toFixed(4)} ${lerp(cold[2], hot[2]).toFixed(1)})`
    root.style.setProperty('--thermal', t.toFixed(3))
    root.style.setProperty('--thermal-wash', wash)
    // Painted directly rather than via `background: var(--thermal-wash)`.
    // Chrome resolves that declaration once and does not invalidate it when the
    // referenced property changes on :root — measured: the token held the right
    // warm value while the body kept painting the stylesheet's cold fallback.
    document.body.style.backgroundColor = wash
  }, [trueFeelC])
}
