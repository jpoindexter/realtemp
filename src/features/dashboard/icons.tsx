/**
 * Inline SVG, 24px grid, currentColor, 2px stroke — matching the app's flat
 * ink/paper identity. Not the platform's emoji-adjacent Unicode glyphs
 * (⚙ ⓘ), which render inconsistently — sometimes in full color — across
 * OS/browser font fallbacks. Decorative: the parent button owns aria-label.
 */

const SHARED = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor' }

export function GearIcon() {
  return (
    <svg {...SHARED} strokeWidth={1.75} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.66 6.34l-1.56 1.56M7.9 16.1l-1.56 1.56M17.66 17.66l-1.56-1.56M7.9 7.9 6.34 6.34"
      />
    </svg>
  )
}

export function InfoIcon() {
  return (
    <svg {...SHARED} strokeWidth={1.75} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" d="M12 11v5.5" />
      <circle cx="12" cy="7.75" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg {...SHARED} strokeWidth={1.75} aria-hidden="true" focusable="false">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.2A7.7 7.7 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" />
    </svg>
  )
}

export function SunIcon() {
  return (
    <svg {...SHARED} strokeWidth={1.75} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3.8" />
      <path
        strokeLinecap="round"
        d="M12 2.8v2M12 19.2v2M21.2 12h-2M4.8 12h-2M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5"
      />
    </svg>
  )
}
