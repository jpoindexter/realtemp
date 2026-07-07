import { useState } from 'react'

import { VAPID_PUBLIC_KEY } from '@/lib/config'

import type { StoredLocation } from '@/features/location/geocoding'

const DEFAULT_THRESHOLD_C = 36

function vapidKeyBytes(): Uint8Array {
  const raw = atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

type PushState = 'off' | 'busy' | 'on' | 'denied' | 'error'

interface PushPanelProps {
  apiBase: string
  location: StoredLocation
}

/** Heat-warning subscription (card L8). iPhone: requires the app added to Home Screen first. */
export function PushPanel({ apiBase, location }: PushPanelProps) {
  const [state, setState] = useState<PushState>(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'off',
  )
  const [thresholdC, setThresholdC] = useState(DEFAULT_THRESHOLD_C)

  const enable = async () => {
    setState('busy')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyBytes().buffer as ArrayBuffer,
      })
      const r = await fetch(`${apiBase}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          latitude: location.latitude,
          longitude: location.longitude,
          thresholdC,
        }),
      })
      setState(r.ok ? 'on' : 'error')
    } catch {
      setState('error')
    }
  }

  const disable = async () => {
    setState('busy')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch(`${apiBase}/api/push/subscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setState('off')
    } catch {
      setState('error')
    }
  }

  if (!isPushSupported()) return null

  return (
    <details className="body-panel">
      <summary>Heat warnings · daily check at dawn</summary>
      <div className="stack" style={{ paddingTop: 12 }}>
        <div className="field">
          <label htmlFor="push-threshold">Warn when the day&rsquo;s high reaches (°C air)</label>
          <input
            id="push-threshold"
            className="search-input"
            type="number"
            inputMode="numeric"
            min={20}
            max={50}
            value={thresholdC}
            disabled={state === 'on' || state === 'busy'}
            onChange={(e) => setThresholdC(Number(e.target.value) || DEFAULT_THRESHOLD_C)}
          />
        </div>
        {state === 'denied' && (
          <p className="note" role="status">Notifications are blocked for this site — enable them in browser settings first.</p>
        )}
        {state === 'error' && <p className="error">Could not subscribe. On iPhone, add RealTemp to your Home Screen first.</p>}
        {state !== 'on' ? (
          <button type="button" className="btn" onClick={() => void enable()} disabled={state === 'busy' || state === 'denied'}>
            Enable heat warnings
          </button>
        ) : (
          <>
            <p className="note" role="status">On — checked daily against your location.</p>
            <button type="button" className="btn quiet" onClick={() => void disable()}>
              Turn off
            </button>
          </>
        )}
      </div>
    </details>
  )
}
