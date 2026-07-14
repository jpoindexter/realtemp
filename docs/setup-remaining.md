# Remaining gated runbook

*Updated 2026-07-14. Code-backed v1 slices are built, tested, pushed, and deployed. The items below need a physical device, elapsed use, credentials, purchases, or a product decision.*

## 1. Street check (P4) — physical iPhone, 5 min

```bash
open https://realtemp-rho.vercel.app
```

On the iPhone, search/select Valencia, walk outside, and check the last PRD v0 box: the app runs on your phone browser in the real street context.

## 2. Native shell proof (P5) — Xcode + physical iPhone

The native fixes are in code: relative web assets, full-bleed iOS insets, launch screen color, splash, and app icon. Completion still needs current proof:

```bash
xcode-select -p
xcrun --find xcodebuild
npm run build
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS,id=<DEVICE_UDID>' build
```

Current blocker from this shell: only Command Line Tools are selected, no `Xcode.app`, `xcodebuild`, or `devicectl` is visible.

## 3. Crash reporting (N6c) — Sentry DSN

Create a React project on sentry.io → `.env` → `VITE_SENTRY_DSN=<dsn>`, rebuild. Zero bytes shipped until set.

## 4. Name + domain (N7) — docs/naming.md

Recommended: **StreetFeel** · streetfeel.app · $9.99/yr · vercel.com/domains. Formal EUIPO/USPTO check before public launch.

## 5. Time / purchase / decision gated

- **N2:** tune `src/features/formula/constants.ts` after ~2 weeks of street use; log deltas in DECISIONS.md.
- **L4b:** decide whether to proceed with the PNOA-LiDAR precision path in `docs/heatmap-prd.md`.
- **L5b:** `cd worker && npx wrangler secret put ANTHROPIC_API_KEY && npm run deploy` to enable the LLM copy line.
- **L6:** Stripe account and paywall go/no-go.
- **L7:** Open-Meteo commercial license before charging users.
