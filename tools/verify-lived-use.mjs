#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_PATH = 'realtemp-lived-use.json'
const path = process.env.REALTEMP_LIVED_USE_LOG || DEFAULT_PATH
const requiredFields = [
  'date',
  'location',
  'trueFeelC',
  'airTempC',
  'dewPointC',
  'windSpeedMs',
  'uvIndex',
  'exposure',
  'environment',
  'activity',
  'feltDeltaC',
  'confidence',
]

function fail(message) {
  console.error(`N2 not ready: ${message}`)
  process.exit(1)
}

function isIsoDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseLog() {
  if (!existsSync(path)) {
    fail(`lived-use log missing at ${path}. Copy the template from docs/lived-use-tuning.md and keep the real file local-only.`)
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(parsed)) fail(`${path} must be a JSON array of observations.`)
    return parsed
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`)
  }
}

const observations = parseLog()
const errors = []

observations.forEach((entry, index) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`entry ${index + 1}: expected an object`)
    return
  }
  for (const field of requiredFields) {
    if (!(field in entry)) errors.push(`entry ${index + 1}: missing ${field}`)
  }
  if (!isIsoDay(entry.date)) errors.push(`entry ${index + 1}: date must be YYYY-MM-DD`)
  if (typeof entry.location !== 'string' || entry.location.trim().length < 2) errors.push(`entry ${index + 1}: location must be a short label`)
  for (const field of ['trueFeelC', 'airTempC', 'dewPointC', 'windSpeedMs', 'uvIndex', 'feltDeltaC']) {
    if (!isFiniteNumber(entry[field])) errors.push(`entry ${index + 1}: ${field} must be a finite number`)
  }
  if (!['sun', 'shade', 'overcast'].includes(entry.exposure)) errors.push(`entry ${index + 1}: exposure must be sun, shade, or overcast`)
  if (!['urban', 'open', 'nature'].includes(entry.environment)) errors.push(`entry ${index + 1}: environment must be urban, open, or nature`)
  if (!['stagnant', 'walking', 'active'].includes(entry.activity)) errors.push(`entry ${index + 1}: activity must be stagnant, walking, or active`)
  if (!Number.isInteger(entry.confidence) || entry.confidence < 1 || entry.confidence > 5) errors.push(`entry ${index + 1}: confidence must be an integer from 1 to 5`)
  if (Math.abs(entry.feltDeltaC) > 10) errors.push(`entry ${index + 1}: feltDeltaC should be between -10 and 10`)
})

if (errors.length) {
  console.error(errors.slice(0, 20).join('\n'))
  if (errors.length > 20) console.error(`...and ${errors.length - 20} more`)
  fail(`${path} has invalid observations.`)
}

const distinctDays = new Set(observations.map((entry) => entry.date))
const sortedDays = [...distinctDays].sort()
const first = Date.parse(`${sortedDays[0]}T00:00:00Z`)
const last = Date.parse(`${sortedDays.at(-1)}T00:00:00Z`)
const spanDays = sortedDays.length ? Math.floor((last - first) / 86_400_000) + 1 : 0
const contexts = new Set(observations.map((entry) => `${entry.exposure}/${entry.environment}/${entry.activity}`))
const confident = observations.filter((entry) => entry.confidence >= 3)

if (observations.length < 12) fail(`need at least 12 observations; found ${observations.length}.`)
if (distinctDays.size < 10) fail(`need at least 10 distinct observation days; found ${distinctDays.size}.`)
if (spanDays < 14) fail(`need observations spanning at least 14 calendar days; found ${spanDays}.`)
if (contexts.size < 3) fail(`need at least 3 different exposure/environment/activity contexts; found ${contexts.size}.`)
if (confident.length < 8) fail(`need at least 8 observations with confidence >= 3; found ${confident.length}.`)

const averageDelta = observations.reduce((sum, entry) => sum + entry.feltDeltaC, 0) / observations.length
const weightedDelta =
  observations.reduce((sum, entry) => sum + entry.feltDeltaC * entry.confidence, 0) /
  observations.reduce((sum, entry) => sum + entry.confidence, 0)

console.log(`N2 lived-use evidence ready: ${observations.length} observations across ${distinctDays.size} days (${spanDays}-day span).`)
console.log(`Contexts covered: ${contexts.size}. Average felt delta: ${averageDelta.toFixed(1)}C; confidence-weighted: ${weightedDelta.toFixed(1)}C.`)
console.log('Next: tune src/features/formula/constants.ts from this evidence and log coefficient changes in DECISIONS.md.')
