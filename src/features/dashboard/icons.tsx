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
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2.05 2.05 0 1 1-2.9 2.9l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.02.08a2.05 2.05 0 0 1-4 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2.05 2.05 0 1 1-2.9-2.9l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.02a2.05 2.05 0 0 1 0-4L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2.05 2.05 0 1 1 2.9-2.9l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.02-.08a2.05 2.05 0 0 1 4 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2.05 2.05 0 1 1 2.9 2.9l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1l.08.02a2.05 2.05 0 0 1 0 4L20 14a1.7 1.7 0 0 0-.6 1Z"
      />
    </svg>
  )
}

export function RefreshIcon() {
  return (
    <svg {...SHARED} strokeWidth={1.75} aria-hidden="true" focusable="false">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 0 1-13.2 6.1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12A8 8 0 0 1 17.2 5.9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.2 2.8v3.1h-3.1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.8 21.2v-3.1h3.1" />
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
