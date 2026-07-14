# P4 street check evidence

P4 is a physical iPhone check. It proves the deployed app or native shell actually works in the intended street context, not just in local tests.

Create `realtemp-street-check.json` in the repo root. It is ignored by git because it can include device/location notes.

```json
{
  "date": "2026-07-14",
  "device": "iPhone 15 Pro",
  "surface": "browser",
  "url": "https://realtemp-rho.vercel.app",
  "locationMethod": "manual-search",
  "locationLabel": "Valencia",
  "appLoaded": true,
  "locationResolved": true,
  "trueFeelVisible": true,
  "ledgerVisible": true,
  "togglesRecalculate": true,
  "toggleBefore": { "exposure": "sun", "environment": "urban", "activity": "walking" },
  "toggleAfter": { "exposure": "shade", "environment": "urban", "activity": "walking" },
  "sweatVisible": true,
  "degradedStateAbsent": true,
  "streetContext": true,
  "notes": "Opened outside in Valencia, selected location, changed Sun to Shade, and saw True Feel/ledger update."
}
```

Run:

```bash
npm run verify:street-check
```

This does not replace the physical check. It makes the result auditable after you do it.
