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
