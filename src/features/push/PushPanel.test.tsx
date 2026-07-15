import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PushPanel } from './PushPanel'

const API = 'https://api.example.test'
const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubPushEnvironment({
  standalone = true,
  userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  platform = 'iPhone',
  maxTouchPoints = 5,
  permission = 'granted',
  subscribe = vi.fn(async () => ({ endpoint: 'https://push.example.test/subscription' })),
}: {
  standalone?: boolean
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
  permission?: NotificationPermission
  subscribe?: ReturnType<typeof vi.fn>
} = {}) {
  const staleSubscribe = vi.fn(async () => {
    throw new DOMException('No active worker', 'InvalidStateError')
  })
  const serviceWorker = {
    register: vi.fn(async () => ({ pushManager: { subscribe: staleSubscribe } })),
    ready: Promise.resolve({ pushManager: { subscribe } }),
  }

  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: serviceWorker,
  })
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: userAgent })
  Object.defineProperty(window.navigator, 'platform', { configurable: true, value: platform })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: maxTouchPoints })
  Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: standalone })

  vi.stubGlobal('PushManager', vi.fn())
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn(async () => permission),
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) })))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: standalone })))

  return { serviceWorker, staleSubscribe, subscribe }
}

describe('PushPanel', () => {
  it(
    'waits for the active service worker before subscribing on first install',
    async () => {
      const { serviceWorker, staleSubscribe, subscribe } = stubPushEnvironment()
      render(<PushPanel apiBase={API} location={valencia} />)

      screen.getByRole('button', { name: /enable heat warnings/i }).click()

      await waitFor(() => expect(screen.getByText(/checked daily/i)).toBeDefined())
      expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(staleSubscribe).not.toHaveBeenCalled()
      expect(subscribe).toHaveBeenCalledTimes(1)
    },
    10_000,
  )

  it('does not tell an installed iPhone app to add itself to the Home Screen when subscribe fails', async () => {
    stubPushEnvironment({
      standalone: true,
      subscribe: vi.fn(async () => {
        throw new DOMException('No active worker', 'InvalidStateError')
      }),
    })
    render(<PushPanel apiBase={API} location={valencia} />)

    screen.getByRole('button', { name: /enable heat warnings/i }).click()

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('still setting up notifications'))
    expect(screen.queryByText(/add RealTemp to your Home Screen first/i)).toBeNull()
  })

  it('keeps the Home Screen instruction for iPhone browser tabs', async () => {
    const { serviceWorker } = stubPushEnvironment({ standalone: false })
    render(<PushPanel apiBase={API} location={valencia} />)

    screen.getByRole('button', { name: /enable heat warnings/i }).click()

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('open RealTemp from the Home Screen icon'))
    expect(Notification.requestPermission).not.toHaveBeenCalled()
    expect(serviceWorker.register).not.toHaveBeenCalled()
  })
})
