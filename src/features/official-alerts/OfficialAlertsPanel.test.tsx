import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OfficialAlertsPanel } from './OfficialAlertsPanel'

const API = 'https://api.example.test'
const valencia = { label: 'Valencia', latitude: 39.47, longitude: -0.376 }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('OfficialAlertsPanel', () => {
  it('fetches official CAP alerts only after the user opens the panel', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        source: 'AEMET',
        cell: '39.47,-0.38',
        alerts: [
          {
            headline: 'Extreme high-temperature warning. Litoral norte de Valencia',
            level: 'red',
            geocode: '774602',
          },
        ],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    render(<OfficialAlertsPanel apiBase={API} location={valencia} />)

    expect(fetchMock).not.toHaveBeenCalled()
    screen.getByText('Official alerts · AEMET').click()

    await waitFor(() => expect(screen.getByText('Extreme high-temperature warning. Litoral norte de Valencia')).toBeDefined())
    expect(screen.getByText('red')).toBeDefined()
    expect(fetchMock).toHaveBeenCalledWith(`${API}/api/alerts?latitude=39.47&longitude=-0.376`)
  })
})
