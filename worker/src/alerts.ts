export type AlertLevel = 'yellow' | 'orange' | 'red' | 'unknown'

export interface OfficialAlert {
  id: string
  source: 'AEMET'
  event: string
  severity: string
  certainty: string
  urgency: string
  level: AlertLevel
  sent: string
  onset: string
  expires: string
  headline: string
  description: string
  instruction: string | null
  web: string | null
  areaDesc: string
  geocode: string | null
  polygon: [number, number][]
}

const EMMA_REGION_POLYGONS: Record<string, [number, number][]> = {
  // Litoral norte de Valencia. Source: AEMET CAP area polygon for zone 774602,
  // redistributed by MeteoAlarm as EMMA_ID ES247.
  ES247: parsePolygon(
    '39.34,-0.98 39.43,-0.98 39.42,-0.93 39.44,-0.88 39.49,-0.85 39.51,-0.87 39.54,-0.92 39.55,-0.89 39.54,-0.83 39.55,-0.77 39.66,-0.73 39.69,-0.7 39.73,-0.71 39.74,-0.79 39.78,-0.74 39.79,-0.71 39.82,-0.71 39.85,-0.69 39.84,-0.65 39.79,-0.64 39.75,-0.65 39.74,-0.59 39.77,-0.58 39.8,-0.55 39.78,-0.51 39.75,-0.5 39.72,-0.46 39.75,-0.41 39.8,-0.38 39.8,-0.31 39.77,-0.28 39.75,-0.27 39.72,-0.19 39.65,-0.22 39.62,-0.26 39.58,-0.27 39.53,-0.31 39.42,-0.33 39.36,-0.31 39.28,-0.27 39.28,-0.29 39.31,-0.32 39.31,-0.38 39.33,-0.42 39.3,-0.43 39.3,-0.49 39.34,-0.55 39.32,-0.58 39.37,-0.64 39.32,-0.69 39.32,-0.76 39.38,-0.76 39.37,-0.8 39.32,-0.85 39.31,-0.9 39.34,-0.98',
  ),
}

interface InfoBlock {
  language: string
  block: string
}

const text = (xml: string, tag: string): string | null => {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`))
  return match?.[1] ? decodeXml(match[1].trim()) : null
}

const blocks = (xml: string, tag: string): string[] => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'g'))].map((m) => m[0])

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parsePolygon(value: string | null): [number, number][] {
  if (!value) return []
  return value
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((pair): pair is [number, number] => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
}

function meteoalertaLevel(info: string): AlertLevel {
  const parameter = blocks(info, 'parameter').find((block) => text(block, 'valueName') === 'AEMET-Meteoalerta nivel')
  const raw = parameter ? text(parameter, 'value')?.toLowerCase() : null
  if (raw === 'amarillo') return 'yellow'
  if (raw === 'naranja') return 'orange'
  if (raw === 'rojo') return 'red'
  return 'unknown'
}

function meteoalertaZone(area: string): string | null {
  const geocode = blocks(area, 'geocode').find((block) => text(block, 'valueName') === 'AEMET-Meteoalerta zona')
  return geocode ? text(geocode, 'value') : null
}

function preferredInfo(xml: string): InfoBlock | null {
  const parsed = blocks(xml, 'info').map((block) => ({ block, language: text(block, 'language') ?? '' }))
  return parsed.find((info) => info.language === 'en-GB') ?? parsed[0] ?? null
}

/**
 * AEMET is Spain's WMO-registered meteorological alerting authority and
 * publishes CAP links from its RSS feed:
 * https://alertingauthority.wmo.int/authorities.php?recId=153
 * https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAE_wah_RSS.xml
 */
export function parseAemetCapAlert(xml: string): OfficialAlert {
  const info = preferredInfo(xml)
  if (!info) throw new Error('CAP alert has no info block')
  const area = blocks(info.block, 'area')[0]
  if (!area) throw new Error('CAP alert has no area block')

  return {
    id: text(xml, 'identifier') ?? '',
    source: 'AEMET',
    event: text(info.block, 'event') ?? '',
    severity: text(info.block, 'severity') ?? '',
    certainty: text(info.block, 'certainty') ?? '',
    urgency: text(info.block, 'urgency') ?? '',
    level: meteoalertaLevel(info.block),
    sent: text(xml, 'sent') ?? '',
    onset: text(info.block, 'onset') ?? '',
    expires: text(info.block, 'expires') ?? '',
    headline: text(info.block, 'headline') ?? '',
    description: text(info.block, 'description') ?? '',
    instruction: text(info.block, 'instruction'),
    web: text(info.block, 'web'),
    areaDesc: text(area, 'areaDesc') ?? '',
    geocode: meteoalertaZone(area),
    polygon: parsePolygon(text(area, 'polygon')),
  }
}

export function alertMatchesLocation(alert: OfficialAlert, latitude: number, longitude: number): boolean {
  return pointInPolygon(latitude, longitude, alert.polygon)
}

function pointInPolygon(latitude: number, longitude: number, polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  const x = longitude
  const y = latitude

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i]![0]
    const xi = polygon[i]![1]
    const yj = polygon[j]![0]
    const xj = polygon[j]![1]
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

export function extractAemetRssLinks(xml: string): string[] {
  const links = blocks(xml, 'item')
    .map((item) => text(item, 'link'))
    .filter((link): link is string => link !== null && /^https:\/\/www\.aemet\.es\/.+\.xml$/.test(link))
  return [...new Set(links)]
}

/**
 * MeteoAlarm's maintained Spain Atom feed is Worker-friendly and carries
 * CAP summary fields plus EMMA_ID geocodes:
 * https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain
 */
export function parseMeteoAlarmAtomAlerts(xml: string): OfficialAlert[] {
  return blocks(xml, 'entry').flatMap((entry) => {
    const geocode = meteoAlarmEmmaId(entry)
    if (!geocode) return []
    const severity = text(entry, 'cap:severity') ?? ''
    const headline = text(entry, 'title') ?? text(entry, 'cap:event') ?? ''
    return [
      {
        id: text(entry, 'cap:identifier') ?? headline,
        source: 'AEMET',
        event: text(entry, 'cap:event') ?? '',
        severity,
        certainty: text(entry, 'cap:certainty') ?? '',
        urgency: text(entry, 'cap:urgency') ?? '',
        level: levelFromMeteoAlarm(severity, headline),
        sent: text(entry, 'cap:sent') ?? '',
        onset: text(entry, 'cap:onset') ?? '',
        expires: text(entry, 'cap:expires') ?? '',
        headline,
        description: text(entry, 'cap:event') ?? '',
        instruction: null,
        web: null,
        areaDesc: text(entry, 'cap:areaDesc') ?? '',
        geocode,
        polygon: EMMA_REGION_POLYGONS[geocode] ?? [],
      },
    ]
  })
}

function meteoAlarmEmmaId(entry: string): string | null {
  const geocode = blocks(entry, 'cap:geocode').find((block) => text(block, 'valueName') === 'EMMA_ID')
  return geocode ? text(geocode, 'value') : null
}

function levelFromMeteoAlarm(severity: string, headline: string): AlertLevel {
  if (/red/i.test(headline) || severity === 'Extreme') return 'red'
  if (/orange/i.test(headline) || severity === 'Severe') return 'orange'
  if (/yellow/i.test(headline) || severity === 'Moderate') return 'yellow'
  return 'unknown'
}
