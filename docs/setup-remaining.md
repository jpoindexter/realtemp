# Your runbook — everything left is one of these

*2026-07-07. Every code seam is built, tested, and pushed. Each block below is copy-paste.*

## 1. Street check (P4) — 5 min, no accounts

```bash
npx cap open ios   # Run on your iPhone, search Valencia, walk outside
```

## 2. Backend on (L1b + L5b) — ~10 min, Cloudflare account

```bash
cd worker
npx wrangler login
npx wrangler d1 create realtemp-reports     # paste database_id into wrangler.jsonc
npx wrangler kv namespace create CACHE      # paste id into wrangler.jsonc
npx wrangler d1 execute realtemp-reports --file schema.sql --remote
npx wrangler secret put ANTHROPIC_API_KEY   # optional — enables the LLM copy line
npm run deploy                              # note the workers.dev URL
```

Then in project root: `.env` → `VITE_API_BASE=https://realtemp-api.<account>.workers.dev`, rebuild. Report buttons + copy line appear automatically.

## 3. Crash reporting (N6b) — 5 min, sentry.io

Create a React project on sentry.io → `.env` → `VITE_SENTRY_DSN=<dsn>`, rebuild. Zero bytes shipped until set.

## 4. Name + domain (N7) — docs/naming.md

Recommended: **StreetFeel** · streetfeel.app · $9.99/yr · vercel.com/domains. Formal EUIPO/USPTO check before public launch.

## 5. Time-gated — no action now

- **N2:** tune `src/features/formula/constants.ts` after ~2 weeks of street use; log deltas in DECISIONS.md.
- **L6/L7 (paywall, commercial license):** per your call, parked until you set up Stripe; Open-Meteo €29/mo triggers on first revenue.
- **L8 (push), L4 (heatmap):** need APNs / 3D-data sourcing — own slices when you want them.
