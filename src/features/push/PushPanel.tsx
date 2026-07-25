import { useState } from 'react'

import { AlertRules } from './AlertRules'

import { VAPID_PUBLIC_KEY } from '@/lib/config'

import type { StoredLocation } from '@/features/location/geocoding'

const DEFAULT_THRESHOLD_C = 36
const IOS_HOME_SCREEN_ERROR =
  'Could not subscribe. On iPhone, open RealTemp from the Home Screen icon, then try again.'
const SERVICE_WORKER_ERROR = 'Could not subscribe. RealTemp is still setting up notifications - try again in a moment.'
const SERVER_ERROR = 'Could not save this alert. Check your connection and try again.'

function vapidKeyBytes(): Uint8Array {
  const raw = atob(VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function isAppleMobileDevice(): boolean {
  const navigatorWithTouch = navigator as Navigator & { standalone?: boolean }
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigatorWithTouch.maxTouchPoints > 1)
}

function isStandaloneDisplay(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function needsHomeScreenForPush(): boolean {
  return isAppleMobileDevice() && !isStandaloneDisplay()
}

function pushErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return IOS_HOME_SCREEN_ERROR
  if (name === 'InvalidStateError' || name === 'AbortError') return SERVICE_WORKER_ERROR
  return SERVER_ERROR
}

type PushState = 'off' | 'busy' | 'on' | 'denied' | 'error' | 'server-pending'

interface PushPanelProps {
  apiBase: string
  location: StoredLocation
}

/** Heat-warning subscription (card L8). iPhone: requires the app added to Home Screen first. */
export function PushPanel({ apiBase, location }: PushPanelProps) {
  const [state, setState] = useState<PushState>(() =>
    typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'off',
  )
  const [errorMessage, setErrorMessage] = useState(SERVER_ERROR)
  const [thresholdC, setThresholdC] = useState(DEFAULT_THRESHOLD_C)
  // Kept so the rule builder can address this subscription once it exists.
  const [endpoint, setEndpoint] = useState<string | null>(null)

  const enable = async () => {
    setState('busy')
    try {
      if (needsHomeScreenForPush()) {
        setErrorMessage(IOS_HOME_SCREEN_ERROR)
        setState('error')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      await navigator.serviceWorker.register('/sw.js')
      const registration = await navigator.serviceWorker.ready
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
      if (r.ok) {
        setEndpoint(subscription.endpoint)
        setState('on')
      }
      else if (r.status === 404) setState('server-pending')
      else {
        setErrorMessage(SERVER_ERROR)
        setState('error')
      }
    } catch (error) {
      setErrorMessage(pushErrorMessage(error))
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

  // Collapsed by default — this is alert setup, not something you read on a
  // walk, and expanded it cost ~200px of the Tune tab.
  return (
    <details className="body-panel disclosure">
      <summary className="body-panel-title">Heat warnings · daily check at dawn</summary>
      <div className="stack">
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
        {state === 'error' && <p className="error" role="alert">{errorMessage}</p>}
        {state === 'on' && endpoint && apiBase && <AlertRules apiBase={apiBase} endpoint={endpoint} />}
        {state === 'server-pending' && (
          <p className="note" role="status">Warnings aren&rsquo;t switched on server-side yet — one deploy away (runbook &sect;2).</p>
        )}
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
