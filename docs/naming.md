# Naming research — 2026-07-07; refreshed 2026-07-14 (card N7)

**Recommendation:** **StreetFeel** with `streetfeel.app`. It says the differentiator directly: street-level human feel, not station temperature. It also keeps more distance from RealFeel than TrueFeel does.

**Important boundary:** this is product/name research, not legal advice or completed trademark clearance. Before public launch, run formal exact + similar mark searches in Nice classes 9 and 42 and make the final taste/purchase decision.

## Current evidence

- `npm run verify:naming` checks the candidate domains through RDAP. On 2026-07-14, `streetfeel.app` returned `404` from Google Registry RDAP via `rdap.org`, meaning no registry record was found. That supports domain availability, but it is not a purchase guarantee.
- Vercel `domains inspect streetfeel.app` currently reports only that the domain is not owned under the Vercel team. It is not used as availability evidence.
- Official trademark clearance still needs manual searching in EUIPO/TMview, USPTO, and WIPO.

## Candidates

| Name | Domain | $/yr | Collision scan | Read |
|---|---|---|---|---|
| **StreetFeel** | streetfeel.app | ~10 | RDAP 404 on 2026-07-14; formal trademark search still required | Says the differentiator (street, not station). **Recommended.** |
| StreetTemp | streettemp.app | ~10 | RDAP 404 on 2026-07-14; formal trademark search still required | More literal, less feel |
| TrueFeel | truefeel.app | ~10 | RDAP 404 on 2026-07-14, but one word from RealFeel — same-category confusability risk | Risky |
| RealTemp | realtemp.app | ~10 | RDAP 404 on 2026-07-14; [TechPowerUp Real Temp](https://www.techpowerup.com/realtemp/) creates software-name adjacency | Keep as codename only |
| SunFeel | sunfeel.app | ~10 | RDAP 404 on 2026-07-14; formal trademark search still required | Undersells (sun is one premium of five) |
| FeltDegrees | feltdegrees.com | ~12 | RDAP checked by verifier; formal trademark search still required | Quirkier, .com |

## Official clearance checklist

1. Search exact and similar names: `StreetFeel`, `Street Feel`, `StreetTemp`, `TrueFeel`, `RealTemp`, `SunFeel`, `FeltDegrees`.
2. Check Nice classes 9 and 42 for mobile/weather/software use.
3. Use official search systems:
   - EUIPO trade mark availability guidance: https://www.euipo.europa.eu/en/trade-marks/before-applying/availability
   - TMview: https://www.euipn.org/bg/tools/TMview
   - USPTO trademark search: https://www.uspto.gov/trademarks/search
   - WIPO Global Brand Database: https://www.wipo.int/en/web/global-brand-database
4. If any similar weather/mobile/software mark appears, do not ship the public name without counsel.

## Gated on Jason (not researchable/purchasable by me)

- Formal trademark clearance before public launch
- Domain purchase (~$10) — purchaseUrl per row via vercel.com/domains
- Final taste call

Run:

```bash
npm run verify:naming
```

Sources: [EUIPO availability](https://www.euipo.europa.eu/en/trade-marks/before-applying/availability) · [TMview](https://www.euipn.org/bg/tools/TMview) · [USPTO trademark search](https://www.uspto.gov/trademarks/search) · [WIPO Global Brand Database](https://www.wipo.int/en/web/global-brand-database) · [TechPowerUp Real Temp](https://www.techpowerup.com/realtemp/)
