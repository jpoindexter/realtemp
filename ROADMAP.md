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
10. Harden native iPhone shell: relative web assets, full-bleed safe areas, real app icon, physical-device install proof

## v1 — After real daily use

- Progressive-disclosure dashboard: first screen stays True Feel + warning + math + core toggles; deeper panels move behind compact modes
- Hourly Safe Window timeline (promote from PARKED)
- °F toggle
- Cold-weather term (wind chill)
- Coefficient tuning from lived experience

## Shipped after v0

- 2026-07-14 — Native-feeling launch/loading handoff: launch screen matches app, last good reading paints instantly, background refresh updates it
- 2026-07-14 — Progressive-disclosure dashboard: first iPhone viewport stays focused on True Feel, warnings, transparent math, and core toggles; secondary tools remain reachable behind compact panels
- 2026-07-14 — Official AEMET/MeteoAlarm alerts: Worker returns Valencia official warnings by EMMA_ID region; dashboard shows them in a collapsed AEMET panel

## v2+ — Aspirational

- Bio-calibration + Clo profiles (needs model + privacy work)
- Thermal heatmap / shadow-casting (needs 3D data)
