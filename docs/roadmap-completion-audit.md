# Roadmap completion audit

Updated: 2026-07-15

Goal: complete items on roadmap.

## Summary

The executable app/code roadmap slices are shipped, tested, pushed, and deployed. The roadmap is not fully complete because five active cards still require evidence or decisions that cannot be produced from this repo alone.

Current active roadmap cards:

| Card | Status | Evidence checked | What remains |
| --- | --- | --- | --- |
| P4 — Run on Jason's iPhone + street check | Blocked by missing physical street evidence | `npm run verify:street-check` fails because `realtemp-street-check.json` is absent | Open RealTemp on Jason's iPhone in Valencia, perform the street check, record ignored local evidence, rerun verifier |
| P5 — Harden native iPhone shell | Blocked by missing full Xcode + physical device proof | `npm run verify:ios-prereqs` fails; shell sees Command Line Tools only, no `Xcode.app`, no `xcodebuild`, no `simctl`, no `devicectl` | Install/open full Xcode or point `DEVELOPER_DIR` at it, connect/trust iPhone, build/install on the physical phone |
| N6c — Paste Sentry DSN | Blocked by private credential | `npm run verify:sentry` fails because `VITE_SENTRY_DSN` is absent locally and cannot be verified in Vercel production | Create Sentry project, set DSN locally and in Vercel production, rebuild/deploy |
| N7 — Real name + domain | Partially verified, still human/legal gated | `npm run verify:naming` passes RDAP availability evidence for candidates | Final name decision, domain purchase, and formal trademark clearance |
| L4b — Shade precision: PNOA-LiDAR tiles | Source evidence verified, decision gated | `npm run verify:heatmap-sources` passes official PNOA/CNIG/datos.gob reachability | Jason go/no-go on the PNOA-LiDAR path before pipeline work |

AI/LLM copy is parked in `PARKED.md` per the 2026-07-15 product decision; Anthropic is no longer an active roadmap gate.

## Checks run

- `npm run roadmap` — generated `roadmap.html` from `roadmap.json`
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run test` — 93 tests passed
- `npm run build` — passed
- `npm run verify:roadmap-gates` — failed by design, listing the five active externally gated cards
- `npm run verify:ios-prereqs` — failed on missing full Xcode/device tooling
- `npm run verify:street-check` — failed on missing local street-check evidence
- `npm run verify:sentry` — failed on missing private Sentry DSN
- `npm run verify:naming` — passed RDAP evidence, still requires manual legal/business actions
- `npm run verify:heatmap-sources` — passed source reachability, still requires product decision

## Xcode/device audit

Additional local checks found no usable full Xcode installation:

- `xcode-select -p` points to `/Library/Developer/CommandLineTools`
- `/Applications` and `/System/Volumes/Data/Applications` do not contain `Xcode.app`
- `~/Applications` does not contain `Xcode.app`
- Spotlight query for `com.apple.dt.Xcode` returned no app path
- Foreground app/process listing did not show Xcode running

## Completion rule

Do not mark the roadmap goal complete until every active card above has direct evidence, or until the roadmap is explicitly changed to park/remove that card.
