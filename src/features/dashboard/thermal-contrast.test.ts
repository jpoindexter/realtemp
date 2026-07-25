import { describe, expect, it } from 'vitest'

import { inkForTheme, thermalStop } from './thermal-scale'

import type { ThermalStop } from './thermal-scale'

/** OKLCH -> linear sRGB. Linear sRGB is what WCAG luminance wants. */
function linearRgb({ l: L, c: C, h: H }: ThermalStop): number[] {
  const hr = (H * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const [l3, m3, s3] = [l_ ** 3, m_ ** 3, s_ ** 3]
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ].map((v) => Math.min(1, Math.max(0, v)))
}

const lum = (rgb: number[]): number =>
  0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0)

function contrast(a: ThermalStop, b: ThermalStop): number {
  const [hi, lo] = [lum(linearRgb(a)), lum(linearRgb(b))].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

/**
 * The ramp changes the page background continuously, so checking its anchor
 * stops proves nothing about the degrees between them. This walks every degree
 * of the usable range and fails on the first that cannot carry body text.
 * An unreadable ground already reached production once.
 */
describe('thermal ramp contrast', () => {
  const AA = 4.5

  it.each(['light', 'dark'] as const)(
    'carries body text at every degree from -15 to 50 (%s ramp)',
    (theme) => {
      const failures: string[] = []
      for (let t = -15; t <= 50; t += 1) {
        const ground = thermalStop(t, theme)
        const { ink, ink2 } = inkForTheme(theme)
        const primary = contrast(ink, ground)
        const secondary = contrast(ink2, ground)
        if (primary < AA) failures.push(`${t}°C ink ${primary.toFixed(2)}:1`)
        if (secondary < AA) failures.push(`${t}°C ink-2 ${secondary.toFixed(2)}:1`)
      }
      expect(failures).toEqual([])
    },
  )

  it('holds through the hot end of the light ramp, where it is tightest', () => {
    for (let t = 30; t <= 50; t += 0.5) {
      const ground = thermalStop(t, 'light')
      const { ink, ink2 } = inkForTheme('light')
      expect(contrast(ink, ground)).toBeGreaterThanOrEqual(AA)
      expect(contrast(ink2, ground)).toBeGreaterThanOrEqual(AA)
    }
  })
})
