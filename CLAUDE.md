# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project State

v0 built. Source of truth: `PRD.md` (v2.0) + `DECISIONS.md` + `ROADMAP.md` + `PARKED.md` + `roadmap.json` (rockmap board) — read at session start. The PRD PDF (v1.0) is superseded background.

Stack: React 19 + Vite + TS strict + Vitest + Zod, client-only (no backend), Open-Meteo, wrapped in a Capacitor 8 iOS shell (SPM, no CocoaPods).

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run test` — Vitest (single file: `npx vitest run src/features/formula`)
- `npm run typecheck` · `npm run lint` — all four must be green before "done"
- `npm run roadmap` — regenerate `roadmap.html` from `roadmap.json` (rockmap)
- iOS: `npm run build && npx cap sync ios`, then `npx cap open ios` or
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS Simulator,id=<UDID>' build CODE_SIGNING_ALLOWED=NO` (name-based destinations flake; use UDID from `xcrun simctl list devices available`)

## Architecture

- `src/features/formula/` — pure True Feel math; every coefficient in `constants.ts`; UI never computes.
- `src/features/weather/` + `src/features/location/` — Zod-fenced adapters returning `Result<T,E>` (`src/lib/result.ts`); errors are values, nothing throws across a boundary.
- `src/features/dashboard/` — one-screen UI; `use-weather` derives loading from a fetch key (react-hooks v7 forbids sync setState-in-effect).
- Wind must be requested in m/s (`wind_speed_unit=ms`) — Open-Meteo's km/h default silently corrupts the formula; a test pins this.

## What This Product Is

**RealFeel UI** — a context-aware weather app that replaces the standard "Feels Like" metric with a personalized, street-level perceived temperature. Core premise: commercial apps report shaded/Stevenson-screen conditions; this app models what a human body actually experiences.

### The Foundational Formula (domain core)

```
True Perceived Temp = Base Air Temp
                    + Solar Radiation Premium
                    + Humidity Friction
                    ± Convective Wind Factor
                    - Microclimate Adjustments
```

Every feature exists to feed, display, or validate this calculation. Example from the PRD: 30°C base + 6°C sun premium + 2°C dew point friction = 38°C True Feel.

## v0 Scope (see PRD.md for the formula and done criteria)

Hero dashboard (True Feel + per-premium math breakdown + Sweat Efficiency) and three microclimate toggles (Exposure / Environment / Activity) with instant recalculation. Everything else — bio-calibration, timeline, heatmap, crowdsourcing, LLM copy — lives in `PARKED.md`. Do not build parked items; promote them via PRD change first.

## Constraints

- The formula is **deterministic, transparent, and separable** — each premium computed and displayed independently, never folded into one opaque number. No AI in the calculation path. All coefficients in `constants.ts`.
- **Dew point, never relative humidity**, as the moisture input.
- No personal data in v0 → no backend, no accounts. Toggles persist to localStorage only.
- `DECISIONS.md` is append-only; don't re-litigate stack/provider/scope without new information.
