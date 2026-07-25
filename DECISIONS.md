# DECISIONS.md — append-only

## 2026-07-06 — Thermal model: Steadman AT + bounded deltas
**Choice:** Steadman Apparent Temperature (dew-point vapor-pressure form) as base; toggles apply bounded additive deltas.
**Alternatives:** UTCI (accurate, but 6th-order polynomial, needs mean radiant temp we don't have); invent physiology from scratch (research project, PDF v1.0's implicit path).
**Why:** Deterministic, 4 inputs we have, computable in one line, defensible baseline. Deltas keep the PRD's "transparent breakdown" feature intact.
**Reversible?** Yes — formula isolated in one module; swap base model later without UI change.

## 2026-07-06 — Platform: client-only web app
**Choice:** Web (React + Vite + TS), no backend, localStorage for toggles.
**Alternatives:** iOS native (App Store friction, one platform); Tauri (desktop wrong for street use).
**Why:** Open-Meteo needs no API key → pure client works. Phone browser = street use. Smallest shippable.
**Reversible?** Yes — formula/data layer is framework-agnostic TS.

## 2026-07-06 — Data provider: Open-Meteo
**Choice:** Open-Meteo, sole provider for v0.
**Alternatives:** NOAA (US-only — user is in Valencia); Copernicus (bulk/scientific access, not a simple current-conditions API).
**Why:** Free, no key, one call returns temp/dew point/wind/UV, has geocoding API, EU coverage.
**Reversible?** Yes — Zod-validated adapter boundary.

## 2026-07-06 — MVP line: Epic 1 + Epic 2 only
**Choice:** v0 = hero dashboard + microclimate toggles. Epic 3 (bio-calibration) and all §3 secondary screens parked.
**Alternatives:** PDF v1.0 scope (contradictory — heatmap was both MVP and post-MVP).
**Why:** Bio-calibration adds a privacy/GDPR surface and an unvalidated physiological model for marginal v0 value. One feature end-to-end first.
**Reversible?** Yes — everything parked, nothing deleted.

## 2026-07-06 — Name: "RealTemp" codename, "RealFeel" dropped
**Choice:** Working codename RealTemp; real name decided pre-launch.
**Why:** RealFeel® is an AccuWeather trademark.
**Reversible?** Yes.

## 2026-07-06 — Platform amended: Capacitor-wrapped iOS app
**Choice:** Wrap the existing React app in a Capacitor iOS shell; web build remains the dev target.
**Alternatives:** PWA-only (no App Store, no push on iOS); native SwiftUI rewrite (throws away the shipped UI layer, ~1 week).
**Why:** Jason redirected v0 to "phone app" same-day. Capacitor keeps 100% of the green code, gives a home-screen app + App Store path, and leaves push notifications (v2 card L8) reachable.
**Reversible?** Yes — the web app stays intact; the iOS shell is additive.

## 2026-07-07 — v1 build pulled forward before street check
**Choice:** Build executable v1 cards (N1/N3/N4/N5, N6 partial) now, before P4 street verification, per direct instruction ("/hill-climb execute all cards"). Gated cards (P4, N2, N7, all v2) remain blocked with named gates.
**Why:** Jason's call overrides ROADMAP sequencing. Coefficient tuning (N2) still requires lived data — unchanged.
**Reversible?** Yes.

## 2026-07-07 — Acclimatization model: share-of-deviation heuristic
**Choice:** delta = (todayAir − mean of past 14 daily means) × factor (new 0.3 / settling 0.15 / local 0), clamped ±3°C. Weather Shock badge at |deviation| ≥ 8°C. Baseline from a second Open-Meteo call, degrades to null.
**Alternatives:** physiological acclimatization models (no accessible standard for consumer inputs); auto-detecting state from usage history (creepy + unreliable).
**Why:** Transparent, bounded, self-reported, zero personal data. Coefficients in constants.ts, tunable like the rest.
**Reversible?** Yes.

## 2026-07-07 — Bio-calibration model: bounded thermal-sign heuristic
**Choice:** body = clamp((BMI−22)×0.1, ±1.5) × thermalSign(base) + metabolic (−0.5/0/+0.5); clothing = cold table (−2/0/+2) ⟷ heat table (−0.5/0/+1.5) blended by thermalSign; thermalSign = clamp((base−17.5)/7.5, −1, 1). All on-device (localStorage), defaults are zero-effect, rows only render when non-zero.
**Alternatives:** ISO 7730 PMV (needs clo/met precision consumers can't supply); skipping the card (was v2-gated on "validated model" — Jason overrode the gate).
**Why:** Transparent, bounded, opt-in; consistent with every other coefficient being a tunable knob, not a physics claim. No backend → no GDPR surface.
**Reversible?** Yes.

## 2026-07-07 — Shade map v0: OSM footprints over LiDAR pipeline
**Choice:** Overpass API building footprints + building:levels (default 4) → sun-cast shadow polygons, figure/ground SVG, no tiles, no keys, no deps. Fetched on panel open only.
**Alternatives:** PNOA-LiDAR precomputed tiles (docs/heatmap-prd.md option 1 — stays as the precision upgrade, card L4b); commercial shade API.
**Why:** Shippable today, zero cost, works anywhere OSM has buildings, matches the asphalt figure/ground aesthetic. Heights are estimates — labeled beta.
**Reversible?** Yes — swap the data source, keep the geometry module.

## 2026-07-14 — Official alerts: MeteoAlarm Atom + EMMA_ID matcher
**Choice:** Use MeteoAlarm's maintained Spain Atom feed in the Worker, parse CAP summary fields, and match the user's coordinates against known EMMA_ID warning-region polygons for Valencia. Render matches in a collapsed dashboard panel.
**Alternatives:** AEMET direct CAP RSS fanout (most precise, and still unit-covered, but Cloudflare-to-AEMET detail XML fetches were unreliable in production); province-level geocoding (coarser and brittle around coastal/interior warning zones); MeteoAlarm EDR API (GeoJSON, but token-gated for direct access).
**Why:** MeteoAlarm's Atom feed is public and Worker-reachable; AEMET is still the issuing authority behind Spain warnings. EMMA_ID matching preserves the coastal/interior Valencia split without browser CORS or a brittle province-only lookup.
**Reversible?** Yes — the client reads a small `/api/alerts` JSON shape; the Worker can swap feed source later.

## 2026-07-14 — Lived-use feedback tuning removed from active scope
**Choice:** Remove the active N2 lived-use/coefficient-tuning gate, local feedback log template, and verifier.
**Alternatives:** Keep a manual "felt hotter/colder" evidence loop as a gated roadmap card.
**Why:** There is no shipped feedback capture loop, and RealTemp should not promise formula learning from user feedback until that product behavior is actually designed and implemented.
**Reversible?** Yes — add a new PRD change and roadmap card if feedback capture becomes a real feature.

## 2026-07-25 — Bio-calibration removed from the formula
**Choice:** Delete the "Your body" panel and both formula terms it fed (`body`, `clothing`), plus `BioProfile`, `use-bio`, and the BODY_/METABOLIC_/CLOTHING_/THERMAL_SIGN_ coefficients. Returned to `PARKED.md`.
**Alternatives:** Drop only the height/weight inputs and keep metabolism + clothing (they produce real deltas without collecting identifying data); leave it as-is behind the disclosure it already had.
**Why:** Jason's call — the app was asking for height and weight without doing anything with the data worth the ask. Removing the question outright is the honest version: no personal-data surface at all, rather than a collected-but-marginal one. Reverses the 2026-07-07 bio-calibration decision.
**Consequence:** True Feel changes for anyone who had set a profile — their `your body` and `clothing` ledger rows disappear. Orphaned `realtemp:bio` localStorage keys are left in place, harmless and unread.
**Reversible?** Yes — the model is documented in the 2026-07-07 entry and restored from `PARKED.md`.

## 2026-07-25 — Pricing architecture: near-zero marginal cost is a constraint, not an accident
**Choice:** Treat RealTemp's per-user marginal cost as a design constraint. Any feature adding recurring per-session or per-request cost (LLM calls, premium data feeds, high-frequency polling) must be priced against a tier that covers it before it is built.
**Alternatives:** Add features on merit and reconcile unit economics later — the default path, and how most subscription products acquire a margin problem.
**Why:** The CARROT teardown plus Jason's revenue data (est. $2.4–3M ARR gross) shows their model is substantially reselling premium weather feeds — AccuWeather, Foreca, AerisWeather, WeatherKit — at a markup, with API COGS taking a significant share. RealTemp's one structural advantage is that it sells *interpretation, not feed access*: Open-Meteo plus a pure formula has a near-zero marginal cost, which is what allows a viable price below CARROT's $19.99 tier in a much smaller niche. Spending that advantage accidentally removes the reason the business works at low volume.
**Consequence:** The conversational layer (roadmap C5) is gated on a costed decision rather than treated as ordinary feature work. Same test applies to multi-provider data and high-frequency radar.
**Reversible?** Yes — but reversing it means competing on CARROT's cost structure without their volume.

## 2026-07-25 — AI stays out of the calculation path, and out of v0 pricing
**Choice:** Keep the `PRD.md` constraint literal — AI may explain the ledger, never compute it — and keep the conversational layer parked as roadmap card C5, gated on C1b evidence.
**Alternatives:** Build a conversational weather assistant now (CARROT's actual moat is personality, and it is the most 2026 surface available); or delete the AI path entirely.
**Why:** The static ledger has never been opened by a single user, including Jason. Building a conversational version of an explanation nobody has read yet is solving the second problem first. Deferred rather than deleted because the argument for it is real and the plumbing already exists.
**Reversible?** Yes — C5 carries the unblock recipe.
