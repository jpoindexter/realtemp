import { describe, expect, it } from 'vitest'

import { alertMatchesLocation, extractAemetRssLinks, parseAemetCapAlert, parseMeteoAlarmAtomAlerts } from './alerts'

const CAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>2.49.0.0.724.0.ES.20260714092651.774602ATTA15191784021211</identifier>
  <sent>2026-07-14T09:26:51-00:00</sent>
  <status>Actual</status>
  <msgType>Update</msgType>
  <scope>Public</scope>
  <info>
    <language>es-ES</language>
    <event>Aviso de temperaturas máximas de nivel rojo</event>
    <urgency>Future</urgency>
    <severity>Extreme</severity>
    <certainty>Likely</certainty>
    <onset>2026-07-15T13:00:00+02:00</onset>
    <expires>2026-07-15T20:59:59+02:00</expires>
    <headline>Aviso de temperaturas máximas de nivel rojo. Litoral norte de Valencia</headline>
    <description>Temperatura máxima: 42 ºC.</description>
    <parameter><valueName>AEMET-Meteoalerta nivel</valueName><value>rojo</value></parameter>
    <area>
      <areaDesc>Litoral norte de Valencia</areaDesc>
      <polygon>39.34,-0.98 39.43,-0.98 39.42,-0.93 39.44,-0.88 39.49,-0.85 39.51,-0.87 39.54,-0.92 39.55,-0.89 39.54,-0.83 39.55,-0.77 39.66,-0.73 39.69,-0.7 39.73,-0.71 39.74,-0.79 39.78,-0.74 39.79,-0.71 39.82,-0.71 39.85,-0.69 39.84,-0.65 39.79,-0.64 39.75,-0.65 39.74,-0.59 39.77,-0.58 39.8,-0.55 39.78,-0.51 39.75,-0.5 39.72,-0.46 39.75,-0.41 39.8,-0.38 39.8,-0.31 39.77,-0.28 39.75,-0.27 39.72,-0.19 39.65,-0.22 39.62,-0.26 39.58,-0.27 39.53,-0.31 39.42,-0.33 39.36,-0.31 39.28,-0.27 39.28,-0.29 39.31,-0.32 39.31,-0.38 39.33,-0.42 39.3,-0.43 39.3,-0.49 39.34,-0.55 39.32,-0.58 39.37,-0.64 39.32,-0.69 39.32,-0.76 39.38,-0.76 39.37,-0.8 39.32,-0.85 39.31,-0.9 39.34,-0.98</polygon>
      <geocode><valueName>AEMET-Meteoalerta zona</valueName><value>774602</value></geocode>
    </area>
  </info>
  <info>
    <language>en-GB</language>
    <event>Extreme high-temperature warning</event>
    <urgency>Future</urgency>
    <severity>Extreme</severity>
    <certainty>Likely</certainty>
    <onset>2026-07-15T13:00:00+02:00</onset>
    <expires>2026-07-15T20:59:59+02:00</expires>
    <headline>Extreme high-temperature warning. Litoral norte de Valencia</headline>
    <description>Maximum temperature: 42 ºC.</description>
    <instruction>Only travel if your journey is essential.</instruction>
    <web>https://www.aemet.es/en/eltiempo/prediccion/avisos</web>
    <parameter><valueName>AEMET-Meteoalerta nivel</valueName><value>rojo</value></parameter>
    <area>
      <areaDesc>Litoral norte de Valencia</areaDesc>
      <polygon>39.34,-0.98 39.43,-0.98 39.42,-0.93 39.44,-0.88 39.49,-0.85 39.51,-0.87 39.54,-0.92 39.55,-0.89 39.54,-0.83 39.55,-0.77 39.66,-0.73 39.69,-0.7 39.73,-0.71 39.74,-0.79 39.78,-0.74 39.79,-0.71 39.82,-0.71 39.85,-0.69 39.84,-0.65 39.79,-0.64 39.75,-0.65 39.74,-0.59 39.77,-0.58 39.8,-0.55 39.78,-0.51 39.75,-0.5 39.72,-0.46 39.75,-0.41 39.8,-0.38 39.8,-0.31 39.77,-0.28 39.75,-0.27 39.72,-0.19 39.65,-0.22 39.62,-0.26 39.58,-0.27 39.53,-0.31 39.42,-0.33 39.36,-0.31 39.28,-0.27 39.28,-0.29 39.31,-0.32 39.31,-0.38 39.33,-0.42 39.3,-0.43 39.3,-0.49 39.34,-0.55 39.32,-0.58 39.37,-0.64 39.32,-0.69 39.32,-0.76 39.38,-0.76 39.37,-0.8 39.32,-0.85 39.31,-0.9 39.34,-0.98</polygon>
      <geocode><valueName>AEMET-Meteoalerta zona</valueName><value>774602</value></geocode>
    </area>
  </info>
</alert>`

describe('parseAemetCapAlert', () => {
  it('normalizes an AEMET CAP alert and prefers the English info block', () => {
    const alert = parseAemetCapAlert(CAP_XML)

    expect(alert).toMatchObject({
      id: '2.49.0.0.724.0.ES.20260714092651.774602ATTA15191784021211',
      source: 'AEMET',
      event: 'Extreme high-temperature warning',
      severity: 'Extreme',
      level: 'red',
      headline: 'Extreme high-temperature warning. Litoral norte de Valencia',
      areaDesc: 'Litoral norte de Valencia',
      geocode: '774602',
      web: 'https://www.aemet.es/en/eltiempo/prediccion/avisos',
    })
  })

  it('matches the CAP area polygon against the requested coordinates', () => {
    const alert = parseAemetCapAlert(CAP_XML)

    expect(alertMatchesLocation(alert, 39.47, -0.376)).toBe(true)
    expect(alertMatchesLocation(alert, 40.4168, -3.7038)).toBe(false)
  })
})

describe('extractAemetRssLinks', () => {
  it('pulls unique CAP XML links from AEMET RSS', () => {
    const links = extractAemetRssLinks(`
      <rss><channel>
        <item><link>https://www.aemet.es/a.xml</link></item>
        <item><link>https://www.aemet.es/b.xml</link></item>
        <item><link>https://www.aemet.es/a.xml</link></item>
      </channel></rss>
    `)

    expect(links).toEqual(['https://www.aemet.es/a.xml', 'https://www.aemet.es/b.xml'])
  })
})

describe('parseMeteoAlarmAtomAlerts', () => {
  it('normalizes MeteoAlarm Atom entries and maps EMMA_ID warning zones to Valencia coordinates', () => {
    const alerts = parseMeteoAlarmAtomAlerts(`<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
        <entry>
          <cap:geocode><valueName>EMMA_ID</valueName><value>ES247</value></cap:geocode>
          <cap:areaDesc>Litoral norte de Valencia</cap:areaDesc>
          <cap:event>Extreme high-temperature warning</cap:event>
          <cap:sent>2026-07-14T09:30:09+00:00</cap:sent>
          <cap:expires>2026-07-15T18:59:59+00:00</cap:expires>
          <cap:onset>2026-07-15T11:00:00+00:00</cap:onset>
          <cap:certainty>Likely</cap:certainty>
          <cap:severity>Extreme</cap:severity>
          <cap:urgency>Future</cap:urgency>
          <cap:identifier>2.49.0.0.724.0.ES.260714093009.774602ATTA151921409</cap:identifier>
          <title>Red High-temperature Warning issued for Spain - Litoral norte de Valencia</title>
        </entry>
      </feed>`)

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      headline: 'Red High-temperature Warning issued for Spain - Litoral norte de Valencia',
      geocode: 'ES247',
      level: 'red',
    })
    expect(alertMatchesLocation(alerts[0]!, 39.47, -0.376)).toBe(true)
    expect(alertMatchesLocation(alerts[0]!, 40.4168, -3.7038)).toBe(false)
  })
})
