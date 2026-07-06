# ROADMAP.md

## v0 — Shippable to one user (Jason, phone browser, Valencia)

1. Scaffold: Vite + React + TS strict + Vitest, `git init`
2. Formula module: `computeTrueFeel()` pure fn + fixtures (the PRD formula, unit-tested first)
3. Open-Meteo adapter: Zod-validated fetch of Ta/Td/ws/UVI + geocoding search
4. Location: browser geolocation → manual city search fallback
5. Hero dashboard: True Feel + math breakdown lines
6. Toggles: Exposure / Environment / Activity → instant recalc, persisted to localStorage
7. Sweat Efficiency widget
8. Degraded states: night zenith, missing fields, fetch failure
9. Deploy (Vercel/Cloudflare), run on phone → check v0 boxes in PRD.md

## v1 — After real daily use

- Hourly Safe Window timeline (promote from PARKED)
- °F toggle
- Cold-weather term (wind chill)
- Coefficient tuning from lived experience

## v2+ — Aspirational

- Crowdsourced micro-reports → coefficient validation loop
- Bio-calibration + Clo profiles (needs model + privacy work)
- Thermal heatmap / shadow-casting (needs 3D data)
