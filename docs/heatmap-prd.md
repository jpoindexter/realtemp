# Scoping PRD — Hyperlocal Thermal Heatmap (card L4)

**Draft 2026-07-07 · status: awaiting Jason's go/no-go.** This closes L4's stated gate ("scope as its own PRD before any code"). No code until this is approved and a data pipeline slice is chosen.

## One-liner

A street-level map layer showing where shade actually is right now, so a walk can be routed through it.

## Why it's plausible (data exists, free)

- **[PNOA-LiDAR 3rd coverage (2022–2025)](https://data.europa.eu/data/datasets/spaignlidar_cob3?locale=en)** — Spain-wide point clouds, ≥5 pts/m², free from IGN; Valencia covered.
- **[Digital Surface Model of Spain](https://datos.gob.es/en/catalogo/e00125901-spaignmds)** — rasterized building + vegetation layers → building/canopy heights without processing raw clouds.
- OSM building footprints + Catastro parcels for geometry cross-reference.

## Approach options (pick one)

1. **Precomputed shade tiles (recommended).** Offline pipeline: DSM → shadow raster per (day-of-year × hour) bucket for Valencia only → static PNG tiles on CDN. No runtime compute, no 3D in the client, works with the existing zero-backend philosophy. Cost: pipeline compute once per season; storage ~GBs. Weakness: one city, fixed buckets.
2. **Client-side shadow casting from a height grid.** Ship a downsampled height raster; compute sun-vector shadows in a worker thread/WebGL. Live for any hour, but heavy client engineering + battery cost on the street.
3. **Buy it** — commercial shade APIs (e.g. shademap-style services). Fastest, recurring cost, dependency.

## v-heatmap-0 done criteria (if approved)

- [ ] One Valencia neighborhood (Ruzafa) renders a shade overlay for the current hour
- [ ] Overlay agrees with reality at 3 spot-checked streets (photo comparison)
- [ ] Tile pipeline reproducible from raw IGN download by one script

## Out of scope

Routing, other cities, real-time cloud cover, tree seasonal foliage, CV from imagery (the PDF-v1.0 framing — LiDAR replaces it).

## Decision needed from Jason

Go/no-go + option pick. Realistic effort (nd-time-blindness): option 1 = 2–4 days pipeline + 1–2 days integration; worst case 2 weeks if IGN tile formats fight back. Paywall/Stripe sequencing is parked, so judge this by street-use value rather than paid-tier packaging.
