/**
 * NOAA low-accuracy solar position approximation — good to well under 1°,
 * which is far tighter than the formula's cos-weighting needs.
 * Longitude is degrees east (Valencia ≈ −0.376).
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

export function solarZenithDeg(date: Date, latitudeDeg: number, longitudeDeg: number): number {
  const g = fractionalYearRad(date)
  const decl = declinationRad(g)
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  const trueSolarMin = (utcMinutes + equationOfTimeMin(g) + 4 * longitudeDeg + 1440) % 1440
  const hourAngleRad = (trueSolarMin / 4 - 180) * DEG
  const lat = latitudeDeg * DEG
  const cosZenith =
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngleRad)
  return Math.acos(Math.min(1, Math.max(-1, cosZenith))) / DEG
}
