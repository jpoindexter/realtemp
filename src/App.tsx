import { useEffect, useState } from 'react'

import { Dashboard } from '@/features/dashboard/Dashboard'
import { useUnit } from '@/features/dashboard/use-unit'
import { LocationSearch } from '@/features/location/LocationSearch'
import { useLocations } from '@/features/location/use-locations'
import { About } from '@/features/settings/About'
import { Settings } from '@/features/settings/Settings'

import type { StoredLocation } from '@/features/location/geocoding'

const THEME_KEY = 'realtemp:theme'
const STYLE_KEY = 'realtemp:style'

export type ThemeMode = 'light' | 'dark'
export type StyleMode = 'soft' | 'classic' | 'signal'

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
  const locations = useLocations()
  const location = locations.active
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [addingCity, setAddingCity] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>(readTheme)
  const [style, setStyle] = useState<StyleMode>(readStyle)
  const [unit, setUnit] = useUnit()

  useEffect(() => {
    applyAppearance(theme, style)
  }, [theme, style])

  const pickLocation = (next: StoredLocation) => {
    locations.add(next)
    setAddingCity(false)
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

  if (!location || addingCity) return <LocationSearch onPick={pickLocation} />

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
        onChangeLocation={() => locations.clear()}
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
      locations={locations.state}
      onSelectCity={locations.select}
      onAddCity={() => setAddingCity(true)}
      unit={unit}
      onSetUnit={setUnit}
      onChangeLocation={() => setAddingCity(true)}
      onOpenSettings={() => setScreen('settings')}
      onOpenAbout={() => setScreen('about')}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  )
}
