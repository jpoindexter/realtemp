# RealTemp — System Maps

All flows, uses, AI, cost, and paywall in one doc. Source of truth for behavior; PRD.md holds the formula.

## 1. Core user flow (v0)

```mermaid
flowchart TD
    A[Open app] --> B{Stored location?}
    B -- yes --> F[Fetch Open-Meteo]
    B -- no --> C{Geolocation permission}
    C -- granted --> F
    C -- denied / unavailable --> D[City search - Open-Meteo geocoding]
    D --> E[Pick city] --> S[(localStorage: location)] --> F
    F -- ok --> G[Compute TrueFeel]
    F -- fail --> X[Error state + Retry] --> F
    G --> H[Hero: True Feel + math breakdown + sweat efficiency]
    H --> T{Toggle changed?}
    T -- Exposure / Environment / Activity --> S2[(localStorage: toggles)] --> G
    T -- no --> H
```

## 2. Formula pipeline (deterministic, no AI)

```mermaid
flowchart LR
    subgraph inputs [Open-Meteo - one call]
        Ta[temperature_2m]
        Td[dew_point_2m]
        WS["wind_speed_10m (m/s!) ×0.6 street"]
        UVI[uv_index]
    end
    Z["solar zenith (client calc: lat/long/time)"]
    subgraph premiums [separable premiums - each its own UI line]
        AT["Steadman AT = Ta + 0.33e − 0.70ws − 4"]
        SP["SolarPremium = clamp(UVI×0.8,0,8) · zenith-weighted · exposure toggle"]
        ED["EnvDelta: urban +2 (12-22h) / open 0 / nature −1"]
        AD["ActivityDelta: 0/+1/+3, halved if ws>5"]
    end
    Ta --> AT
    Td -->|vapor pressure e| AT
    WS --> AT & AD
    UVI --> SP
    Z --> SP
    AT & SP & ED & AD --> TF[True Feel °C]
    Td --> SE["Sweat Efficiency: 100% @Td≤10 → 0% @Td≥26"]
```

## 3. Data / degraded state machine

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Live: payload valid
    Loading --> Error: fetch fail
    Error --> Loading: retry
    Live --> Degraded: field missing → hide that premium + badge
    Degraded --> Live: field returns
    Live --> Night: zenith > 90° → solar premium = 0
    Night --> Live: sunrise
    Live --> Stale: TTL 10min exceeded (v1)
    Stale --> Loading: refetch on focus
    note right of Degraded: NaN never renders. Breakdown always sums to displayed value.
```

## 4. AI tiers — what's AI, what never is

```mermaid
flowchart TD
    V0["v0 — ZERO AI. Formula is deterministic & transparent (constraint, not gap)"]
    V2a["v2 — LLM copy: Haiku-class one-liner from the data array\n~$0.0002/req → cache per location-hour = −90% cost"]
    V2b["v2 — CV shadow-casting: 3D building/canopy data → shade map\n(data-sourcing project, gates the heatmap)"]
    NEVER["Never AI: the True Feel number itself"]
    V0 --> V2a & V2b
    V0 -.constraint.-> NEVER
```

## 5. Cost model

```mermaid
flowchart LR
    subgraph v0 [v0 — €0/mo]
        c1[Open-Meteo free non-commercial] --- c2[Static hosting free tier] --- c3[No backend]
    end
    subgraph v1 [v1 — ~€1/mo]
        c4[Domain €12/yr] --- c5[Sentry free tier]
    end
    subgraph v2 [v2 paid — ~€35/mo fixed + variable]
        c6[Open-Meteo commercial €29/mo REQUIRED once revenue exists]
        c7[Workers backend ~€5/mo]
        c8["Stripe 1.5% + €0.25/txn"]
        c9[LLM ~€0.006/user/mo cached]
    end
    v0 --> v1 --> v2
    v2 --> BE["Break-even ≈ 20 subs @ €2.50/mo"]
```

## 6. Paywall flow (v2, freemium)

```mermaid
flowchart TD
    F[Free user: current conditions + toggles + breakdown] --> G{Taps gated feature}
    G -->|timeline / heatmap / bio-cal / alerts / multi-location| P["Paywall: value framing — 'see your safe windows' — €2–3/mo"]
    P -- subscribe --> S[Stripe Checkout] --> E[(Entitlement)] --> U[Feature unlocks]
    P -- dismiss --> F
    U --> M[Manage: cancel anytime → grace period → back to free]
    style P fill:#ad7f58,color:#fff
```

Free tier stays genuinely useful (the differentiator — visible math — is FREE; it's the trust engine). Premium sells depth: time (timeline), space (heatmap), body (bio-cal), push (alerts).

## 7. Crowdsource validation loop (v2 — how the formula earns accuracy)

```mermaid
flowchart LR
    U[User on street] -->|one tap: hotter / cooler / spot-on| R[(Reports DB)]
    R --> Agg[Aggregate by cell + hour] --> Bias[Local bias term per microcell]
    Bias --> TF[True Feel adjustment] --> U
    Agg --> Dash[Drift dashboard] -->|tune| K[constants.ts coefficients]
```
