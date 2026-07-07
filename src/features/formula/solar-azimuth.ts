/**
 * Solar azimuth (degrees clockwise from north) — same NOAA approximation family
 * as solar-zenith.ts. Needed to know which way shadows fall.
 */

const DEG = Math.PI / 180

function fractionalYearRad(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000)
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60
  return ((2 * Math.PI) / 365) * (dayOfYear + (hour - 12) / 24)
}

function declinationRad(g: number): number {
  return (
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)
  )
}

function equationOfTimeMin(g: number): number {
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g))
  )
}

export function solarAzimuthDeg(date: Date, latitudeDeg: number, longitudeDeg: number): number {
  const g = fractionalYearRad(date)
  const decl = declinationRad(g)
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  const trueSolarMin = (utcMinutes + equationOfTimeMin(g) + 4 * longitudeDeg + 1440) % 1440
  const hourAngleRad = (trueSolarMin / 4 - 180) * DEG
  const lat = latitudeDeg * DEG

  const cosZen = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngleRad)
  const zen = Math.acos(Math.min(1, Math.max(-1, cosZen)))
  const sinZen = Math.sin(zen)
  if (sinZen < 1e-6) return 180 // sun at zenith — azimuth undefined, shadows ~none

  const cosAz = (Math.sin(decl) - Math.sin(lat) * cosZen) / (Math.cos(lat) * sinZen)
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz))) / DEG
  if (hourAngleRad > 0) az = 360 - az // afternoon: sun west of south
  return az
}
