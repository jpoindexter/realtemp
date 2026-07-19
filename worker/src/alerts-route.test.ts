import { describe, expect, it, vi } from 'vitest'

import { officialAlerts } from './alerts-route'

function atomXml(): string {
  const sent = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const onset = new Date(Date.now()).toISOString()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
  <entry>
    <cap:geocode><valueName>EMMA_ID</valueName><value>ES247</value></cap:geocode>
    <cap:areaDesc>Litoral norte de Valencia</cap:areaDesc>
    <cap:event>Extreme high-temperature warning</cap:event>
    <cap:sent>${sent}</cap:sent>
    <cap:expires>${expires}</cap:expires>
    <cap:onset>${onset}</cap:onset>
    <cap:certainty>Likely</cap:certainty>
    <cap:severity>Extreme</cap:severity>
    <cap:urgency>Future</cap:urgency>
    <cap:identifier>2.49.0.0.724.0.ES.260714093009.774602ATTA151921409</cap:identifier>
    <title>Red High-temperature Warning issued for Spain - Litoral norte de Valencia</title>
  </entry>
</feed>`
}

function makeCache(hit: string | null = null) {
  return {
    get: vi.fn(async () => hit),
    put: vi.fn(async () => undefined),
  }
}

describe('officialAlerts', () => {
  it('returns only active AEMET CAP alerts whose polygon contains the requested point', async () => {
    const cache = makeCache()
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(atomXml(), { status: 200 }))

    const response = await officialAlerts(new URL('https://api.realtemp.test/api/alerts?latitude=39.47&longitude=-0.376'), cache, fetchMock)
    const body = (await response.json()) as { alerts: { headline: string; level: string; geocode: string }[] }

    expect(response.status).toBe(200)
    expect(body.alerts).toEqual([
      {
        headline: 'Red High-temperature Warning issued for Spain - Litoral norte de Valencia',
        level: 'red',
        geocode: 'ES247',
      },
    ])
    expect(fetchMock).toHaveBeenCalledWith('https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain')
    expect(cache.put).toHaveBeenCalledWith(expect.stringContaining('official-alerts:v2:39.47,-0.38'), expect.any(String), { expirationTtl: 600 })
  })

  it('rejects missing coordinates', async () => {
    const response = await officialAlerts(new URL('https://api.realtemp.test/api/alerts'), makeCache(), fetch)

    expect(response.status).toBe(400)
  })
})
