# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project State

**Pre-code, spec resolved.** Source of truth is `PRD.md` (v2.0) + `DECISIONS.md` + `ROADMAP.md` + `PARKED.md` — read those at session start. The original `PRD - RealFeel UI Context Aware Weather App.pdf` (v1.0) is superseded; treat it as background only. Stack decided but not scaffolded: client-only web app, React + Vite + TS strict + Vitest, Open-Meteo, no backend. No git repo yet. When scaffolding starts, `git init` and replace this section with real commands.

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
