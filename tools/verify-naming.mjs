#!/usr/bin/env node

const candidates = [
  { name: 'StreetFeel', domain: 'streetfeel.app', recommended: true },
  { name: 'StreetTemp', domain: 'streettemp.app' },
  { name: 'TrueFeel', domain: 'truefeel.app' },
  { name: 'RealTemp', domain: 'realtemp.app' },
  { name: 'SunFeel', domain: 'sunfeel.app' },
  { name: 'FeltDegrees', domain: 'feltdegrees.com' },
]

const officialClearanceSources = [
  ['EUIPO availability guidance', 'https://www.euipo.europa.eu/en/trade-marks/before-applying/availability'],
  ['TMview EUIPN search', 'https://www.euipn.org/bg/tools/TMview'],
  ['USPTO trademark search', 'https://www.uspto.gov/trademarks/search'],
  ['WIPO Global Brand Database', 'https://www.wipo.int/en/web/global-brand-database'],
]

function formatStatus(result) {
  if (result.status === 404) return 'unregistered by RDAP'
  if (result.status === 200) return 'registered in RDAP'
  return `unexpected RDAP status ${result.status}`
}

async function checkDomain(domain) {
  const response = await fetch(`https://rdap.org/domain/${domain}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  })
  const text = await response.text()
  return {
    domain,
    status: response.status,
    url: response.url,
    description: text.match(/"description"\s*:\s*\[(.*?)\]/s)?.[1]?.replaceAll('"', '').trim() ?? '',
  }
}

let failures = 0

console.log('N7 naming/domain check')
console.log('Domain evidence uses RDAP. 404 means no registry record was found; it is not a purchase or legal clearance.')

for (const candidate of candidates) {
  try {
    const result = await checkDomain(candidate.domain)
    const status = formatStatus(result)
    const marker = candidate.recommended ? 'recommended' : 'candidate'
    console.log(`ok: ${candidate.name} (${marker}) - ${candidate.domain}: ${status} via ${result.url}`)
    if (candidate.recommended && result.status !== 404) failures += 1
  } catch (error) {
    failures += candidate.recommended ? 1 : 0
    console.error(`not ready: ${candidate.name} - could not query ${candidate.domain}: ${error.message}`)
  }
}

console.log('Formal trademark clearance remains manual. Use these official sources:')
for (const [label, url] of officialClearanceSources) console.log(`- ${label}: ${url}`)
console.log('Search exact and similar marks: StreetFeel, Street Feel, StreetTemp, TrueFeel, RealTemp, SunFeel, FeltDegrees.')
console.log('Relevant Nice classes for a weather/mobile software launch: 9 and 42.')

if (failures) {
  console.error(`N7 not ready: ${failures} recommended-domain check${failures === 1 ? '' : 's'} failed.`)
  process.exit(1)
}

console.log('N7 domain evidence ready: recommended domain has no RDAP registration record. Purchase + formal clearance + final taste call are still required.')
