#!/usr/bin/env node
/**
 * Computes WCAG 2.2 contrast for every text/background pair in tokens.css.
 *
 * The palette is authored in OKLCH, so this converts OKLCH -> OKLab -> linear
 * sRGB -> relative luminance. Linear sRGB IS what the WCAG luminance formula
 * wants, so no gamma round-trip is needed.
 *
 * Exists because "looks readable" is not a measurement. The --solar token was
 * darkened once already after measuring 2.86:1 against paper while looking
 * perfectly fine by eye.
 */
import { readFileSync } from 'node:fs'

const AA_TEXT = 4.5 // normal text
const AA_LARGE = 3.0 // >=24px, or >=18.66px bold
const AA_UI = 3.0 // component boundaries, focus rings

/** oklch(L C H) -> linear sRGB triple, clamped to gamut. */
function oklchToLinearRgb(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)))
}

/** WCAG relative luminance from linear sRGB. */
function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

/** Collect `--name: oklch(L C H)` declarations, scoped by selector block. */
function collectScope(startPattern) {
  const start = css.indexOf(startPattern)
  if (start === -1) return {}
  const open = css.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const block = css.slice(open, end)
  const out = {}
  for (const m of block.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+\s*)?\)/g)) {
    out[m[1]] = oklchToLinearRgb(Number(m[2]), Number(m[3]), Number(m[4]))
  }
  for (const m of block.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)/g)) {
    out[m[1]] = m[2] // resolve after primitives are known
  }
  return out
}

function resolve(scope, base) {
  const out = { ...base, ...scope }
  for (const [k, v] of Object.entries(out)) {
    let seen = 0
    let cur = v
    while (typeof cur === 'string' && seen++ < 10) cur = out[cur]
    out[k] = cur
  }
  return out
}

const root = collectScope(':root {')
const lightBase = resolve(root, {})
const light = resolve(collectScope(":root[data-theme='light']"), lightBase)
const dark = resolve(collectScope(":root[data-theme='dark']"), lightBase)

/** [foreground, background, minimum, label] */
const PAIRS = [
  ['ink', 'ground', AA_TEXT, 'body text on page'],
  ['ink', 'paper', AA_TEXT, 'body text on surface'],
  ['ink-2', 'ground', AA_TEXT, 'secondary text on page'],
  ['ink-2', 'paper', AA_TEXT, 'secondary/labels on surface'],
  ['solar', 'ground', AA_TEXT, 'sun premium value'],
  ['solar', 'paper', AA_TEXT, 'caution text on surface'],
  ['scorch', 'ground', AA_TEXT, 'heat total value'],
  ['scorch', 'paper', AA_TEXT, 'danger text on surface'],
  ['shade', 'ground', AA_TEXT, 'cooling delta value'],
  ['shade', 'paper', AA_TEXT, 'cooling delta on surface'],
  ['uhi', 'ground', AA_TEXT, 'surroundings delta'],
  ['on-strong', 'scorch', AA_TEXT, 'text on danger fill'],
  ['paper', 'ink', AA_TEXT, 'inverted (selected segment)'],
  ['shade', 'ground', AA_UI, 'focus ring vs page'],
]

/* Reported, not asserted. WCAG 1.4.11 covers parts needed to IDENTIFY a
   control; it explicitly exempts pure decoration. Every --line usage is a row
   divider, a panel edge, a chart baseline, or the radar attribution chip —
   none of them identify anything. Interactive borders (segments, tabs,
   buttons) use --ink at ~15:1. Forcing dividers to 3:1 would render hairlines
   as heavy rules and wreck the ledger. Printed so a future change that makes
   --line load-bearing is visible rather than silent. */
const INFORMATIONAL = [['line', 'ground', 'hairline vs page (decorative)']]

let failed = 0
for (const [themeName, theme] of [
  ['LIGHT', light],
  ['DARK', dark],
]) {
  console.log(`\n${themeName}`)
  for (const [fg, bg, min, label] of PAIRS) {
    if (!Array.isArray(theme[fg]) || !Array.isArray(theme[bg])) {
      console.log(`  SKIP  --${fg} on --${bg} (unresolved)`)
      continue
    }
    const ratio = contrast(theme[fg], theme[bg])
    const ok = ratio >= min
    if (!ok) failed++
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2).padStart(5)}:1  (min ${min})  --${fg} on --${bg}  — ${label}`,
    )
  }
  for (const [fg, bg, label] of INFORMATIONAL) {
    if (!Array.isArray(theme[fg]) || !Array.isArray(theme[bg])) continue
    console.log(`  ----  ${contrast(theme[fg], theme[bg]).toFixed(2).padStart(5)}:1  (n/a)     --${fg} on --${bg}  — ${label}`)
  }
}

/* The page does not actually render --ground: it renders --thermal-wash, which
   is --ground with chroma pushed up and hue swung from 250 (cold) to 60 (hot).
   Testing --ground alone would verify a colour the user never sees. Chroma at
   fixed lightness barely moves luminance, but "barely" is not a measurement. */
const THERMAL_CHROMA_BUMP = 0.03
const STYLE_STRENGTH = { default: 1, soft: 1.4, signal: 0.35 }

console.log('\nTHERMAL WASH (the colour actually painted)')
for (const [themeName, theme, groundL, groundC] of [
  ['LIGHT', light, 0.958, 0.005],
  ['DARK', dark, 0.152, 0.008],
]) {
  for (const [styleName, strength] of Object.entries(STYLE_STRENGTH)) {
    for (const [tempName, hue] of [
      ['cold', 250],
      ['hot', 60],
    ]) {
      const wash = oklchToLinearRgb(groundL, groundC + THERMAL_CHROMA_BUMP * strength, hue)
      for (const fg of ['ink', 'ink-2']) {
        if (!Array.isArray(theme[fg])) continue
        const ratio = contrast(theme[fg], wash)
        const ok = ratio >= AA_TEXT
        if (!ok) failed++
        console.log(
          `  ${ok ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2).padStart(5)}:1  --${fg} on wash  — ${themeName.toLowerCase()}/${styleName}/${tempName}`,
        )
      }
    }
  }
}

console.log('')
if (failed) {
  console.error(`${failed} contrast pair(s) below WCAG 2.2 AA. Darken or lighten the token, then re-run.`)
  process.exit(1)
}
console.log('All token pairs meet WCAG 2.2 AA.')
