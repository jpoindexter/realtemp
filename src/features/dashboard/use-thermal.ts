import { useEffect } from 'react'

import { inkForTheme, thermalCss, thermalStop } from './thermal-scale'

import type { ThermalTheme } from './thermal-scale'

/**
 * Paints the page ground as a meteorological temperature scale — violet-white
 * through blue, cyan, green, yellow, amber, orange, red-orange — and sets the
 * ink pair that ground can carry.
 *
 * Presentation only; the formula is untouched.
 *
 * Painted directly rather than through `background: var(--token)`. Chrome
 * resolves that declaration once and does not invalidate it when the referenced
 * custom property changes on :root — measured: the token held the right value
 * while the body kept painting the stylesheet's fallback.
 */
export function useThermal(trueFeelC: number | null): void {
  // Re-read on theme change: the attribute is set by App's appearance effect,
  // and the ramp has to swap with it.
  const themeAttr =
    typeof document === 'undefined' ? 'light' : document.documentElement.getAttribute('data-theme')

  useEffect(() => {
    const root = document.documentElement
    const clear = () => {
      for (const prop of ['--thermal', '--thermal-wash', '--ink', '--ink-2']) {
        root.style.removeProperty(prop)
      }
      document.body.style.removeProperty('background-color')
    }
    if (trueFeelC === null || !Number.isFinite(trueFeelC)) return clear()

    // The ramp follows the user's theme rather than overriding it. A light
    // ground forced onto a dark theme leaves panels and controls dark, so the
    // ink cannot satisfy both — that is how the tab bar went unreadable.
    const theme: ThermalTheme =
      root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    const ground = thermalStop(trueFeelC, theme)
    const { ink, ink2 } = inkForTheme(theme)
    const wash = thermalCss(ground)

    root.style.setProperty('--thermal', ground.l.toFixed(3))
    root.style.setProperty('--thermal-wash', wash)
    // Ink follows the ground: the hot end is dark enough that the default
    // secondary ink would fall under 4.5:1. thermal-contrast.test.ts walks every
    // degree of the ramp and fails if a pairing ever drops below AA.
    root.style.setProperty('--ink', thermalCss(ink))
    root.style.setProperty('--ink-2', thermalCss(ink2))
    document.body.style.backgroundColor = wash
  }, [trueFeelC, themeAttr])
}
