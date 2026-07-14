# Audit Round 2 — 2026-07-06

Scope: PRD v2.0 (post-gap-closure) + new dimensions (flows, AI, cost, paywall). Round 1 (24 gaps) lives in session history; all P0/P1 from it are resolved in PRD v2.0 or parked. Paywall/monetization findings were later parked on 2026-07-14 per Jason's direction.

## New gaps found

| # | Dimension | Gap | Severity | Card |
|---|-----------|-----|----------|------|
| A1 | Cost | Open-Meteo free tier is **non-commercial** (~10k calls/day). Any paid tier triggers the ~€29/mo commercial API plan. | Parked until monetization returns | PARKED |
| A2 | Paywall | No pricing model existed. Freemium/Stripe notes are parked; no paywall is in active scope. | Parked | PARKED |
| A3 | AI | LLM copy had no cost budget. Est. Haiku-class ≈ $0.0002/req; per-location-hour caching cuts ~90%. CV heatmap remains a data-sourcing project, not a model call. | P2 | L5, L4 |
| A4 | Data | Refresh cadence unspecified → refetch on focus + 10-min TTL + stale badge. | P2 | N4 |
| A5 | Data | Unit trap: Open-Meteo default wind is **km/h**, formula needs **m/s** — request `wind_speed_unit=ms` explicitly. | P1 (v0, silent formula corruption) | R2 |
| A6 | Ops | No observability. Deferred to v1 by design (no-platform-before-users). | P2 | N6 |
| A7 | Ops | Installability for street use → PWA manifest, no offline cache yet. | P3 | S2 |
| A8 | Flows | Onboarding/error flows undesigned → flow charts doc (docs/flows.html). | P1 (v0) | R3, P3 |
| A9 | Legal | Name/domain/trademark check before anything public. | P1 (v1 gate) | N7 |

## Cost model (v0 → v2)

- **v0:** €0. Client-only, Open-Meteo free (personal use), static hosting free tier.
- **v1:** €0–14/mo (domain ~€12/yr, Sentry free tier).
- **Parked monetization:** Open-Meteo commercial license + Stripe/paywall economics are not active scope until Jason reopens monetization.

## Verdict

v0 remains buildable today with zero spend and zero new P0s. A5 folded into the adapter's definition of done.
