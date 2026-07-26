# AGENTS.md

This file provides guidance to Codex when working with code in this repository.
It mirrors CLAUDE.md — keep the two in sync; they describe the same repo.

## Project State

Past v0, mid-v1. Source of truth, read at session start: `PRD.md` (v2.0) + `DECISIONS.md` (append-only) + `ROADMAP.md` + `PARKED.md` + `roadmap.json` (rockmap board) + `docs/setup-remaining.md`. The PRD PDF (v1.0) is superseded background.

Two deployables:

- **Web app** — React 19 + Vite + TS strict + Vitest + Zod, on Vercel (`realtemp-rho.vercel.app`), also wrapped in a Capacitor 8 iOS shell (SPM, no CocoaPods).
- **Worker** — `worker/`, a Cloudflare Worker (`realtemp-api`) with D1 + KV + a daily cron.

`DECISIONS.md`'s 2026-07-06 "client-only web app, no backend" entry is superseded by the Worker but stays in the file — the log is append-only, not rewritten. Likewise `PARKED.md` lists the timeline, heatmap, notifications, and LLM copy as parked; they were later promoted and shipped. **Trust the code and `roadmap.json` over the prose in PRD/PARKED for what exists.**

`AGENTS.md` is a near-duplicate of this file for Codex. Update both together.

## Commands

Root:

- `npm run dev` / `build` / `preview`
- `npm run test` — Vitest. **Runs `src/` and `worker/src/` together** (root config has no `include` narrowing, so worker tests are picked up under jsdom). Single area: `npx vitest run src/features/formula`
- `npm run typecheck` — `tsc --noEmit`, **`src` + `vite.config.ts` only**. The Worker is a separate project: `cd worker && npm run typecheck`. Root typecheck passing says nothing about the Worker.
- `npm run lint` — ESLint over the repo, ignoring `dist`, `tools`, `docs`, `ios`, and worker build dirs.
- `npm run roadmap` — regenerate `roadmap.html` from `roadmap.json`

Worker (`cd worker`):

- `npm run dev` — `wrangler dev --local --port 8787`
- `npm run deploy` — `wrangler deploy` (production; needs `wrangler login`)
- `npm run typecheck` · `npm run test`

iOS: `npm run build && npx cap sync ios`, then `npx cap open ios` or
`xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS Simulator,id=<UDID>' build CODE_SIGNING_ALLOWED=NO` (name-based destinations flake; get the UDID from `xcrun simctl list devices available`).

Before claiming done: root `test` + `typecheck` + `lint`, **and** `worker typecheck` when Worker code changed.

## The Gate System

`roadmap.json` cards carry a `gated: true` flag for work that needs a physical device, a purchase, a credential, or a Jason decision. `npm run verify:roadmap-gates` **passes only when zero gated cards remain active**, and fails loudly in three cases: an active card that is *not* gated (executable work sitting undone), a gated card missing its proof/first-action recipe, or — the normal case today — gated cards still open. It prints the proof and first action for each.

All 5 currently active cards are gated. Each has its own evidence-checking verifier, all failing-until-real (none stub a pass):

| Script | Gate |
|---|---|
| `verify:street-check` | P4 — physical Valencia street check; evidence in gitignored `realtemp-street-check.json` (template `docs/street-check.md`) |
| `verify:ios-prereqs` | P5 — full Xcode + physical iPhone |
| `verify:sentry` | N6c — real `VITE_SENTRY_DSN` locally and in Vercel prod |
| `verify:naming` | N7 — RDAP domain evidence (`docs/naming.md`) |
| `verify:heatmap-sources` | L4b — PNOA/CNIG/datos.gob reachability (`docs/heatmap-prd.md`) |

`worker verify:anthropic` also exists but is **not** an active gate — the LLM copy line is parked, so no Anthropic key is required.

Don't "fix" a failing verifier by loosening it. The failure is the accurate report of an unmet external gate. Adding a new active card means adding it gated with a recipe, or building it.

## Architecture

### Web

- `src/features/formula/` — pure True Feel math. Every coefficient in `constants.ts`; UI never computes. `solar-zenith.ts` / `solar-azimuth.ts` derive sun position client-side from lat/lon/time.
- `src/features/weather/`, `location/`, `heatmap/overpass.ts` — Zod-fenced adapters returning `Result<T, E>` (`src/lib/result.ts`). Errors are values; nothing throws across a boundary.
- `src/features/dashboard/` — the screen, split Now / Forecast / Tune. `use-weather` derives loading from a fetch key (react-hooks v7 forbids sync setState-in-effect). `use-toggles` / `use-bio` / `use-unit` persist to localStorage.
- Feature panels: `timeline/` (hourly safe windows), `heatmap/` (OSM footprint shadow casting), `radar/`, `official-alerts/`, `warnings/`, `push/`, `settings/`, `copy/` (LLM line).
- `src/lib/config.ts` — Zod-validated optional integrations. **Absent or invalid env → `null` → the dependent feature does not render.** No stubs, no dead buttons. `VITE_API_BASE` gates every Worker-backed panel; `VITE_SENTRY_DSN` gates crash reporting.

### Worker (`worker/src/`)

`index.ts` routes, all CORS-open, all JSON:

- `POST /api/copy` — Anthropic call for the dashboard copy line; KV-cached per ~1km cell per hour. Returns `503 { available: false }` when `ANTHROPIC_API_KEY` is unset, so the client panel simply hides.
- `POST|DELETE /api/push/subscribe` — Web Push subscriptions in D1 (`push_subscriptions`, see `schema.sql`).
- `GET /api/buildings` — server-side Overpass proxy. Browser `fetch` **can never set `User-Agent`**, which Overpass requires; the client goes worker-first and only falls back to direct mirrors. A test pins this.
- `GET /api/alerts` — MeteoAlarm Spain Atom feed, matched to EMMA_ID warning regions.
- `scheduled` (cron `0 4 * * *`) — `runHeatCheck` pushes when tomorrow's max crosses a subscriber's threshold.

Push is **payload-free** by design: the push wakes the service worker, and `public/sw.js` supplies the notification text locally. No user data transits the push service. The VAPID public key is duplicated in `wrangler.jsonc` vars and `src/lib/config.ts`; the private half is a Worker secret set via `wrangler secret put`, never through a tool call.

### Domain traps

- Wind must be requested in m/s (`wind_speed_unit=ms`) — Open-Meteo's km/h default silently corrupts the formula. A test pins this.
- Temperature deltas convert to °F by scale only (×9/5), no 32° offset. `format-temp.ts` separates absolute from delta conversion; a test pins this.

## Deploy

**Ordering: Worker first, then web.** A web redeploy that ships a new client against an old Worker leaves the push/alerts panels 404-ing. `docs/setup-remaining.md` §2 sequences it.

Secrets go through Jason's own CLI (`wrangler secret put`, Vercel dashboard) — never piped through a tool call. Get a named, specific authorization before any production action; broad mandates like "do everything you can" do not cover deploys.

## What This Product Is

**RealTemp** (working codename; "RealFeel" is an AccuWeather trademark) — a context-aware weather app replacing the standard "Feels Like" metric with a personalized, street-level perceived temperature. Commercial apps report shaded Stevenson-screen conditions; this models what a body on a sunlit plaza actually experiences.

### The Foundational Formula (domain core)

```
TrueFeel = AT_base + SolarPremium + EnvDelta + ActivityDelta

AT_base       = Ta + 0.33·e − 4.00 − 0.70·ws       (Steadman AT; the vapour term
                and the −4.00 calibration constant are SEPARATE ledger rows)
e (hPa)       = 6.105 · exp(17.27·Td / (237.7+Td))  (vapor pressure from DEW POINT)
SolarPremium  = Sun: clamp(UVI × 0.8, 0, 8). NOT zenith-weighted — the UV index
                already encodes solar elevation. Zenith only gates night (>90° → 0).
                Overcast: 25% of Sun · Shade: 0 · Night: 0
EnvDelta      = Urban +2 (12:00–22:00 local, else +1) · Open 0 · Nature −1
ActivityDelta = Stagnant 0 · Walking +1 · Active +3, each halved when ws > 5 m/s
SweatEff      = 100% at Td ≤ 10°C → linear → 0% at Td ≥ 26°C
```

Wind from Open-Meteo's `wind_speed_10m` is scaled ×0.6 to street level. Bio and acclimatization deltas layer on top (see the 2026-07-07 `DECISIONS.md` entries); both default to zero-effect and their ledger rows only render when non-zero.

Every feature exists to feed, display, or validate this calculation.

## Constraints

- The formula is **deterministic, transparent, and separable** — each premium computed and displayed independently, never folded into one opaque number. **No AI in the calculation path** (`/api/copy` writes prose about the result; it never touches the numbers). All coefficients in `constants.ts` — tuning knobs, not physics claims.
- **Dew point, never relative humidity**, as the moisture input.
- No accounts. The only server-side personal data is a push subscription row (endpoint + coords + threshold).
- `DECISIONS.md` is append-only; don't re-litigate stack, provider, or scope without new information. `PARKED.md` items are promoted via a PRD change, never built ad hoc.
