/**
 * The page ground as a meteorological temperature scale.
 *
 * Presentation only — this never touches the formula. True Feel maps onto the
 * hue arc weather maps use: violet-white through blue, cyan, green, yellow,
 * amber, orange, red.
 *
 * Lightness falls as it heats up, and that is not a style choice: at the
 * lightness of a light-mode page (L~0.96) the sRGB gamut holds barely 0.06
 * chroma, so red does not exist up there — you get pale peach. A real red
 * ground has to sit near L 0.5, which means the ink has to flip to light. That
 * is what INK_FLIP_L and thermalPolarity are for.
 */

export type ThermalTheme = 'light' | 'dark'

export interface ThermalStop {
  l: number
  c: number
  h: number
}

/**
 * Ground lightness at which text must flip from dark ink to light ink.
 * Chosen so both polarities clear WCAG AA against every stop on the ramp —
 * `npm run verify:contrast` walks the whole scale degree by degree and fails if
 * this value drifts out of a safe position.
 */
export const INK_FLIP_L = 0.68

/** °C -> colour. Anchors, interpolated in OKLCH so the arc stays even. */
const STOPS_LIGHT: { t: number; stop: ThermalStop }[] = [
  { t: -10, stop: { l: 0.972, c: 0.022, h: 295 } }, // near-white violet
  { t: 0, stop: { l: 0.95, c: 0.05, h: 252 } }, // pale blue
  { t: 8, stop: { l: 0.932, c: 0.072, h: 215 } }, // cyan
  { t: 16, stop: { l: 0.93, c: 0.06, h: 155 } }, // green — comfortable
  { t: 22, stop: { l: 0.918, c: 0.105, h: 100 } }, // yellow
  { t: 28, stop: { l: 0.878, c: 0.135, h: 75 } }, // amber
  { t: 34, stop: { l: 0.835, c: 0.16, h: 52 } }, // orange
  { t: 40, stop: { l: 0.795, c: 0.175, h: 35 } }, // vermilion
  { t: 46, stop: { l: 0.768, c: 0.182, h: 24 } }, // hottest — red-orange
]

/* Dark mode gets the same hue arc at low lightness rather than the light ramp.
   Overriding a dark theme with a light ground leaves every panel and control
   still dark — dark ink on dark paper — which is how the tab bar went
   unreadable in testing. A user who chose dark mode keeps it; only the hue
   carries the temperature. */
const STOPS_DARK: { t: number; stop: ThermalStop }[] = [
  { t: -10, stop: { l: 0.185, c: 0.028, h: 295 } },
  { t: 0, stop: { l: 0.178, c: 0.042, h: 252 } },
  { t: 8, stop: { l: 0.172, c: 0.048, h: 215 } },
  { t: 16, stop: { l: 0.168, c: 0.04, h: 155 } },
  { t: 22, stop: { l: 0.175, c: 0.052, h: 100 } },
  { t: 28, stop: { l: 0.185, c: 0.07, h: 66 } },
  { t: 34, stop: { l: 0.198, c: 0.086, h: 44 } },
  { t: 40, stop: { l: 0.212, c: 0.098, h: 30 } },
  { t: 46, stop: { l: 0.222, c: 0.105, h: 22 } },
]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export function thermalStop(trueFeelC: number, theme: ThermalTheme = 'light'): ThermalStop {
  const stops = theme === 'dark' ? STOPS_DARK : STOPS_LIGHT
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) throw new Error('thermal scale has no stops')
  if (trueFeelC <= first.t) return { ...first.stop }
  if (trueFeelC >= last.t) return { ...last.stop }

  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i]
    const hi = stops[i + 1]
    if (!lo || !hi) continue
    if (trueFeelC >= lo.t && trueFeelC <= hi.t) {
      const k = (trueFeelC - lo.t) / (hi.t - lo.t)
      return {
        l: lerp(lo.stop.l, hi.stop.l, k),
        c: lerp(lo.stop.c, hi.stop.c, k),
        h: lerp(lo.stop.h, hi.stop.h, k),
      }
    }
  }
  return { ...last.stop }
}

/** Which ink set this ground needs. 'light' ground -> dark ink, and vice versa. */
export function thermalPolarity(groundL: number): 'light' | 'dark' {
  return groundL > INK_FLIP_L ? 'light' : 'dark'
}

export const thermalCss = (stop: ThermalStop): string =>
  `oklch(${stop.l.toFixed(4)} ${stop.c.toFixed(4)} ${stop.h.toFixed(1)})`

/**
 * Ink pairs for the two ground polarities. They live here rather than in
 * tokens.css because the ramp is painted from JS, and a duplicated value in CSS
 * would be free to drift out of the range the contrast test pins.
 */
export const INK_ON_LIGHT: ThermalStop = { l: 0.215, c: 0.009, h: 59 }
export const INK2_ON_LIGHT: ThermalStop = { l: 0.32, c: 0.014, h: 62 }
export const INK_ON_DARK: ThermalStop = { l: 0.975, c: 0.008, h: 80 }
export const INK2_ON_DARK: ThermalStop = { l: 0.88, c: 0.018, h: 75 }

/** The ink pair a given ground calls for. */
export function inkFor(groundL: number): { ink: ThermalStop; ink2: ThermalStop } {
  return thermalPolarity(groundL) === 'light'
    ? { ink: INK_ON_LIGHT, ink2: INK2_ON_LIGHT }
    : { ink: INK_ON_DARK, ink2: INK2_ON_DARK }
}

/** Ink for a ramp, keyed by the theme the ramp belongs to. */
export function inkForTheme(theme: ThermalTheme): { ink: ThermalStop; ink2: ThermalStop } {
  return theme === 'dark'
    ? { ink: INK_ON_DARK, ink2: INK2_ON_DARK }
    : { ink: INK_ON_LIGHT, ink2: INK2_ON_LIGHT }
}
