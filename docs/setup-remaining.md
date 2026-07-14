# Remaining gated runbook

*Updated 2026-07-14. Code-backed v1 slices are built, tested, pushed, and deployed. The items below need a physical device, elapsed use, credentials, purchases, or a product decision.*

Run `npm run verify:roadmap-gates` for the current executable blocker list. It fails until every active roadmap card is proven complete.

## 1. Street check (P4) — physical iPhone, 5 min

```bash
open https://realtemp-rho.vercel.app
```

On the iPhone, search/select Valencia, walk outside, and check the last PRD v0 box: the app runs on your phone browser in the real street context.

## 2. Native shell proof (P5) — Xcode + physical iPhone

The native fixes are in code: relative web assets, full-bleed iOS insets, launch screen color, splash, and app icon. Completion still needs current proof:

```bash
npm run verify:ios-prereqs
npm run build
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS,id=<DEVICE_UDID>' build
```

If `xcode-select` still points at Command Line Tools but full Xcode is installed, use the verifier's printed override:

```bash
export DEVELOPER_DIR="/path/to/Xcode.app/Contents/Developer"
npm run verify:ios-prereqs
```

Current blocker from this shell: only Command Line Tools are selected and no full `Xcode.app` is discoverable via `DEVELOPER_DIR`, `xcode-select`, `/Applications`, or Spotlight; therefore `xcodebuild`, `simctl`, and `devicectl` are unavailable to this task.

## 3. Crash reporting (N6c) — Sentry DSN

Create a React project on sentry.io → copy `.env.example` to `.env` → set `VITE_SENTRY_DSN=<dsn>` locally and in Vercel → verify → rebuild.

```bash
npm run verify:sentry
npm run build
```

Zero bytes shipped until set; `npm run verify:sentry` intentionally fails until the private DSN exists.

## 4. Name + domain (N7) — docs/naming.md

Recommended: **StreetFeel** · streetfeel.app · $9.99/yr · vercel.com/domains. Formal EUIPO/USPTO check before public launch.

## 5. Time / purchase / decision gated

- **N2:** tune `src/features/formula/constants.ts` after ~2 weeks of street use; log deltas in DECISIONS.md.
- **L4b:** decide whether to proceed with the PNOA-LiDAR precision path in `docs/heatmap-prd.md`.
- **L5b:** `cd worker && npm run verify:anthropic` for local proof, then `npx wrangler secret put ANTHROPIC_API_KEY && npm run deploy` to enable the LLM copy line in production. The verifier intentionally fails until the private key exists locally.
