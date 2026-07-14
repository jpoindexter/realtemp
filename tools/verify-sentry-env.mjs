#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function parseDotEnv(path) {
  if (!existsSync(path)) return {}
  const values = {}
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

const envFile = parseDotEnv('.env')
const dsn = process.env.VITE_SENTRY_DSN || envFile.VITE_SENTRY_DSN

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' })
  return {
    ok: result.status === 0,
    text: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  }
}

if (!dsn) {
  console.error('N6c not ready: VITE_SENTRY_DSN is not set in the environment or .env.')
  console.error('Create a Sentry React project, add VITE_SENTRY_DSN to .env/Vercel, then rebuild.')
  process.exit(1)
}

let parsed
try {
  parsed = new URL(dsn)
} catch {
  console.error('N6c not ready: VITE_SENTRY_DSN is not a valid URL.')
  process.exit(1)
}

if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.username || !parsed.pathname.slice(1)) {
  console.error('N6c not ready: VITE_SENTRY_DSN does not look like a Sentry DSN.')
  process.exit(1)
}

const vercelEnv = run('vercel', ['env', 'list', 'production', '--format', 'json'])
if (!vercelEnv.ok) {
  console.error('N6c not ready: could not list Vercel production env vars.')
  console.error(vercelEnv.text || 'Run `vercel login` and ensure this directory is linked to the realtemp project.')
  process.exit(1)
}

if (!vercelEnv.text.includes('VITE_SENTRY_DSN')) {
  console.error('N6c not ready: VITE_SENTRY_DSN is not configured in Vercel production.')
  console.error('Run: vercel env add VITE_SENTRY_DSN production')
  process.exit(1)
}

console.log(`N6c ready: VITE_SENTRY_DSN is configured for ${parsed.host}${parsed.pathname}.`)
console.log('N6c ready: VITE_SENTRY_DSN is present in Vercel production env.')
console.log('Next: run npm run build and deploy the rebuilt app.')
