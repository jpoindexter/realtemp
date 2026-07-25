#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const roadmap = JSON.parse(readFileSync('roadmap.json', 'utf8'))

const proofById = {
  P4: 'Physical street check on Jason phone: open deployed/native app in Valencia, use/search location, walk outside, record realtemp-street-check.json, and run npm run verify:street-check.',
  P5: 'Run npm run verify:ios-prereqs, then npm run build && npx cap sync ios, then install on Jason physical iPhone.',
  N6c: 'Set VITE_SENTRY_DSN locally and in Vercel production, run npm run verify:sentry, rebuild, and deploy.',
  N7: 'Run npm run verify:naming for current RDAP evidence, then pick the name/domain, purchase it, and complete formal EUIPO/TMview/USPTO/WIPO checks before public launch.',
  L4b: 'Run npm run verify:heatmap-sources, then Jason go/no-go on docs/heatmap-prd.md option 1 before any PNOA-LiDAR pipeline work.',
  C1b: 'Fourteen consecutive days of personal street use with C1a instrumentation live. Stop rule: zero ledger opens across 14 days falsifies the transparency thesis.',
  C2b: 'Jason decides: validate the coefficients against real observation, or reposition the paid claim onto transparency/decision-support. Amend the PRD non-goal and append to DECISIONS.md either way.',
  C3a: 'Jason recruits 5 people in the heat-exposure niche. Continuation rule: fewer than 3 still using at day 14 means reposition or stop.',
  C4b: 'Jason sets tiers, price, and value metric once C2a gives the Open-Meteo cost floor. The ledger stays free.',
  C4c: 'Jason connects Stripe (web) or an App Store subscription (needs an Apple Developer account and the P5 device path).',
  C5: 'Gated on C1b. Do not build a conversational ledger before evidence that the static one is read. Then price a session and decide: costed feature, or permanent non-goal.',
}

const firstActionById = {
  P4: 'Fill realtemp-street-check.json from docs/street-check.md, then run npm run verify:street-check.',
  P5: 'Run npm run verify:ios-prereqs and fix the first reported Xcode/iPhone prerequisite.',
  N6c: 'Create the Sentry DSN, set it locally and in Vercel production, then run npm run verify:sentry.',
  N7: 'Run npm run verify:naming, then complete formal trademark clearance and buy the selected domain.',
  L4b: 'Run npm run verify:heatmap-sources, then make the go/no-go call for docs/heatmap-prd.md option 1.',
  C1b: 'Do the P4 street check, then start day 1 of 14 with the app on your Home Screen.',
  C2b: 'Read the Blocker 1 section of docs/product-review-2026-07-25.md and pick: validate, or reposition.',
  C3a: 'Name the segment in one sentence, then list 5 people who fit it.',
  C4b: 'Wait on C2a, then set the tiers against the Open-Meteo cost floor.',
  C4c: 'Pick the rail: Stripe on web now, or App Store once P5 clears.',
  C5: 'Wait for C1b. If the ledger goes unopened, close this as a non-goal without building anything.',
}

const activeCards = roadmap.cards.filter((card) => card.column !== 'shipped')
const gatedCards = activeCards.filter((card) => card.gated)
const openCards = activeCards.filter((card) => !card.gated)
const unknownProof = gatedCards.filter((card) => !proofById[card.id])
const unknownFirstAction = gatedCards.filter((card) => !firstActionById[card.id])

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

if (unknownFirstAction.length) {
  console.error('Roadmap has gated cards without a first-action command:')
  for (const card of unknownFirstAction) console.error(`- ${card.id}: ${card.title}`)
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
  console.error(`  first action: ${firstActionById[card.id]}`)
}
process.exit(1)
