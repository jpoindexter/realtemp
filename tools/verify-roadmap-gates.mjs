#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const roadmap = JSON.parse(readFileSync('roadmap.json', 'utf8'))

const proofById = {
  P4: 'Physical street check on Jason phone: open deployed/native app in Valencia, use/search location, walk outside, and confirm PRD v0 phone-browser box.',
  P5: 'Run npm run verify:ios-prereqs, then npm run build && npx cap sync ios, then install on Jason physical iPhone.',
  N2: 'Collect about two weeks of lived street-use observations, tune src/features/formula/constants.ts, and log coefficient changes in DECISIONS.md.',
  N6c: 'Set VITE_SENTRY_DSN, run npm run verify:sentry, rebuild, and deploy.',
  N7: 'Run npm run verify:naming for current RDAP evidence, then pick the name/domain, purchase it, and complete formal EUIPO/TMview/USPTO/WIPO checks before public launch.',
  L4b: 'Run npm run verify:heatmap-sources, then Jason go/no-go on docs/heatmap-prd.md option 1 before any PNOA-LiDAR pipeline work.',
  L5b: 'Set ANTHROPIC_API_KEY locally, run cd worker && npm run verify:anthropic, then add the Wrangler secret and deploy.',
}

const activeCards = roadmap.cards.filter((card) => card.column !== 'shipped')
const gatedCards = activeCards.filter((card) => card.gated)
const openCards = activeCards.filter((card) => !card.gated)
const unknownProof = gatedCards.filter((card) => !proofById[card.id])

console.log(`Roadmap active cards: ${activeCards.length}`)
console.log(`Externally gated cards: ${gatedCards.length}`)

if (openCards.length) {
  console.error('Roadmap has active, ungated cards that should be executable next:')
  for (const card of openCards) console.error(`- ${card.id}: ${card.title}`)
  process.exit(1)
}

if (unknownProof.length) {
  console.error('Roadmap has gated cards without a proof/unblock recipe:')
  for (const card of unknownProof) console.error(`- ${card.id}: ${card.title}`)
  process.exit(1)
}

if (!gatedCards.length) {
  console.log('Roadmap gate audit passed: no active gated cards remain.')
  process.exit(0)
}

console.error('Roadmap not complete: active cards are still externally gated.')
for (const card of gatedCards) {
  console.error(`- ${card.id}: ${card.title}`)
  console.error(`  proof: ${proofById[card.id]}`)
}
process.exit(1)
