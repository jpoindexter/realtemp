#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_PATH = 'realtemp-street-check.json'
const path = process.env.REALTEMP_STREET_CHECK || DEFAULT_PATH
const requiredBooleans = [
  'appLoaded',
  'locationResolved',
  'trueFeelVisible',
  'ledgerVisible',
  'togglesRecalculate',
  'sweatVisible',
  'degradedStateAbsent',
  'streetContext',
]

function fail(message) {
  console.error(`P4 not ready: ${message}`)
  process.exit(1)
}

function isIsoDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function readEvidence() {
  if (!existsSync(path)) {
    fail(`street-check evidence missing at ${path}. Copy the template from docs/street-check.md and keep the real file local-only.`)
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(`${path} must be a JSON object.`)
    return parsed
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`)
  }
}

const evidence = readEvidence()
const errors = []

if (!isIsoDay(evidence.date)) errors.push('date must be YYYY-MM-DD')
if (!/iphone/i.test(String(evidence.device ?? ''))) errors.push('device must identify an iPhone')
if (!['browser', 'native'].includes(evidence.surface)) errors.push('surface must be browser or native')
if (evidence.surface === 'browser') {
  try {
    const url = new URL(evidence.url)
    if (url.protocol !== 'https:') errors.push('browser url must be https')
  } catch {
    errors.push('browser url must be a valid URL')
  }
}
if (!['geolocation', 'manual-search'].includes(evidence.locationMethod)) errors.push('locationMethod must be geolocation or manual-search')
if (typeof evidence.locationLabel !== 'string' || evidence.locationLabel.trim().length < 2) errors.push('locationLabel must be present')

for (const field of requiredBooleans) {
  if (evidence[field] !== true) errors.push(`${field} must be true`)
}

if (!evidence.toggleBefore || !evidence.toggleAfter || typeof evidence.toggleBefore !== 'object' || typeof evidence.toggleAfter !== 'object') {
  errors.push('toggleBefore and toggleAfter must be objects')
} else if (JSON.stringify(evidence.toggleBefore) === JSON.stringify(evidence.toggleAfter)) {
  errors.push('toggleBefore and toggleAfter must show a real toggle change')
}

if (typeof evidence.notes !== 'string' || evidence.notes.trim().length < 8) errors.push('notes must summarize the street check')

if (errors.length) fail(errors.join('; '))

console.log(`P4 street check ready: ${evidence.surface} on ${evidence.device}, ${evidence.locationLabel}, ${evidence.date}.`)
console.log('Observed: app load, location, True Feel, ledger, toggles, sweat widget, and street context.')
