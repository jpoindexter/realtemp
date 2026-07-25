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

## Shipped after v0

- 2026-07-14 — Native-feeling launch/loading handoff: launch screen matches app, last good reading paints instantly, background refresh updates it
- 2026-07-14 — Progressive-disclosure dashboard: first iPhone viewport stays focused on True Feel, warnings, transparent math, and core toggles; secondary tools remain reachable behind compact panels
- 2026-07-14 — Official AEMET/MeteoAlarm alerts: Worker returns Valencia official warnings by EMMA_ID region; dashboard shows them in a collapsed AEMET panel
- 2026-07-15 — Weather factors + forecast: current rain/cloud/humidity/condition fields and next-6-hour forecast added from Open-Meteo
- 2026-07-15 — iPhone dashboard tabs: Now / Forecast / Tune split the long dashboard into top-level mobile sections
- 2026-07-15 — Header icon polish: Settings uses a gear-shaped icon, separate from light/dark mode
- 2026-07-15 — Stale weather auto-refresh: an open dashboard refreshes after the stale TTL instead of waiting for focus/visibility

## v2 — Path to commercial success

*Added 2026-07-25 after the CARROT teardown (`docs/carrot-teardown.html`) and product review (`docs/product-review-2026-07-25.md`). Outcome initiatives with stop rules, not a feature list. Each stage gates the next — do not run them in parallel.*

**Strategic outcome:** a narrow heat-exposure niche pays for RealTemp because the math is visible and the alerts are theirs.

**Guiding policy:** win the niche where transparency is the buying reason, before adding surface area. CARROT clears an estimated $2.4–3M/yr selling customization, data sources, and distribution — *not* accuracy. Competing on their axis means fighting a 12-year incumbent on a cost structure built from AccuWeather/Foreca licences. RealTemp sells interpretation, not feed access, so its COGS floor is far lower and it can win below their $19.99 tier.

### C1 — Prove the mechanism *(now)*
Nobody has used this, including Jason, and nothing measures whether the ledger is ever opened.
- **C1a** Instrument the ledger — ledger-open, toggle-change, D2/D7 return
- **C1b** *(gated)* 14 days daily street use
- **Stop rule:** zero ledger opens in 14 days falsifies the transparency thesis. Stop; it is a personal tool.

### C2 — Earn the right to charge *(now, blocks everything paid)*
- **C2a** Price the Open-Meteo commercial plan — the free tier is non-commercial, so the first payment is a licence breach
- **C2b** *(gated)* Resolve the accuracy claim. `PRD.md` Non-goals disclaims meteorological accuracy while the pitch promises the temperature your body actually meets. Validate the coefficients, or reposition the paid claim onto transparency and decision support — then amend the PRD.

### C3 — Five users who are not Jason *(next)*
- **C3a** *(gated)* Recruit 5 in the niche: outdoor workers, cyclists/runners in hot climates, heat-intolerant (MS, POTS, pregnancy)
- **C3b** Positioning — alternatives, value map, category. "Weather app" is the wrong category; there you lose to free preinstalled Apple Weather.
- **Continuation rule:** fewer than 3 still using at day 14 → reposition or stop.

### C4 — Build the paid surface *(later)*
- **C4a** Custom alert rules over ledger terms — CARROT gates this behind their **top** tier, the strongest willingness-to-pay signal in their pricing, and RealTemp's cron/D1/push are already deployed
- **C4b** *(gated)* Packaging and price — **the ledger stays free.** It is the acquisition hook and the only verified differentiator. Gate recurring value: alerts, weather-station input, history, multi-location.
- **C4c** *(gated)* Billing and first paying customer

### C5 — Conversational explanation layer *(later, gated on C1)*
The strongest case for it: RealTemp's entire thesis is *explaining* a number, and conversation is the natural extension of explanation. It is also the most genuinely 2026 surface available, and the plumbing already exists — `/api/copy`, the worker, KV caching, Haiku. Today it ships as one 60-token line (`CopyLine`), dark by default because no `ANTHROPIC_API_KEY` is set.

The objection is commercial, not technical. **Per-session LLM calls reintroduce variable COGS — the exact cost structure that caps CARROT's margin and that RealTemp's sub-$19.99 pricing depends on avoiding** (see the 2026-07-25 `DECISIONS.md` entry). Adding it is legitimate; drifting into it unpriced is not.

`PRD.md`'s constraint holds either way: **AI may explain the ledger, never compute it.**

- **Gate:** do not start before C1b. If nobody opens a static breakdown, nobody will chat with one.
- **Done:** either a `DECISIONS.md` entry with a measured per-session cost and a tier that covers it, or the card is closed as a permanent non-goal.

### Explicit non-goals for the commercial path
Watch app · widgets and Live Activities · tides · moon phases · zodiac · trips · almanac · personality and voice · 12 map layers · multi-provider data sourcing. All are CARROT strengths built on scale RealTemp does not have.

Conversational AI is **deferred, not excluded** — it is C5, gated on C1 evidence and a costed decision. It is listed here so it is a choice rather than an oversight.

**Review trigger:** after C1b completes, or immediately if C2b resolves in either direction.

## v2+ — Aspirational

- Personal weather station input (Netatmo/WeatherFlow) — the most on-thesis feature CARROT has, and the only credible route to validating coefficients against ground truth
- Wet-bulb temperature — the real heat-stress metric; both inputs already available
- Forecast confidence from ensemble spread
- Thermal heatmap / shadow-casting precision (needs LiDAR data, card L4b)
