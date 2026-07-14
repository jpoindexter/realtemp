#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'

function parseVars(path) {
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

const localVars = parseVars('.dev.vars')
const key = process.env.ANTHROPIC_API_KEY || localVars.ANTHROPIC_API_KEY

if (!key) {
  console.error('L5b not ready: ANTHROPIC_API_KEY is not set in the environment or worker/.dev.vars.')
  console.error('For production, run: npx wrangler secret put ANTHROPIC_API_KEY')
  process.exit(1)
}

if (!key.startsWith('sk-ant-') || key.length < 24) {
  console.error('L5b not ready: ANTHROPIC_API_KEY does not look like an Anthropic API key.')
  process.exit(1)
}

console.log('L5b local check ready: ANTHROPIC_API_KEY is configured.')
console.log('For production, confirm the same secret was added with wrangler, then run npm run deploy.')
