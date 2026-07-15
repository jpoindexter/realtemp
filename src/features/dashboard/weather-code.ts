export function weatherCodeLabel(code: number | null): string {
  if (code === null) return 'unknown'
  if (code === 0) return 'clear'
  if (code === 1) return 'mainly clear'
  if (code === 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if ([51, 53, 55].includes(code)) return 'drizzle'
  if ([56, 57].includes(code)) return 'freezing drizzle'
  if ([61, 63, 65].includes(code)) return 'rain'
  if ([66, 67].includes(code)) return 'freezing rain'
  if ([71, 73, 75, 77].includes(code)) return 'snow'
  if ([80, 81, 82].includes(code)) return 'showers'
  if ([85, 86].includes(code)) return 'snow showers'
  if ([95, 96, 99].includes(code)) return 'thunderstorm'
  return `code ${code}`
}
