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

export type ThemeMode = 'light' | 'dark'

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

function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141311' : '#edede8')
}

export function App() {
  const [location, setLocation] = useState<StoredLocation | null>(readStoredLocation)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [theme, setTheme] = useState<ThemeMode>(readTheme)
  const [unit, setUnit] = useUnit()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

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
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        // storage blocked — visual theme still updates for the session
      }
      return next
    })
  }

  if (!location) return <LocationSearch onPick={pickLocation} />

  if (screen === 'settings') {
    return (
      <Settings
        unit={unit}
        onSetUnit={setUnit}
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
