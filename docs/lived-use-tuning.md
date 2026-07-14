# Lived-use tuning log (card N2)

N2 cannot be closed from code alone. It needs about two weeks of street use, then a conservative coefficient change in `src/features/formula/constants.ts` with the reason appended to `DECISIONS.md`.

## Local-only log

Create `realtemp-lived-use.json` in the repo root. It is ignored by git because it can include location/time notes.

```json
[
  {
    "date": "2026-07-14",
    "location": "Valencia, Ruzafa",
    "trueFeelC": 38.2,
    "airTempC": 31.4,
    "dewPointC": 21.1,
    "windSpeedMs": 1.8,
    "uvIndex": 8.0,
    "exposure": "sun",
    "environment": "urban",
    "activity": "walking",
    "feltDeltaC": 2,
    "confidence": 4,
    "notes": "Sunlit concrete street felt hotter than the displayed number."
  }
]
```

Field meaning:

- `feltDeltaC`: your perceived difference from RealTemp's displayed True Feel. Positive means the app felt too cool; negative means it felt too hot.
- `confidence`: 1 to 5. Use 1 for a vague impression, 5 for a clear repeated mismatch.
- `exposure`, `environment`, and `activity`: use the exact app toggle values so the tuning target is traceable.

## Ready check

Run:

```bash
npm run verify:lived-use
```

The verifier requires:

- at least 12 observations
- at least 10 distinct observation days
- at least a 14-calendar-day span
- at least 3 different exposure/environment/activity contexts
- at least 8 observations with confidence `>= 3`

When it passes, tune one small coefficient group at a time. Prefer the coefficient that matches the observed pattern:

- sun-specific mismatch -> `UV_TO_PREMIUM` or `SOLAR_PREMIUM_MAX_C`
- humidity mismatch -> Steadman vapor term only with strong evidence
- windy-street mismatch -> `STREET_WIND_FACTOR` or convective activity factor
- urban masonry mismatch -> `URBAN_DELTA_PEAK_C` / `URBAN_DELTA_OFFPEAK_C`
- walking/effort mismatch -> `ACTIVITY_DELTA_C`

After tuning, add a dated `DECISIONS.md` entry with the evidence summary, old value, new value, and rollback note.
