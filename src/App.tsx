import { useEffect, useState } from 'react'

import { Dashboard } from '@/features/dashboard/Dashboard'
import { useUnit } from '@/features/dashboard/use-unit'
import { LocationSearch } from '@/features/location/LocationSearch'
import { storedLocationSchema } from '@/features/location/geocoding'
import { About } from '@/features/settings/About'
import { Settings } from '@/features/settings/Settings'

import type { StoredLocation } from '@/features/location/geocoding'

const LOCATION_KEY = 'realtemp:location'
const THEME_KEY = 'realtemp:theme'
const STYLE_KEY = 'realtemp:style'

export type ThemeMode = 'light' | 'dark'
export type StyleMode = 'soft' | 'classic' | 'signal'

function readStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    const parsed = storedLocationSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

type Screen = 'dashboard' | 'settings' | 'about'

function readTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked — fall through to system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStyle(): StyleMode {
  try {
    const saved = localStorage.getItem(STYLE_KEY)
    if (saved === 'soft' || saved === 'classic' || saved === 'signal') return saved
  } catch {
    // storage blocked — fall through to the calmer default style
  }
  return 'soft'
}

function applyAppearance(theme: ThemeMode, style: StyleMode): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.setAttribute('data-style', style)
  const lightColors: Record<StyleMode, string> = {
    classic: '#edede8',
    soft: '#f1efe8',
    signal: '#eaf2ee',
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#141311' : lightColors[style])
}

export function App() {
  const [location, setLocation] = useState<StoredLocation | null>(readStoredLocation)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [theme, setTheme] = useState<ThemeMode>(readTheme)
  const [style, setStyle] = useState<StyleMode>(readStyle)
  const [unit, setUnit] = useUnit()

  useEffect(() => {
    applyAppearance(theme, style)
  }, [theme, style])

  const pickLocation = (next: StoredLocation) => {
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(next))
    } catch {
      // storage blocked — location still works for the session
    }
    setLocation(next)
    setScreen('dashboard')
  }

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }

  const saveTheme = (next: ThemeMode) => {
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // storage blocked — visual theme still updates for the session
    }
  }

  const pickTheme = (next: ThemeMode) => {
    saveTheme(next)
    setTheme(next)
  }

  const pickStyle = (next: StyleMode) => {
    try {
      localStorage.setItem(STYLE_KEY, next)
    } catch {
      // storage blocked — visual style still updates for the session
    }
    setStyle(next)
  }

  if (!location) return <LocationSearch onPick={pickLocation} />

  if (screen === 'settings') {
    return (
      <Settings
        unit={unit}
        onSetUnit={setUnit}
        theme={theme}
        onSetTheme={pickTheme}
        style={style}
        onSetStyle={pickStyle}
        location={location}
        onChangeLocation={() => setLocation(null)}
        onBack={() => setScreen('dashboard')}
      />
    )
  }

  if (screen === 'about') {
    return <About onBack={() => setScreen('dashboard')} />
  }

  return (
    <Dashboard
      location={location}
      unit={unit}
      onSetUnit={setUnit}
      onChangeLocation={() => setLocation(null)}
      onOpenSettings={() => setScreen('settings')}
      onOpenAbout={() => setScreen('about')}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
