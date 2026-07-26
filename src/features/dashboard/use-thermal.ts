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
 * The theme arrives as an argument, NOT by reading data-theme off the DOM.
 * React runs child effects before parent effects, so the attribute App sets in
 * its appearance effect is always one render stale here — every theme toggle
 * left the ramp on the previous theme while --paper had already flipped, which
 * rendered the tab bar dark-on-dark.
 *
 * Painted directly rather than through `background: var(--token)`. Chrome
 * resolves that declaration once and does not invalidate it when the referenced
 * custom property changes on :root — measured: the token held the right value
 * while the body kept painting the stylesheet's fallback.
 */
export function useThermal(trueFeelC: number | null, theme: ThermalTheme): void {

  useEffect(() => {
    const root = document.documentElement
    const clear = () => {
      for (const prop of ['--thermal', '--thermal-wash', '--ink', '--ink-2']) {
        root.style.removeProperty(prop)
      }
      document.body.style.removeProperty('background-color')
    }
    if (trueFeelC === null || !Number.isFinite(trueFeelC)) return clear()

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

    // Tear the overrides down when the dashboard unmounts. Without this they
    // outlive the screen that set them: Settings, About and the location search
    // kept a stale --ink from whichever theme was last active while --paper
    // still followed the current one, so the buttons rendered dark-on-dark with
    // invisible labels. Off the dashboard, the theme tokens own the page.
    return clear
  }, [trueFeelC, theme])
}
