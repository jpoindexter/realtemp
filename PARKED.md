# PARKED.md — promote, never delete

## Hourly "Safe Window" timeline
**Captured:** 2026-07-06 (PDF v1.0 §3.1) · **Why parked:** v0 is current-conditions only; timeline is the same formula mapped over 24 forecast hours — cheap, but it's feature 2. · **Cost to revisit:** Low — Open-Meteo hourly endpoint + one chart component.

## Personal bio-calibration (height/weight/metabolic sliders)
**Captured:** 2026-07-06 (PDF v1.0 Epic 3) · **Why parked:** No validated model for how biometrics shift perceived temp; adds health-data privacy surface (GDPR) and likely a backend. · **Cost to revisit:** High — needs model research + privacy posture first.

## Acclimatization Matrix + "Weather Shock" indicator
**Captured:** 2026-07-06 (PDF v1.0 Epic 3) · **Why parked:** Requires 14-day rolling history per user and undefined state→delta math. · **Cost to revisit:** Medium — local history is easy; the model is the work.

## Smart Clothing Layer Profile (Clo units)
**Captured:** 2026-07-06 (PDF v1.0 Epic 3) · **Why parked:** No outfit→Clo table specified; no clothing term in v0 formula. · **Cost to revisit:** Medium — ISO 9920 Clo tables exist; needs a formula term + UI.

## Hyperlocal thermal heatmap
**Captured:** 2026-07-06 (PDF v1.0 §3.2) · **Why parked:** Was contradictorily both MVP and post-MVP in v1.0; depends on 3D building/canopy data + CV tier. · **Cost to revisit:** Very high — data sourcing project of its own.

## Crowdsourced micro-reports (hotter/cooler/spot-on)
**Captured:** 2026-07-06 (PDF v1.0 §3.3) · **Why parked:** Needs backend, anti-spam, and a defined model-correction mechanism. This is the eventual coefficient-tuning loop — valuable, not v0. · **Cost to revisit:** High — first real backend.

## LLM weather copy
**Captured:** 2026-07-06 (PDF v1.0 §4) · **Why parked:** Decoration on top of the core loop; v1.0's "terminal interface" wording suggests it was aspirational. · **Cost to revisit:** Low.

## Cold-weather model (wind chill, damp cold)
**Captured:** 2026-07-06 (gap analysis) · **Why parked:** Valencia summer is the v0 use case; Steadman AT's wind term gives partial cold coverage. · **Cost to revisit:** Medium — add JAG/TI wind chill below 10°C.

## °F support · Notifications (heat warnings) · CV shadow-casting routes
**Captured:** 2026-07-06 · **Why parked:** Post-launch polish / platform features before a real user. · **Cost to revisit:** Low / Medium / Very high respectively.
