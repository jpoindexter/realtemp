import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReportButtons } from './ReportButtons'

const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }
const API = 'https://api.example.test'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function stubFetch(summaryCounts: object, postStatus = 200) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === 'POST') return { ok: postStatus < 400, status: postStatus, json: async () => ({ ok: true }) }
    return { ok: true, status: 200, json: async () => ({ windowHours: 3, counts: summaryCounts }) }
  })
}

describe('ReportButtons', () => {
  it('shows nearby counts and logs a vote', async () => {
    const fetchMock = stubFetch({ hotter: 2, cooler: 0, 'spot-on': 1 })
    vi.stubGlobal('fetch', fetchMock)
    render(<ReportButtons apiBase={API} location={valencia} />)

    await waitFor(() => expect(screen.getByText(/2 hotter/)).toBeDefined())
    screen.getByRole('button', { name: 'Hotter' }).click()
    await waitFor(() => expect(screen.getByText(/Logged — thanks/)).toBeDefined())

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(post?.[0]).toBe(`${API}/api/reports`)
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ vote: 'hotter', latitude: 39.47 })
  })

  it('explains the rate limit on 429 instead of failing silently', async () => {
    vi.stubGlobal('fetch', stubFetch({ hotter: 0, cooler: 0, 'spot-on': 0 }, 429))
    render(<ReportButtons apiBase={API} location={valencia} />)

    screen.getByRole('button', { name: 'Spot-on' }).click()
    await waitFor(() => expect(screen.getByText(/one report per 10 minutes/i)).toBeDefined())
  })
})
