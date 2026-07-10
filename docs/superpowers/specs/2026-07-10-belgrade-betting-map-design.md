# Kladi — Belgrade Betting Exposure Map

**Date:** 2026-07-10
**Status:** Approved (autonomous run — decisions documented in lieu of interactive review)

## Purpose

An interactive map of Belgrade that overlays children's institutions (schools, kindergartens) with gambling venues (kladionice/bookmakers, casinos, slot clubs) to make one point viscerally clear: **kids in Belgrade grow up surrounded by betting shops.** The map is an advocacy/awareness artifact — it should be immediately legible to a non-technical viewer and quotable by journalists ("X% of Belgrade schools have a betting shop within N meters").

## Success criteria

1. A viewer opening the app sees, within 5 seconds and zero interaction, the density of betting venues around schools in Belgrade.
2. A radius control lets the viewer ask "how many schools have a betting venue within N meters?" and see both the number and the affected schools highlighted on the map.
3. Clicking a school shows its name and the nearest betting venues with distances; clicking a venue shows its name/brand.
4. Headline stats are computed from real, refreshable data with a documented provenance.

## Data

**Source: OpenStreetMap via the Overpass API.** Verified coverage on 2026-07-10 for the urban Belgrade bounding box (44.70, 20.25, 44.90, 20.65):

| Layer | OSM tag | Count |
|---|---|---|
| Bookmakers (kladionice) | `shop=bookmaker` | 316 |
| Casinos | `amenity=casino` | 37 |
| Slot clubs | `leisure=adult_gaming_centre` | 26 |
| Schools | `amenity=school` | 274 |
| Kindergartens | `amenity=kindergarten` | 231 |

This is more than sufficient for a truthful, striking visualization. Official registries exist but publish addresses without coordinates, so they are a documented future enhancement (scrape + geocode), not an MVP dependency: the Uprava za igre na sreću eRIS location registry (uis.gov.rs/rsl/spisakplokacije — HTML only, ~2,900–3,000 licensed locations nationally) and the Ministry of Education JSON endpoints (opendata.mpn.gov.rs `/srv/Oo|So|PO/kontaktPodaciJSON` for primary/secondary/preschool). The app must carry a data-provenance note: "Data © OpenStreetMap contributors; venue counts are a lower bound — unmapped venues exist."

**Pipeline:** `scripts/fetch-data.mjs` (plain Node, no framework) queries Overpass for the bbox above, normalizes results (ways → centroid via `out center`), and writes two GeoJSON files committed to the repo:

- `public/data/betting.geojson` — Point features; properties: `id`, `name` (fallback: brand, then generic "Kladionica"/"Kazino"/"Slot klub"), `kind` (`bookmaker` | `casino` | `slots`), `brand?`, `address?`
- `public/data/schools.geojson` — Point features; properties: `id`, `name` (fallback "Škola"/"Vrtić"), `kind` (`school` | `kindergarten`), `address?`

Committing the data makes the app self-contained and reproducible and respects Overpass etiquette (no per-visitor queries). The script is re-runnable to refresh; it retries once on failure and falls back through public mirrors (kumi.systems, maps.mail.ru) — the main endpoint IP-throttles aggressively, observed during research.

**Derived data (computed in the browser at load, not in the pipeline):** for each school, distance to nearest betting venue and the sorted list of venues within 1000 m. At ~500 schools × ~380 venues this is ~190k haversine evaluations — a few milliseconds; no spatial index needed. Keeping it in the client means the radius slider works on live data with no precomputation coupling.

## Legal context (verified 2026-07-10)

Serbia's Law on Games of Chance (Zakon o igrama na sreću, "Sl. glasnik RS" 18/2020, amended 94/2024) prescribes a **200 m minimum distance** between betting shops (Art. 82), slot clubs (Art. 67), and casinos and the buildings of educational institutions — **primary and secondary schools; kindergartens are not covered by the law**. Distance is legally measured as the *shortest safe pedestrian path* (certified by the national geodetic authority), not air distance. Source: paragraf.rs law text (URL stored in `strings.ts`).

Consequences for the app:

- The radius control **defaults to 200 m** — the legal minimum turns the map from "lots of dots" into "here is the law, here is reality."
- Copy must be honest: buffers are **air-distance approximations**. Air distance ≤ walking distance, so a venue within 200 m air-line is a *candidate* proximity case, not a proven violation. The app never uses the word "illegal"; it says "within N m (air distance)."
- Kindergartens are shown (the theme is children's exposure, not just legal compliance) but the stats respect the layer toggles — turn kindergartens off and the headline number is directly comparable to the legal scope.

**Prior art:** a viral January 2025 map by Darko Marković (syncmewithyou.github.io) mapped 467 Belgrade betting shops from registry data, 106 within 200 m school buffers. It validates the concept and gives a sanity band for our numbers (OSM's 379 venues is a consistent lower bound). Our differentiators: live radius control, kindergartens layer, distance histogram, per-school nearest-venue detail, refreshable open pipeline.

## Approaches considered

**A. MapLibre GL JS basemap + native layers + D3 for analysis panel (chosen).**
Real street-level cartography (the story is "the kladionica is across the street from the school gate" — it needs streets), smooth pan/zoom, GPU rendering of ~900 points, popups. D3 does what D3 is best at: the stats panel (histogram of school-to-nearest-venue distances, scales, formatted stats). Free vector tiles from OpenFreeMap (no API key, production use allowed).

**B. Pure D3 SVG map (d3.geoMercator + district GeoJSON + d3.zoom).**
Maximal "D3" purity and artistic control, but no street context without rebuilding a tile engine, and proximity claims lose their punch on an abstract canvas. Rejected.

**C. Leaflet + raster tiles + D3 SVG overlay.**
Workable and familiar, but raster tiles look dated, SVG overlays of ~900 points + circles strain on mobile, and styling control is far weaker than MapLibre's. Rejected.

## Architecture

Vite + React 18 + TypeScript. Dependencies: `maplibre-gl`, `d3` (or the needed d3-* modules), nothing else at runtime. Geo math is hand-written (haversine + destination-point circle polygons — ~30 lines total; a turf dependency is not warranted).

```
scripts/fetch-data.mjs        # Overpass → public/data/*.geojson (committed)
public/data/betting.geojson
public/data/schools.geojson
src/
  main.tsx, App.tsx           # layout: full-viewport map, overlay sidebar panel
  components/
    MapView.tsx               # MapLibre init, sources/layers, popups, radius circles
    Sidebar.tsx               # title, narrative, headline stats, controls, histogram
    RadiusControl.tsx         # slider 100–1000 m, default = legal minimum (200 m)
    LayerToggles.tsx          # betting kinds on/off, schools/kindergartens on/off
    DistanceHistogram.tsx     # D3 histogram: distance from each school to nearest venue
  lib/
    geo.ts                    # haversine, circlePolygon(center, radiusM), pure functions
    exposure.ts               # computeExposure(schools, venues, radiusM) → per-school results + aggregates
    data.ts                   # load + parse GeoJSON, normalize into typed records
    strings.ts                # all user-facing copy in one place (translation-ready)
```

**State:** plain React state in `App` (radius, layer visibility, selected feature). Derived exposure results via `useMemo` over (data, radius). No state library.

**Data flow:** `data.ts` loads both GeoJSON files → `App` holds them → `exposure.ts` computes per-school nearest-venue distance + "exposed at current radius" flag → `MapView` renders venues (colored by kind), schools (visual state: exposed = hot/highlighted, safe = muted), and translucent radius circles around betting venues → `Sidebar` shows aggregates ("N of M schools (P%) have a betting venue within R m") and the D3 histogram with a reference line at the legal minimum. **Aggregates and histogram are computed over the currently visible kinds only** (toggle kindergartens off → numbers match the law's scope; toggle a venue kind off → it drops out of distance calculations too).

**Map design:** dark basemap (OpenFreeMap dark style; fallback: positron with muted paint overrides). Betting venues in hot red/orange; schools in cool cyan/white; exposed schools visually "lit up." Radius circles as barely-translucent red fills so overlapping venue buffers accumulate into visible "red zones." The emotional read of the map is the product — this styling is in scope, not polish.

**Popups:** school click → name, kind, nearest 3 venues with distances in meters. Venue click → name/brand, kind. Hover states on both.

## Error handling

- Data files fail to load → full-screen error card with retry (no blank map).
- Missing `name` → fallback labels from the pipeline (never "undefined" in a popup).
- Fetch script: exits nonzero with a clear message on Overpass failure after retry + mirror fallback; never writes partial/empty GeoJSON over good committed data (writes to temp, validates feature counts > 0, then moves).
- WebGL unavailable → plain-text message with the headline stats (computed anyway) so the page still says something.

## Testing

Vitest, targeting the pure logic where correctness actually matters:

- `geo.ts`: haversine against known city-pair distances (±0.5%), circle polygon radius/closure invariants.
- `exposure.ts`: synthetic fixtures — school with venue at 150 m is exposed at 200 m and not at 100 m; aggregates count correctly; nearest-venue sorting.
- `fetch-data.mjs` normalization: node + way-with-center Overpass fixtures → expected GeoJSON properties and fallback names.

Map rendering verified by driving the running app in a browser (dev-time verification, not unit tests).

## Out of scope (explicit)

- Official-registry ingestion + geocoding (future enhancement).
- Deployment/hosting (runs via `vite dev` / `vite build`; hosting is a later decision).
- Walking-distance isochrones (straight-line distance only; the law's measurement method will be noted in copy).
- i18n toggle — but all copy lives in `strings.ts` so a Serbian translation is a single-file change.
