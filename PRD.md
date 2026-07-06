# PRD — RealTemp (working codename)

**v2.0 · 2026-07-06 · supersedes PRD PDF v1.0.** Original vision preserved; all unimplementable gaps resolved. "RealFeel" dropped (AccuWeather trademark).

## One-liner

A weather app that shows the temperature your body actually experiences on the street — sun, humidity, wind, and surroundings included — with the math visible.

## Problem

Weather apps report shaded-box (Stevenson screen) conditions. "32°C" in Valencia means 40°C on a sunlit concrete plaza. "Feels Like" is opaque, generalized, and ignores whether you're in sun or shade.

## User

One user: Jason, walking around Valencia in summer, deciding when and where to be outside.

## v0 Done Criteria

- [x] App loads, gets location (browser geolocation, manual city search fallback), fetches current conditions from Open-Meteo *(city-search path verified live in browser 2026-07-06; geolocation branch unit-covered, needs a device check)*
- [x] Hero shows **True Feel** temperature, computed by the formula below *(verified live: 33.5° air → 37.9° True Feel)*
- [x] Math breakdown component lists each premium as a separate signed line *(verified live; ledger sums exactly)*
- [x] Three toggles recalculate instantly *(verified live: Shade zeroed sun premium, 37.9° → 36.5°)*
- [x] Sweat Efficiency widget renders 0–100% *(verified live: 69% at dew point 15°)*
- [x] Solar premium is 0 at night; missing API fields degrade gracefully *(unit-tested; 503 error state also verified live)*
- [ ] Formula unit-tested against hand-computed fixtures ✅ (22 tests) — **runs on my phone browser: pending deploy + street check**

## The Formula (v0, deterministic)

```
TrueFeel = AT_base + SolarPremium + EnvDelta + ActivityDelta

AT_base        = Ta + 0.33·e − 0.70·ws − 4.00        (Steadman Apparent Temp)
e (hPa)        = 6.105 · exp(17.27·Td / (237.7+Td))   (vapor pressure from DEW POINT)
SolarPremium   = Sun: clamp(UVI × 0.8, 0, 8) · cos-weighted by solar zenith
                 Overcast: 25% of Sun value · Shade: 0 · Night: 0
EnvDelta       = Urban +2 (12:00–22:00 local, else +1) · Open 0 · Nature −1
ActivityDelta  = Stagnant 0 · Walking +1 · Active +3, each reduced 50% when ws > 5 m/s
SweatEfficiency= 100% at Td ≤ 10°C → linear → 0% at Td ≥ 26°C
```

Inputs from Open-Meteo: `temperature_2m` (Ta), `dew_point_2m` (Td), `wind_speed_10m` scaled ×0.6 to street level (ws), `uv_index` (UVI). Zenith computed client-side from lat/long/time. All coefficients live in `constants.ts` — they are tuning knobs, not physics claims.

## In Scope (v0)

Hero dashboard · math breakdown · 3 toggles · sweat efficiency · geolocation + manual search · °C · client-only web app, no backend, no accounts, toggles in localStorage.

## Out of Scope → PARKED.md

Bio-calibration (height/weight/metabolic/Clo/acclimatization) · hourly Safe Window timeline · thermal heatmap · crowdsourced reports · CV shadow-casting · LLM copy · notifications · °F · cold-weather model.

## Constraints

- Formula stays deterministic, transparent, and separable — each premium computed and displayed independently. No AI in the calculation path.
- Dew point, never relative humidity, as the moisture input.
- No personal data collected in v0 → no backend, no GDPR surface.

## Non-goals

Meteorological accuracy claims. v0 coefficients are heuristic deltas on Steadman AT, tuned by feel; validation comes later via crowdsourced loop (parked).
