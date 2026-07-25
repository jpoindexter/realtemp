# Product Review — RealTemp monetization bet

**Date:** 2026-07-25 · **Decision owner:** Jason · **Reviewer:** Claude
**Decision requested:** Should RealTemp pursue CARROT-style subscription monetization?

---

## Executive decision

**Run a targeted test. Do not start monetization work.**

Two conditions gate any paid path, and neither is a matter of taste:

1. The product has **zero users, including its owner**. P4 (street check) has been open 19 days.
2. The product's central claim is **explicitly disclaimed in its own PRD**. See Blocker 1 — this is the finding that matters most in this review.

Steps 1–2 of the proposed sequence (street check, custom alert rules) are cheap and reduce the dominant uncertainty. They should proceed. Everything downstream of "charge money" should pause until Blocker 1 is resolved.

---

## Reconstructed bet

| Element | As it currently stands |
|---|---|
| **Customer** | Undefined. PRD says "One user: Jason, walking around Valencia in summer." No second customer has ever been named. |
| **Problem** | Weather apps report shaded-box conditions; "Feels Like" is opaque and ignores sun/shade. |
| **Intervention** | A deterministic, separable ledger showing each premium as its own signed line. |
| **Mechanism** | Seeing *why* it is 37.6° — and watching Shade zero the sun premium — produces trust and changes behaviour. |
| **Outcome** | User makes better decisions about when and where to be outside. |
| **Business value** | Subscription, on the CARROT model, at some price point below their $19.99–39.99/yr tiers. |

**The mechanism has never been observed in anyone, including Jason.** It is the load-bearing assumption of the entire bet and it currently has N=0.

---

## Evidence ledger

### Observed (directly inspected this session)

- `PRD.md` v0 criteria: 6 of 7 checked. The seventh — *"runs on my phone browser: pending deploy + street check"* — is open.
- `verify:roadmap-gates` fails: 5 active cards (P4, P5, N6c, N7, L4b), **all externally gated on Jason**.
- `verify:ios-prereqs` fails: Command Line Tools only, no full Xcode, no physical iPhone visible.
- `PARKED.md` 2026-07-14: paywall/Stripe parked; Open-Meteo commercial licence parked.
- CARROT bundle: 3,201 strings contain exactly one relevant key — `data_point_type_feels_like` → "Feels Like". **No breakdown anywhere.**
- CARROT premium banners sell customization, data sources, map layers, widgets, complications. **Accuracy is not on the list.**
- `feat/dashboard-v2`: 95 tests, typecheck, lint green. PR #1 open, undeployed.
- Live AEMET yellow high-temperature warning for Valencia today — the product's use case is live right now and nobody is using the product.

### Reported (stated, not independently verified)

- CARROT ≈ $200–250k/month, $2.4–3.0M ARR (Sensor Tower-class estimates).
- Tiers: $6.99 / $19.99 / $39.99 per year; family to $59.99.
- Significant API COGS to AccuWeather / Foreca / AerisWeather / WeatherKit.

### Inferred

- CARROT's moat is 12 years of App Store distribution and brand, not its feature list.
- RealTemp's COGS structure would be materially lower — it sells interpretation, not feed access.
- Custom notifications sitting in CARROT's **top** tier suggests alerting is a genuine willingness-to-pay driver.

### Assumed (unverified, load-bearing)

- That anyone other than Jason wants a transparent ledger. **No evidence either way.**
- That the ledger is actually read and trusted in real use. **No evidence.**
- That Open-Meteo commercial pricing is affordable. **Not checked.**
- That the coefficients are accurate enough to sell. **Contradicted — see Blocker 1.**

---

## Four-risk assessment

**Value — HIGH RISK.** Zero users. The differentiator is real and verified against the competitor, but "CARROT lacks it" is not evidence that anyone wants it. Absence of a feature in a $2.4M product is at least as easily read as evidence the market does *not* pay for it.

**Usability — LOW RISK.** Genuinely the strongest dimension. Four tabs each fit a phone viewport, WCAG-computed contrast, honest 44px targets, correct ARIA roles, degraded states handled. Verified by measurement this session.

**Feasibility — LOW/MEDIUM RISK.** The hard part is built and deployed: pure formula module, Zod-fenced adapters, worker with D1/KV/cron, push, radar, shade map. Custom alert rules reuse existing infrastructure. Native distribution is the only real feasibility gap.

**Viability — BLOCKED.** No commercial data licence, no storefront, no audience, and an accuracy disclaimer that contradicts the sales claim.

---

## Strategic fit

The proposed guiding policy — *win a narrow heat-exposure niche where transparency is the buying reason* — is coherent and makes a real choice. It survives the bad-strategy audit: it names a central obstacle, picks one axis, and declares non-goals.

**Its weakest link is that its central claim is unproven and currently unprovable.** See below.

**Opportunity cost:** every hour on monetization is an hour not spent on the 5-minute action that would produce the first real evidence this product has ever had.

---

## Ranked gaps

### BLOCKER 1 — The product cannot honestly charge for its central claim

`PRD.md`, Non-goals, verbatim:

> *"Meteorological accuracy claims. v0 coefficients are heuristic deltas on Steadman AT; validation or coefficient tuning requires an explicit product decision."*

And `DECISIONS.md` 2026-07-14 removed the only mechanism that would have fixed this:

> *"Remove the active N2 lived-use/coefficient-tuning gate... There is no shipped feedback capture loop, and RealTemp should not promise formula learning from user feedback."*

So: the product's proposition is *"the temperature your body actually meets on the street"*, while its own PRD disclaims accuracy and its validation loop was deliberately deleted 11 days ago.

Free, that is an honest, well-labelled heuristic. **Paid, it is selling a measurement you have documented that you cannot stand behind.** In the EU that is also a consumer-protection surface, not merely a taste question.

*Required to clear:* either (a) validate the coefficients against real observations — which is exactly what personal weather station integration would enable — or (b) reposition the paid claim away from accuracy and toward transparency and decision support, and rewrite the PRD non-goal to match.

### BLOCKER 2 — No commercial data licence

Open-Meteo's free tier is non-commercial. The first payment taken is a licence breach. Already documented in `PARKED.md`. Pricing **not verified** — that is the single cheapest open question here.

### BLOCKER 3 — No distribution

CARROT's revenue flows through App Store subscription billing. RealTemp has no listing, and `verify:ios-prereqs` fails on missing Xcode and no physical device. Web-only means Stripe, which means no App Store discovery — a materially different and harder acquisition problem.

### IMPORTANT 4 — N=1 and that one has not used it

P4 is a five-minute action, gated 19 days, and it blocks the last v0 criterion. Until Jason has used this on a Valencia street in summer, every downstream plan rests on introspection rather than use.

### IMPORTANT 5 — Formula changed today, unvalidated

Bio-calibration was removed today, changing True Feel for any profile-setting user. Correct call for the data-collection reason, but it means the formula shifted with zero users in a position to notice.

### MONITOR 6 — Differentiator may be a niche-within-a-niche

The ledger may be a builder's preference rather than a customer's. Watch whether the breakdown is actually opened in real use — if it is not, the strategy is void.

---

## Measurement review

There is **no instrumentation for the core mechanism.** Sentry is wired but DSN-gated (N6c open). Nothing measures whether anyone expands the ledger, changes a toggle, or returns the next day.

For a bet whose entire thesis is "people value seeing the math", not measuring whether the math is looked at is the central measurement gap.

*Minimum viable instrumentation before any paid work:* ledger-view events, toggle-change events, day-2 and day-7 return.

---

## Readiness review

| Dimension | State |
|---|---|
| Code | Green — 95 tests, typecheck, lint |
| Deploy | PR #1 open, **undeployed** |
| Infra | Worker live: D1, KV, cron, push |
| Crash reporting | Gated on N6c |
| Legal | **Not ready** — non-commercial licence |
| Distribution | **Not ready** — no listing, no device |
| Support | None — no channel, no docs, no refund path |

---

## Required actions

| # | Action | Owner | Cost |
|---|---|---|---|
| 1 | P4 street check — use it outside, tick the last v0 box | Jason | 5 min |
| 2 | Deploy PR #1 (`npx vercel --prod`) | Jason | 1 min |
| 3 | Get current Open-Meteo commercial pricing | Claude | 1 lookup |
| 4 | Decide Blocker 1: validate the coefficients, or reposition the claim and amend the PRD | Jason | 1 decision |
| 5 | Add ledger-view + toggle + return instrumentation | Claude | ~half day |
| 6 | Two weeks of daily personal use before any monetization work | Jason | 14 days elapsed |

---

## Not verified in this review

- CARROT's actual revenue — third-party estimates only, gross, and indie-app estimates run loose.
- Open-Meteo commercial pricing.
- Any customer evidence whatsoever. There is none to audit.
- Whether the coefficients are accurate. No ground truth exists in the project.
- App Store review risk for a Capacitor-wrapped weather app.

---

## Next review trigger

After **14 consecutive days of personal daily use**, or immediately if Blocker 1 is resolved in either direction.

**Stop rule:** if two weeks of daily use produce no occasion where the breakdown is opened and acted on, the transparency thesis is falsified — stop, and revisit whether this is a product or a well-built personal tool.
