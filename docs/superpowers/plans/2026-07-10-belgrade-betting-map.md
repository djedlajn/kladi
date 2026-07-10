# Belgrade Betting Exposure Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive dark-themed map of Belgrade overlaying schools/kindergartens with betting venues (kladionice, casinos, slot clubs), with a live exposure-radius control, headline stats, and a D3 distance histogram.

**Architecture:** Vite + React 18 + TypeScript SPA. MapLibre GL renders the basemap (OpenFreeMap dark style) and all geographic layers from GeoJSON sources; D3 (d3-array/d3-scale) powers the sidebar histogram rendered as React SVG. A standalone Node script fetches OSM data via Overpass into committed GeoJSON. All geo math is hand-written (haversine, circle polygons) — no turf.

**Tech Stack:** react, react-dom, maplibre-gl, d3-array, d3-scale; vite, typescript, vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-belgrade-betting-map-design.md` (read it first).

## Global Constraints

- Node ≥ 20. Package manager: npm. No dependencies beyond those listed in Task 1.
- **Never add Co-Authored-By / any AI attribution to commits.** Plain conventional-commit messages.
- All user-facing copy lives in `src/lib/strings.ts` — components never hard-code English strings.
- Legal constant: **200 m** (Zakon o igrama na sreću, "Sl. glasnik RS" 18/2020, 94/2024). The app NEVER says "illegal"; always "within N m (air distance)".
- Colors (validated palette, use these exact hexes via CSS vars / constants): bookmaker `#e66767`, casino `#d95926`, slots `#d55181`, school `#3987e5`, kindergarten `#199e70`; surfaces: page `#0d0d0d`, panel `#11151c`; ink: primary `#ffffff`, secondary `#c3c2b7`, muted `#898781`; gridline `#2c2c2a`; baseline `#383835`.
- Charts: bars ≤ 24px thick, 4px rounded top (square baseline), 2px surface gaps between bars, hairline solid gridlines, text always in ink colors (never series colors).
- Belgrade bbox for all Overpass queries: `(44.70, 20.25, 44.90, 20.65)`.
- Map defaults: center `[20.457, 44.81]`, zoom `12`, style `https://tiles.openfreemap.org/styles/dark`.
- OSM names are untrusted input — HTML-escape anything interpolated into popup HTML.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: a running Vite dev server and passing `npm run build`; `src/styles.css` with the CSS custom properties later tasks reference (`--c-bookmaker` etc.).

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "kladi",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "fetch-data": "node scripts/fetch-data.mjs"
  },
  "dependencies": {
    "d3-array": "^3.2.4",
    "d3-scale": "^4.0.2",
    "maplibre-gl": "^5.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/d3-array": "^3.2.1",
    "@types/d3-scale": "^4.0.8",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": false
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kladi — Betting shops around Belgrade's schools</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 2: Write minimal app shell**

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/App.tsx` (placeholder, replaced in Task 7):
```tsx
export default function App() {
  return <div className="app-loading">Loading…</div>
}
```

`src/styles.css` (design tokens + skeleton; later tasks append component styles but MUST NOT change these tokens):
```css
:root {
  --page: #0d0d0d;
  --panel: #11151c;
  --panel-border: rgba(255, 255, 255, 0.1);
  --ink: #ffffff;
  --ink-2: #c3c2b7;
  --ink-muted: #898781;
  --grid: #2c2c2a;
  --baseline: #383835;
  --c-bookmaker: #e66767;
  --c-casino: #d95926;
  --c-slots: #d55181;
  --c-school: #3987e5;
  --c-kindergarten: #199e70;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; background: var(--page); color: var(--ink); }

.app-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
}
```

- [ ] **Step 3: Install and verify**

Run: `npm install`
Expected: completes without errors (warnings OK).

Run: `npm run build`
Expected: `tsc -b` passes and Vite writes `dist/` ("✓ built in …").

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html .gitignore src
git commit -m "feat: scaffold Vite + React + TS project"
```

---

### Task 2: Geo math (`src/lib/geo.ts`)

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

**Interfaces:**
- Produces:
  - `type LonLat = [number, number]` (longitude, latitude — GeoJSON order)
  - `haversineMeters(a: LonLat, b: LonLat): number`
  - `circlePolygon(center: LonLat, radiusM: number, segments?: number): LonLat[]` — closed ring (first === last, `segments + 1` points)

- [ ] **Step 1: Write the failing test**

`src/lib/geo.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { haversineMeters, circlePolygon } from './geo'

describe('haversineMeters', () => {
  it('computes 1 degree of longitude at the equator', () => {
    // mean Earth radius 6371km → 1° arc = 111194.9m
    expect(haversineMeters([0, 0], [1, 0])).toBeCloseTo(111194.9, 0)
  })

  it('computes 1 degree of latitude anywhere', () => {
    expect(haversineMeters([20.45, 44.8], [20.45, 45.8])).toBeCloseTo(111194.9, 0)
  })

  it('is symmetric and zero for identical points', () => {
    const a: [number, number] = [20.4489, 44.7866]
    const b: [number, number] = [20.4651, 44.8125]
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6)
    expect(haversineMeters(a, a)).toBe(0)
  })
})

describe('circlePolygon', () => {
  it('returns a closed ring of segments+1 points, all at the given radius', () => {
    const center: [number, number] = [20.457, 44.81]
    const ring = circlePolygon(center, 200, 48)
    expect(ring).toHaveLength(49)
    expect(ring[0]).toEqual(ring[48])
    for (const p of ring.slice(0, 48)) {
      expect(haversineMeters(center, p)).toBeCloseTo(200, 0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: FAIL — cannot resolve `./geo`.

- [ ] **Step 3: Implement**

`src/lib/geo.ts`:
```ts
export type LonLat = [number, number]

const R = 6371000 // mean Earth radius, meters
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function haversineMeters(a: LonLat, b: LonLat): number {
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Closed ring approximating a geodesic circle (first point === last point). */
export function circlePolygon(center: LonLat, radiusM: number, segments = 48): LonLat[] {
  const [lon, lat] = center
  const latR = rad(lat)
  const dR = radiusM / R // angular distance
  const ring: LonLat[] = []
  for (let i = 0; i < segments; i++) {
    const bearing = (2 * Math.PI * i) / segments
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(dR) + Math.cos(latR) * Math.sin(dR) * Math.cos(bearing),
    )
    const lon2 =
      rad(lon) +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dR) * Math.cos(latR),
        Math.cos(dR) - Math.sin(latR) * Math.sin(lat2),
      )
    ring.push([deg(lon2), deg(lat2)])
  }
  ring.push([...ring[0]] as LonLat)
  return ring
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat: haversine and geodesic circle helpers"
```

---

### Task 3: Exposure model (`src/lib/exposure.ts`)

**Files:**
- Create: `src/lib/exposure.ts`
- Test: `src/lib/exposure.test.ts`

**Interfaces:**
- Consumes: `haversineMeters` from `./geo`.
- Produces (used by Tasks 5–8 — exact shapes):

```ts
export type VenueKind = 'bookmaker' | 'casino' | 'slots'
export type SchoolKind = 'school' | 'kindergarten'
export type Kind = VenueKind | SchoolKind

export interface Venue { id: string; name: string; kind: VenueKind; lon: number; lat: number; address?: string }
export interface School { id: string; name: string; kind: SchoolKind; lon: number; lat: number; address?: string }

export interface SchoolDistance {
  school: School
  /** venues within nearbyCutoffM, sorted by distance ascending */
  nearby: { venue: Venue; distanceM: number }[]
  /** distance to nearest venue overall; Infinity when there are no venues */
  nearestDistanceM: number
}

export interface ExposureSummary {
  total: number
  exposedCount: number
  /** 0–100, rounded to integer; 0 when total is 0 */
  exposedPct: number
  /** median of nearestDistanceM; Infinity if no venues; NaN if no schools */
  medianNearestM: number
}

export function computeSchoolDistances(schools: School[], venues: Venue[], nearbyCutoffM?: number): SchoolDistance[] // default cutoff 1500
export function summarizeExposure(distances: SchoolDistance[], radiusM: number): ExposureSummary
```

- [ ] **Step 1: Write the failing test**

`src/lib/exposure.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeSchoolDistances, summarizeExposure } from './exposure'
import type { School, Venue } from './exposure'

// ~150m east of school at lat 44.8: 1° lon = 111194.9 * cos(44.8°) = 78911m
const LON_PER_M = 1 / 78911

const school = (id: string, lon = 20.45, lat = 44.8): School => ({
  id, name: `OŠ ${id}`, kind: 'school', lon, lat,
})
const venueAt = (id: string, meters: number, base = 20.45): Venue => ({
  id, name: `K ${id}`, kind: 'bookmaker', lon: base + meters * LON_PER_M, lat: 44.8,
})

describe('computeSchoolDistances', () => {
  it('finds nearest venue and sorts nearby ascending', () => {
    const schools = [school('a')]
    const venues = [venueAt('far', 900), venueAt('near', 150), venueAt('mid', 400)]
    const [d] = computeSchoolDistances(schools, venues)
    expect(d.nearestDistanceM).toBeCloseTo(150, -1) // within ±5m
    expect(d.nearby.map((n) => n.venue.id)).toEqual(['near', 'mid', 'far'])
  })

  it('excludes venues beyond the cutoff from nearby but keeps true nearest', () => {
    const [d] = computeSchoolDistances([school('a')], [venueAt('v', 2000)], 1500)
    expect(d.nearby).toHaveLength(0)
    expect(d.nearestDistanceM).toBeCloseTo(2000, -1)
  })

  it('handles zero venues', () => {
    const [d] = computeSchoolDistances([school('a')], [])
    expect(d.nearby).toHaveLength(0)
    expect(d.nearestDistanceM).toBe(Infinity)
  })
})

describe('summarizeExposure', () => {
  it('counts schools exposed at the radius (inclusive)', () => {
    const distances = computeSchoolDistances(
      [school('a'), school('b', 20.48), school('c', 20.51)],
      [venueAt('v1', 150), venueAt('v2', 150, 20.48)], // c has nearest ~2367m+
    )
    const at200 = summarizeExposure(distances, 200)
    expect(at200.total).toBe(3)
    expect(at200.exposedCount).toBe(2)
    expect(at200.exposedPct).toBe(67)
    const at100 = summarizeExposure(distances, 100)
    expect(at100.exposedCount).toBe(0)
  })

  it('computes the median nearest distance', () => {
    const distances = computeSchoolDistances(
      [school('a'), school('b', 20.48), school('c', 20.51)],
      [venueAt('v1', 100), venueAt('v2', 300, 20.48), venueAt('v3', 500, 20.51)],
    )
    expect(summarizeExposure(distances, 200).medianNearestM).toBeCloseTo(300, -1)
  })

  it('handles empty inputs', () => {
    const s = summarizeExposure([], 200)
    expect(s.total).toBe(0)
    expect(s.exposedCount).toBe(0)
    expect(s.exposedPct).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/exposure.test.ts`
Expected: FAIL — cannot resolve `./exposure`.

- [ ] **Step 3: Implement**

`src/lib/exposure.ts`:
```ts
import { haversineMeters } from './geo'

export type VenueKind = 'bookmaker' | 'casino' | 'slots'
export type SchoolKind = 'school' | 'kindergarten'
export type Kind = VenueKind | SchoolKind

export interface Venue {
  id: string
  name: string
  kind: VenueKind
  lon: number
  lat: number
  address?: string
}

export interface School {
  id: string
  name: string
  kind: SchoolKind
  lon: number
  lat: number
  address?: string
}

export interface SchoolDistance {
  school: School
  nearby: { venue: Venue; distanceM: number }[]
  nearestDistanceM: number
}

export interface ExposureSummary {
  total: number
  exposedCount: number
  exposedPct: number
  medianNearestM: number
}

export function computeSchoolDistances(
  schools: School[],
  venues: Venue[],
  nearbyCutoffM = 1500,
): SchoolDistance[] {
  return schools.map((school) => {
    const nearby: { venue: Venue; distanceM: number }[] = []
    let nearestDistanceM = Infinity
    for (const venue of venues) {
      const distanceM = haversineMeters([school.lon, school.lat], [venue.lon, venue.lat])
      if (distanceM < nearestDistanceM) nearestDistanceM = distanceM
      if (distanceM <= nearbyCutoffM) nearby.push({ venue, distanceM })
    }
    nearby.sort((a, b) => a.distanceM - b.distanceM)
    return { school, nearby, nearestDistanceM }
  })
}

export function summarizeExposure(
  distances: SchoolDistance[],
  radiusM: number,
): ExposureSummary {
  const total = distances.length
  const exposedCount = distances.filter((d) => d.nearestDistanceM <= radiusM).length
  const sorted = distances.map((d) => d.nearestDistanceM).sort((a, b) => a - b)
  const mid = Math.floor(total / 2)
  const medianNearestM =
    total === 0 ? NaN : total % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return {
    total,
    exposedCount,
    exposedPct: total === 0 ? 0 : Math.round((exposedCount / total) * 100),
    medianNearestM,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/exposure.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/exposure.ts src/lib/exposure.test.ts
git commit -m "feat: school-to-venue distance and exposure summary model"
```

---

### Task 4: Data pipeline (Overpass → GeoJSON)

**Files:**
- Create: `scripts/normalize.mjs` (pure, testable), `scripts/fetch-data.mjs` (I/O wrapper)
- Test: `scripts/normalize.test.mjs`
- Output (committed): `public/data/betting.geojson`, `public/data/schools.geojson`

**Interfaces:**
- Produces GeoJSON consumed by Task 5. Every feature: `Point` geometry `[lon, lat]`; properties `{ id: string, name: string, kind: 'bookmaker'|'casino'|'slots'|'school'|'kindergarten', address?: string }`.
- `normalize.mjs` exports `normalizeElements(elements): Feature[]` (raw Overpass elements → GeoJSON features, with kind mapping, name fallbacks, dedup) and `FALLBACK_NAMES`.

- [ ] **Step 1: Write the failing test**

`scripts/normalize.test.mjs` (vitest picks up `.test.mjs` — plain JS, no types):
```js
import { describe, it, expect } from 'vitest'
import { normalizeElements } from './normalize.mjs'

const node = (id, tags, lon = 20.45, lat = 44.8) => ({ type: 'node', id, lon, lat, tags })

describe('normalizeElements', () => {
  it('maps OSM tags to kinds and reads node coordinates', () => {
    const feats = normalizeElements([
      node(1, { shop: 'bookmaker', name: 'Mozzart' }),
      node(2, { amenity: 'casino', name: 'Grand' }),
      node(3, { leisure: 'adult_gaming_centre', name: 'Slot' }),
      node(4, { amenity: 'school', name: 'OŠ Test' }),
      node(5, { amenity: 'kindergarten', name: 'Vrtić Test' }),
    ])
    expect(feats.map((f) => f.properties.kind)).toEqual([
      'bookmaker', 'casino', 'slots', 'school', 'kindergarten',
    ])
    expect(feats[0].geometry).toEqual({ type: 'Point', coordinates: [20.45, 44.8] })
  })

  it('uses center for ways, skips elements without coordinates', () => {
    const feats = normalizeElements([
      { type: 'way', id: 10, center: { lon: 20.5, lat: 44.82 }, tags: { amenity: 'school', name: 'OŠ W' } },
      { type: 'way', id: 11, tags: { amenity: 'school', name: 'OŠ broken' } },
    ])
    expect(feats).toHaveLength(1)
    expect(feats[0].geometry.coordinates).toEqual([20.5, 44.82])
    expect(feats[0].properties.id).toBe('way/10')
  })

  it('falls back name → brand → operator → generic label', () => {
    const feats = normalizeElements([
      node(1, { shop: 'bookmaker', brand: 'MaxBet' }),
      node(2, { shop: 'bookmaker', operator: 'Balkan Bet doo' }),
      node(3, { shop: 'bookmaker' }),
    ])
    expect(feats.map((f) => f.properties.name)).toEqual(['MaxBet', 'Balkan Bet doo', 'Kladionica'])
  })

  it('builds address from addr tags when present', () => {
    const [f] = normalizeElements([
      node(1, { shop: 'bookmaker', name: 'X', 'addr:street': 'Makedonska', 'addr:housenumber': '21' }),
    ])
    expect(f.properties.address).toBe('Makedonska 21')
  })

  it('dedupes same-name same-kind features within 100m, keeps distant/unnamed ones', () => {
    const feats = normalizeElements([
      node(1, { shop: 'bookmaker', name: 'Mozzart' }, 20.45, 44.8),
      node(2, { shop: 'bookmaker', name: 'mozzart ' }, 20.4501, 44.8), // ~8m away
      node(3, { shop: 'bookmaker', name: 'Mozzart' }, 20.46, 44.8), // ~790m away
      node(4, { shop: 'bookmaker' }, 20.45, 44.8),
      node(5, { shop: 'bookmaker' }, 20.4501, 44.8), // unnamed: never deduped
    ])
    expect(feats).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/normalize.test.mjs`
Expected: FAIL — cannot resolve `./normalize.mjs`.

- [ ] **Step 3: Implement normalize.mjs**

`scripts/normalize.mjs`:
```js
// Pure normalization of Overpass elements → GeoJSON features.
// Kept dependency-free and separate from I/O so it can be unit-tested.

export const FALLBACK_NAMES = {
  bookmaker: 'Kladionica',
  casino: 'Kazino',
  slots: 'Slot klub',
  school: 'Škola',
  kindergarten: 'Vrtić',
}

function kindOf(tags) {
  if (tags.shop === 'bookmaker') return 'bookmaker'
  if (tags.amenity === 'casino') return 'casino'
  if (tags.leisure === 'adult_gaming_centre') return 'slots'
  if (tags.amenity === 'school') return 'school'
  if (tags.amenity === 'kindergarten') return 'kindergarten'
  return null
}

// duplicated from src/lib/geo.ts — scripts stay plain JS with no build step
function haversineMeters(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b[1] - a[1])
  const dLon = rad(b[0] - a[0])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(s))
}

export function normalizeElements(elements) {
  const features = []
  // named features seen so far, for dedup: key = `${kind}|${normalized name}`
  const seen = new Map() // key -> [ [lon,lat], ... ]

  for (const el of elements) {
    const tags = el.tags ?? {}
    const kind = kindOf(tags)
    if (!kind) continue

    const lon = el.type === 'node' ? el.lon : el.center?.lon
    const lat = el.type === 'node' ? el.lat : el.center?.lat
    if (lon == null || lat == null) continue

    const rawName = tags.name ?? tags.brand ?? tags.operator
    const name = rawName ?? FALLBACK_NAMES[kind]

    if (rawName) {
      const key = `${kind}|${rawName.toLowerCase().replace(/\s+/g, ' ').trim()}`
      const positions = seen.get(key) ?? []
      if (positions.some((p) => haversineMeters(p, [lon, lat]) < 100)) continue
      positions.push([lon, lat])
      seen.set(key, positions)
    }

    const address =
      tags['addr:street'] &&
      [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        id: `${el.type}/${el.id}`,
        name,
        kind,
        ...(address ? { address } : {}),
      },
    })
  }
  return features
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/normalize.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement the fetch script**

`scripts/fetch-data.mjs`:
```js
import { writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { normalizeElements } from './normalize.mjs'

const BBOX = '44.70,20.25,44.90,20.65'
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const QUERIES = {
  betting: `[out:json][timeout:180];
(
  nwr["shop"="bookmaker"](${BBOX});
  nwr["amenity"="casino"](${BBOX});
  nwr["leisure"="adult_gaming_centre"](${BBOX});
);
out center;`,
  schools: `[out:json][timeout:180];
(
  nwr["amenity"="school"](${BBOX});
  nwr["amenity"="kindergarten"](${BBOX});
);
out center;`,
}

// refuse to overwrite good committed data with a truncated response
const MIN_FEATURES = { betting: 200, schools: 300 }

async function overpass(query) {
  let lastError
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
      })
      if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}`)
      return (await res.json()).elements
    } catch (err) {
      lastError = err
      console.warn(`warn: ${err.message ?? err}; trying next endpoint`)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
  throw lastError
}

mkdirSync('public/data', { recursive: true })

for (const [dataset, query] of Object.entries(QUERIES)) {
  console.log(`fetching ${dataset}…`)
  const elements = await overpass(query)
  const features = normalizeElements(elements)
  if (features.length < MIN_FEATURES[dataset]) {
    console.error(
      `error: ${dataset} returned only ${features.length} features (< ${MIN_FEATURES[dataset]}); not writing`,
    )
    process.exit(1)
  }
  const byKind = {}
  for (const f of features) byKind[f.properties.kind] = (byKind[f.properties.kind] ?? 0) + 1
  console.log(`  ${features.length} features:`, byKind)
  const path = `public/data/${dataset}.geojson`
  writeFileSync(`${path}.tmp`, JSON.stringify({ type: 'FeatureCollection', features }))
  renameSync(`${path}.tmp`, path)
  console.log(`  wrote ${path}`)
}
```

- [ ] **Step 6: Run the pipeline for real**

Run: `npm run fetch-data`
Expected: both datasets fetched; counts printed per kind — betting total in the 300–450 range, schools total in the 400–550 range (per spec's verified counts; registry-based prior art suggests OSM is a lower bound, so exact numbers will drift). If the primary endpoint throttles (observed: HTTP 406/429), the mirror kicks in automatically. If both fail, wait 60s and retry once before investigating.

Run: `node -e "const d=require('./public/data/betting.geojson'); console.log(d.features.length, d.features[0])"`
Expected: a feature count and a well-formed first feature with `id`, `name`, `kind`.

- [ ] **Step 7: Run full test suite**

Run: `npm test`
Expected: all tests pass (geo, exposure, normalize).

- [ ] **Step 8: Commit (including data)**

```bash
git add scripts public/data
git commit -m "feat: Overpass data pipeline and Belgrade betting/schools GeoJSON"
```

---

### Task 5: Data loading + copy (`src/lib/data.ts`, `src/lib/strings.ts`)

**Files:**
- Create: `src/lib/data.ts`, `src/lib/strings.ts`
- Test: `src/lib/data.test.ts`

**Interfaces:**
- Consumes: `Venue`, `School` types from `./exposure`.
- Produces:
  - `loadData(): Promise<{ venues: Venue[]; schools: School[] }>` — fetches both GeoJSON files, throws `Error` with a human message on any failure
  - `parseVenues(geojson: unknown): Venue[]`, `parseSchools(geojson: unknown): School[]` (exported for tests)
  - `strings.ts`: `STRINGS` object + `LEGAL_MIN_M = 200`, `LAW_URL`, `KIND_LABELS: Record<Kind, string>`, `KIND_COLORS: Record<Kind, string>` (exact hexes from Global Constraints)

- [ ] **Step 1: Write the failing test**

`src/lib/data.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseVenues, parseSchools } from './data'

const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features })
const feat = (kind: string, name = 'X') => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [20.45, 44.8] },
  properties: { id: `node/1`, name, kind },
})

describe('parseVenues', () => {
  it('parses valid features and drops unknown kinds', () => {
    const venues = parseVenues(fc([feat('bookmaker'), feat('casino'), feat('school')]))
    expect(venues).toHaveLength(2)
    expect(venues[0]).toMatchObject({ kind: 'bookmaker', lon: 20.45, lat: 44.8, name: 'X' })
  })

  it('throws on malformed input', () => {
    expect(() => parseVenues({ nope: true })).toThrow()
  })
})

describe('parseSchools', () => {
  it('parses schools and kindergartens only', () => {
    const schools = parseSchools(fc([feat('school'), feat('kindergarten'), feat('bookmaker')]))
    expect(schools.map((s) => s.kind)).toEqual(['school', 'kindergarten'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data.test.ts`
Expected: FAIL — cannot resolve `./data`.

- [ ] **Step 3: Implement data.ts**

`src/lib/data.ts`:
```ts
import type { School, SchoolKind, Venue, VenueKind } from './exposure'

const VENUE_KINDS = new Set<VenueKind>(['bookmaker', 'casino', 'slots'])
const SCHOOL_KINDS = new Set<SchoolKind>(['school', 'kindergarten'])

interface RawFeature {
  geometry?: { type?: string; coordinates?: unknown }
  properties?: { id?: unknown; name?: unknown; kind?: unknown; address?: unknown }
}

function parsePoints(geojson: unknown, kinds: Set<string>) {
  const features = (geojson as { features?: RawFeature[] })?.features
  if (!Array.isArray(features)) throw new Error('Malformed GeoJSON: no features array')
  const out = []
  for (const f of features) {
    const kind = f.properties?.kind
    const coords = f.geometry?.coordinates
    if (typeof kind !== 'string' || !kinds.has(kind)) continue
    if (!Array.isArray(coords) || typeof coords[0] !== 'number' || typeof coords[1] !== 'number')
      continue
    out.push({
      id: String(f.properties?.id ?? ''),
      name: String(f.properties?.name ?? ''),
      kind,
      lon: coords[0],
      lat: coords[1],
      ...(typeof f.properties?.address === 'string' ? { address: f.properties.address } : {}),
    })
  }
  return out
}

export function parseVenues(geojson: unknown): Venue[] {
  return parsePoints(geojson, VENUE_KINDS) as Venue[]
}

export function parseSchools(geojson: unknown): School[] {
  return parsePoints(geojson, SCHOOL_KINDS) as School[]
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`)
  return res.json()
}

export async function loadData(): Promise<{ venues: Venue[]; schools: School[] }> {
  const [betting, schools] = await Promise.all([
    fetchJson('data/betting.geojson'),
    fetchJson('data/schools.geojson'),
  ])
  return { venues: parseVenues(betting), schools: parseSchools(schools) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write strings.ts**

`src/lib/strings.ts`:
```ts
import type { Kind } from './exposure'

export const LEGAL_MIN_M = 200
export const LAW_URL = 'https://www.paragraf.rs/propisi/zakon_o_igrama_na_srecu.html'

export const KIND_LABELS: Record<Kind, string> = {
  bookmaker: 'Betting shops (kladionice)',
  casino: 'Casinos',
  slots: 'Slot clubs',
  school: 'Schools',
  kindergarten: 'Kindergartens',
}

export const KIND_COLORS: Record<Kind, string> = {
  bookmaker: '#e66767',
  casino: '#d95926',
  slots: '#d55181',
  school: '#3987e5',
  kindergarten: '#199e70',
}

export const STRINGS = {
  title: 'Klađenje pored škole',
  subtitle: 'Betting shops around Belgrade’s schools',
  intro:
    'Serbian law requires betting venues to keep a 200 m distance from primary and secondary schools. This map shows every mapped betting venue and school in Belgrade — and how close they really are.',
  legalNote:
    'The law (Zakon o igrama na sreću, 18/2020 & 94/2024) measures the shortest safe pedestrian path and does not cover kindergartens. Distances here are straight-line (air) approximations — proximity shown is a signal, not a legal finding.',
  heroLabel: (radiusM: number) =>
    `of visible schools & kindergartens have a betting venue within ${radiusM} m (air distance)`,
  exposedTile: 'Exposed institutions',
  medianTile: 'Median distance to nearest venue',
  venuesTile: 'Betting venues shown',
  radiusLabel: 'Exposure radius',
  radiusLegalTag: (m: number) => `${m} m = legal minimum for schools`,
  histogramTitle: 'How far is the nearest betting venue?',
  histogramSubtitle: 'Number of visible institutions by distance to nearest visible venue',
  legalLineLabel: 'law: 200 m',
  overflowBinLabel: '1 km+',
  layersTitle: 'On the map',
  nearestHeading: 'Nearest betting venues:',
  noneNearby: 'No mapped venue within 1 km.',
  provenance:
    'Data © OpenStreetMap contributors (Overpass API). Venue counts are a lower bound — unmapped venues exist.',
  lawLinkText: 'Law text (paragraf.rs)',
  loading: 'Loading map data…',
  dataError: 'Could not load map data.',
  retry: 'Retry',
  noWebgl:
    'Your browser cannot show the interactive map (WebGL unavailable). The numbers still tell the story:',
} as const
```

- [ ] **Step 6: Verify build & tests**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds (strings module compiles; nothing imports it yet — `noUnusedLocals` applies to locals, not exports, so this is fine).

- [ ] **Step 7: Commit**

```bash
git add src/lib/data.ts src/lib/data.test.ts src/lib/strings.ts
git commit -m "feat: GeoJSON loading, parsing and centralized copy"
```

---

### Task 6: Map component (`src/components/MapView.tsx`)

**Files:**
- Create: `src/components/MapView.tsx`
- Modify: `src/styles.css` (append map + popup styles)

**Interfaces:**
- Consumes: `Venue`, `SchoolDistance`, `VenueKind` from `../lib/exposure`; `circlePolygon` from `../lib/geo`; `KIND_COLORS`, `KIND_LABELS`, `STRINGS` from `../lib/strings`.
- Produces: `MapView` React component:

```tsx
interface MapViewProps {
  venues: Venue[]            // already filtered to visible kinds
  distances: SchoolDistance[] // visible schools with nearby lists
  radiusM: number
}
```

No unit tests (imperative WebGL component) — verified in Task 8's browser pass. TypeScript must compile.

- [ ] **Step 1: Implement MapView**

`src/components/MapView.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SchoolDistance, Venue } from '../lib/exposure'
import { circlePolygon } from '../lib/geo'
import { KIND_COLORS, KIND_LABELS, STRINGS } from '../lib/strings'

interface MapViewProps {
  venues: Venue[]
  distances: SchoolDistance[]
  radiusM: number
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function venuesFC(venues: Venue[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      properties: { id: v.id, name: v.name, kind: v.kind, address: v.address ?? '' },
    })),
  }
}

function schoolsFC(distances: SchoolDistance[], radiusM: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: distances.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.school.lon, d.school.lat] },
      properties: {
        id: d.school.id,
        name: d.school.name,
        kind: d.school.kind,
        exposed: d.nearestDistanceM <= radiusM,
        // popup payload: nearest 3 venues, pre-rendered as safe HTML
        nearbyHtml: d.nearby.length
          ? d.nearby
              .slice(0, 3)
              .map((n) => `<li>${esc(n.venue.name)} — ${Math.round(n.distanceM)} m</li>`)
              .join('')
          : '',
      },
    })),
  }
}

function buffersFC(venues: Venue[], radiusM: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circlePolygon([v.lon, v.lat], radiusM)] },
      properties: {},
    })),
  }
}

export default function MapView({ venues, distances, radiusM }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const loadedRef = useRef(false)
  // latest data for the load handler (props may change before style loads)
  const dataRef = useRef({ venues, distances, radiusM })
  dataRef.current = { venues, distances, radiusM }

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [20.457, 44.81],
      zoom: 12,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      const { venues, distances, radiusM } = dataRef.current
      map.addSource('buffers', { type: 'geojson', data: buffersFC(venues, radiusM) })
      map.addSource('venues', { type: 'geojson', data: venuesFC(venues) })
      map.addSource('schools', { type: 'geojson', data: schoolsFC(distances, radiusM) })

      map.addLayer({
        id: 'buffers-fill',
        type: 'fill',
        source: 'buffers',
        paint: { 'fill-color': '#e66767', 'fill-opacity': 0.07 },
      })
      map.addLayer({
        id: 'buffers-line',
        type: 'line',
        source: 'buffers',
        paint: { 'line-color': '#e66767', 'line-opacity': 0.25, 'line-width': 1 },
      })

      const kindColor = [
        'match', ['get', 'kind'],
        'bookmaker', KIND_COLORS.bookmaker,
        'casino', KIND_COLORS.casino,
        'slots', KIND_COLORS.slots,
        'school', KIND_COLORS.school,
        'kindergarten', KIND_COLORS.kindergarten,
        '#ffffff',
      ] as maplibregl.ExpressionSpecification

      map.addLayer({
        id: 'schools-circles',
        type: 'circle',
        source: 'schools',
        paint: {
          'circle-color': kindColor,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 13, 5, 16, 9],
          'circle-opacity': ['case', ['get', 'exposed'], 0.95, 0.35],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['get', 'exposed'], 1.5, 0],
        },
      })
      map.addLayer({
        id: 'venues-circles',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-color': kindColor,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 4.5, 16, 8],
          'circle-stroke-color': '#11151c',
          'circle-stroke-width': 1,
        },
      })

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })

      map.on('click', 'venues-circles', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as { name: string; kind: keyof typeof KIND_LABELS; address: string }
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<strong>${esc(p.name)}</strong><br/><span class="popup-kind">${KIND_LABELS[p.kind]}</span>` +
              (p.address ? `<br/><span class="popup-addr">${esc(p.address)}</span>` : ''),
          )
          .addTo(map)
      })

      map.on('click', 'schools-circles', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as {
          name: string
          kind: keyof typeof KIND_LABELS
          nearbyHtml: string
        }
        const nearby = p.nearbyHtml
          ? `<div class="popup-nearby">${STRINGS.nearestHeading}<ul>${p.nearbyHtml}</ul></div>`
          : `<div class="popup-nearby">${STRINGS.noneNearby}</div>`
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<strong>${esc(p.name)}</strong><br/><span class="popup-kind">${KIND_LABELS[p.kind]}</span>${nearby}`,
          )
          .addTo(map)
      })

      for (const layer of ['venues-circles', 'schools-circles']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
      }

      loadedRef.current = true
    })

    return () => {
      loadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    ;(map.getSource('venues') as maplibregl.GeoJSONSource)?.setData(venuesFC(venues))
    ;(map.getSource('schools') as maplibregl.GeoJSONSource)?.setData(schoolsFC(distances, radiusM))
    ;(map.getSource('buffers') as maplibregl.GeoJSONSource)?.setData(buffersFC(venues, radiusM))
  }, [venues, distances, radiusM])

  return <div ref={containerRef} className="map-container" />
}
```

- [ ] **Step 2: Append map styles to `src/styles.css`**

```css
.map-container { position: absolute; inset: 0; }

.maplibregl-popup-content {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
}
.maplibregl-popup-close-button { color: var(--ink-muted); font-size: 16px; }
.maplibregl-popup-tip { border-top-color: var(--panel) !important; border-bottom-color: var(--panel) !important; }
.popup-kind { color: var(--ink-muted); font-size: 12px; }
.popup-addr { color: var(--ink-2); font-size: 12px; }
.popup-nearby { margin-top: 8px; color: var(--ink-2); font-size: 12px; }
.popup-nearby ul { margin: 4px 0 0; padding-left: 16px; }
.popup-nearby li { margin: 2px 0; }
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: PASS. (Nothing renders MapView yet — that's Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/components/MapView.tsx src/styles.css
git commit -m "feat: MapLibre map with venue, school and buffer layers"
```

---

### Task 7: Sidebar, histogram, controls, App wiring

**Files:**
- Create: `src/components/Sidebar.tsx`, `src/components/DistanceHistogram.tsx`
- Modify: `src/App.tsx` (replace placeholder), `src/styles.css` (append)
- Test: `src/components/histogram.test.ts` (bin math only)

**Interfaces:**
- Consumes: everything produced by Tasks 2–6.
- Produces:
  - `binNearestDistances(values: number[], maxM?: number, stepM?: number): { x0: number; x1: number; count: number; overflow: boolean }[]` — exported from `DistanceHistogram.tsx`; default `maxM = 1000`, `stepM = 100`; final bin is the overflow bin (`overflow: true`) counting `value >= maxM` (including `Infinity`)
  - `<Sidebar>` props:
```tsx
interface SidebarProps {
  summary: ExposureSummary
  distances: SchoolDistance[]
  venueCount: number
  radiusM: number
  onRadiusChange: (m: number) => void
  visibleKinds: Set<Kind>
  onToggleKind: (kind: Kind) => void
}
```

- [ ] **Step 1: Write the failing bin-math test**

`src/components/histogram.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { binNearestDistances } from './DistanceHistogram'

describe('binNearestDistances', () => {
  it('bins values into 100m steps with an overflow bin', () => {
    const bins = binNearestDistances([50, 150, 155, 999, 1000, 5000, Infinity])
    expect(bins).toHaveLength(11) // 10 bins + overflow
    expect(bins[0]).toMatchObject({ x0: 0, x1: 100, count: 1, overflow: false })
    expect(bins[1].count).toBe(2)
    expect(bins[9]).toMatchObject({ x0: 900, x1: 1000, count: 1 })
    expect(bins[10]).toMatchObject({ x0: 1000, count: 3, overflow: true })
  })

  it('handles empty input', () => {
    const bins = binNearestDistances([])
    expect(bins.every((b) => b.count === 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/histogram.test.ts`
Expected: FAIL — cannot resolve `./DistanceHistogram`.

- [ ] **Step 3: Implement DistanceHistogram**

`src/components/DistanceHistogram.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import type { SchoolDistance } from '../lib/exposure'
import { KIND_COLORS, LEGAL_MIN_M, STRINGS } from '../lib/strings'

export interface DistanceBin {
  x0: number
  x1: number
  count: number
  overflow: boolean
}

export function binNearestDistances(values: number[], maxM = 1000, stepM = 100): DistanceBin[] {
  // clamp everything ≥ maxM into a synthetic overflow bin
  const clamped = values.map((v) => Math.min(v, maxM + stepM / 2))
  const thresholds = Array.from({ length: maxM / stepM }, (_, i) => (i + 1) * stepM)
  const binner = bin<number, number>()
    .domain([0, maxM + stepM])
    .thresholds(thresholds)
  return binner(clamped).map((b, i, all) => ({
    x0: b.x0 ?? 0,
    x1: i === all.length - 1 ? maxM + stepM : (b.x1 ?? 0),
    count: b.length,
    overflow: i === all.length - 1,
  }))
}

interface Props {
  distances: SchoolDistance[]
  radiusM: number
}

const W = 300
const H = 150
const M = { top: 14, right: 6, bottom: 22, left: 30 }

export default function DistanceHistogram({ distances, radiusM }: Props) {
  const [hover, setHover] = useState<DistanceBin | null>(null)

  const bins = useMemo(
    () => binNearestDistances(distances.map((d) => d.nearestDistanceM)),
    [distances],
  )
  const maxCount = Math.max(1, ...bins.map((b) => b.count))

  const x = scaleLinear().domain([0, 1100]).range([M.left, W - M.right])
  const y = scaleLinear().domain([0, maxCount]).range([H - M.bottom, M.top])
  const yTicks = y.ticks(3).filter((t) => Number.isInteger(t))

  // bar with 4px rounded top, square baseline
  const barPath = (bx: number, bw: number, count: number) => {
    if (count === 0) return ''
    const top = y(count)
    const bottom = H - M.bottom
    const r = Math.min(4, bw / 2, bottom - top)
    return `M${bx},${bottom} L${bx},${top + r} Q${bx},${top} ${bx + r},${top} L${bx + bw - r},${top} Q${bx + bw},${top} ${bx + bw},${top + r} L${bx + bw},${bottom} Z`
  }

  return (
    <div className="histogram">
      <h3>{STRINGS.histogramTitle}</h3>
      <p className="histogram-sub">{STRINGS.histogramSubtitle}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={STRINGS.histogramTitle}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#2c2c2a" strokeWidth={1} />
            <text x={M.left - 5} y={y(t) + 3} textAnchor="end" className="tick">
              {t}
            </text>
          </g>
        ))}
        {bins.map((b) => {
          // 2px surface gap between bars
          const bx = x(b.x0) + 1
          const bw = x(b.x1) - x(b.x0) - 2
          const exposed = b.x0 < radiusM && !b.overflow
          return (
            <path
              key={b.x0}
              d={barPath(bx, bw, b.count)}
              fill={KIND_COLORS.school}
              opacity={exposed ? 0.95 : 0.35}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={H - M.bottom}
          y2={H - M.bottom}
          stroke="#383835"
          strokeWidth={1}
        />
        {/* legal minimum reference line */}
        <line
          x1={x(LEGAL_MIN_M)}
          x2={x(LEGAL_MIN_M)}
          y1={M.top - 4}
          y2={H - M.bottom}
          stroke="#898781"
          strokeWidth={1}
        />
        <text x={x(LEGAL_MIN_M) + 4} y={M.top + 2} className="tick">
          {STRINGS.legalLineLabel}
        </text>
        {[0, 500, 1000].map((t) => (
          <text key={t} x={x(t)} y={H - M.bottom + 14} textAnchor="middle" className="tick">
            {t === 1000 ? STRINGS.overflowBinLabel : t}
          </text>
        ))}
      </svg>
      <div className="histogram-tooltip" aria-live="polite">
        {hover
          ? `${hover.overflow ? '≥ 1000 m' : `${hover.x0}–${hover.x1} m`}: ${hover.count}`
          : ' '}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/histogram.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement Sidebar**

`src/components/Sidebar.tsx`:
```tsx
import type { ExposureSummary, Kind, SchoolDistance } from '../lib/exposure'
import { KIND_COLORS, KIND_LABELS, LAW_URL, LEGAL_MIN_M, STRINGS } from '../lib/strings'
import DistanceHistogram from './DistanceHistogram'

export interface SidebarProps {
  summary: ExposureSummary
  distances: SchoolDistance[]
  venueCount: number
  radiusM: number
  onRadiusChange: (m: number) => void
  visibleKinds: Set<Kind>
  onToggleKind: (kind: Kind) => void
}

const ALL_KINDS: Kind[] = ['bookmaker', 'casino', 'slots', 'school', 'kindergarten']

const fmtMedian = (m: number) =>
  Number.isFinite(m) ? `${Math.round(m)} m` : '—'

export default function Sidebar(props: SidebarProps) {
  const { summary, distances, venueCount, radiusM, onRadiusChange, visibleKinds, onToggleKind } = props
  return (
    <aside className="sidebar">
      <header>
        <h1>{STRINGS.title}</h1>
        <p className="subtitle">{STRINGS.subtitle}</p>
        <p className="intro">{STRINGS.intro}</p>
      </header>

      <section className="hero">
        <div className="hero-value">{summary.exposedPct}%</div>
        <div className="hero-label">{STRINGS.heroLabel(radiusM)}</div>
      </section>

      <section className="tiles">
        <div className="tile">
          <div className="tile-label">{STRINGS.exposedTile}</div>
          <div className="tile-value">
            {summary.exposedCount}
            <span className="tile-denom"> / {summary.total}</span>
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">{STRINGS.medianTile}</div>
          <div className="tile-value">{fmtMedian(summary.medianNearestM)}</div>
        </div>
        <div className="tile">
          <div className="tile-label">{STRINGS.venuesTile}</div>
          <div className="tile-value">{venueCount}</div>
        </div>
      </section>

      <section className="radius">
        <label htmlFor="radius">
          {STRINGS.radiusLabel}: <strong>{radiusM} m</strong>
        </label>
        <input
          id="radius"
          type="range"
          min={100}
          max={1000}
          step={25}
          value={radiusM}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        />
        <div className="radius-hint">{STRINGS.radiusLegalTag(LEGAL_MIN_M)}</div>
      </section>

      <DistanceHistogram distances={distances} radiusM={radiusM} />

      <section className="layers">
        <h3>{STRINGS.layersTitle}</h3>
        {ALL_KINDS.map((kind) => (
          <label key={kind} className="layer-row">
            <input
              type="checkbox"
              checked={visibleKinds.has(kind)}
              onChange={() => onToggleKind(kind)}
            />
            <span className="swatch" style={{ background: KIND_COLORS[kind] }} />
            {KIND_LABELS[kind]}
          </label>
        ))}
      </section>

      <footer>
        <p>{STRINGS.legalNote}</p>
        <p>
          {STRINGS.provenance}{' '}
          <a href={LAW_URL} target="_blank" rel="noreferrer">
            {STRINGS.lawLinkText}
          </a>
        </p>
      </footer>
    </aside>
  )
}
```

- [ ] **Step 6: Wire up App**

`src/App.tsx` (replace entirely):
```tsx
import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { loadData } from './lib/data'
import type { Kind, School, Venue } from './lib/exposure'
import { computeSchoolDistances, summarizeExposure } from './lib/exposure'
import { LEGAL_MIN_M, STRINGS } from './lib/strings'

const ALL_KINDS: Kind[] = ['bookmaker', 'casino', 'slots', 'school', 'kindergarten']

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const [data, setData] = useState<{ venues: Venue[]; schools: School[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [radiusM, setRadiusM] = useState(LEGAL_MIN_M)
  const [visibleKinds, setVisibleKinds] = useState<Set<Kind>>(new Set(ALL_KINDS))
  const [attempt, setAttempt] = useState(0)
  const webgl = useMemo(hasWebgl, [])

  useEffect(() => {
    let cancelled = false
    setError(null)
    loadData()
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const visibleVenues = useMemo(
    () => data?.venues.filter((v) => visibleKinds.has(v.kind)) ?? [],
    [data, visibleKinds],
  )
  const visibleSchools = useMemo(
    () => data?.schools.filter((s) => visibleKinds.has(s.kind)) ?? [],
    [data, visibleKinds],
  )
  const distances = useMemo(
    () => computeSchoolDistances(visibleSchools, visibleVenues),
    [visibleSchools, visibleVenues],
  )
  const summary = useMemo(() => summarizeExposure(distances, radiusM), [distances, radiusM])

  const toggleKind = (kind: Kind) =>
    setVisibleKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  if (error)
    return (
      <div className="error-card">
        <p>{STRINGS.dataError}</p>
        <p className="error-detail">{error}</p>
        <button onClick={() => setAttempt((a) => a + 1)}>{STRINGS.retry}</button>
      </div>
    )

  if (!data) return <div className="app-loading">{STRINGS.loading}</div>

  const sidebar = (
    <Sidebar
      summary={summary}
      distances={distances}
      venueCount={visibleVenues.length}
      radiusM={radiusM}
      onRadiusChange={setRadiusM}
      visibleKinds={visibleKinds}
      onToggleKind={toggleKind}
    />
  )

  if (!webgl)
    return (
      <div className="no-webgl">
        <p>{STRINGS.noWebgl}</p>
        {sidebar}
      </div>
    )

  return (
    <div className="app">
      <MapView venues={visibleVenues} distances={distances} radiusM={radiusM} />
      {sidebar}
    </div>
  )
}
```

- [ ] **Step 7: Append layout + sidebar styles to `src/styles.css`**

```css
.app { position: relative; height: 100%; overflow: hidden; }

.sidebar {
  position: absolute;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: 360px;
  max-width: calc(100vw - 32px);
  overflow-y: auto;
  background: rgba(17, 21, 28, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  padding: 20px;
  z-index: 10;
}

.sidebar h1 { font-size: 22px; margin: 0; }
.sidebar .subtitle { color: var(--ink-2); margin: 2px 0 10px; font-size: 14px; }
.sidebar .intro { color: var(--ink-2); font-size: 13px; line-height: 1.5; margin: 0 0 16px; }
.sidebar h3 { font-size: 13px; color: var(--ink-2); margin: 0 0 6px; font-weight: 600; }

.hero { margin-bottom: 14px; }
.hero-value { font-size: 52px; font-weight: 600; line-height: 1; }
.hero-label { color: var(--ink-muted); font-size: 12px; margin-top: 4px; max-width: 30ch; }

.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.tile { background: rgba(255, 255, 255, 0.04); border-radius: 8px; padding: 8px 10px; }
.tile-label { color: var(--ink-muted); font-size: 11px; margin-bottom: 4px; }
.tile-value { font-size: 17px; font-weight: 600; }
.tile-denom { color: var(--ink-muted); font-weight: 400; font-size: 13px; }

.radius { margin-bottom: 16px; }
.radius label { font-size: 13px; color: var(--ink-2); display: block; margin-bottom: 6px; }
.radius input { width: 100%; accent-color: var(--c-bookmaker); }
.radius-hint { color: var(--ink-muted); font-size: 11px; margin-top: 2px; }

.histogram { margin-bottom: 16px; }
.histogram svg { width: 100%; height: auto; display: block; }
.histogram-sub { color: var(--ink-muted); font-size: 11px; margin: 0 0 6px; }
.histogram .tick { fill: #898781; font-size: 9px; }
.histogram-tooltip { color: var(--ink-2); font-size: 12px; min-height: 16px; margin-top: 2px; }

.layers { margin-bottom: 16px; }
.layer-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-2); padding: 3px 0; cursor: pointer; }
.swatch { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

.sidebar footer { color: var(--ink-muted); font-size: 11px; line-height: 1.5; border-top: 1px solid var(--panel-border); padding-top: 10px; }
.sidebar footer a { color: var(--ink-2); }

.error-card, .no-webgl {
  max-width: 480px;
  margin: 15vh auto;
  padding: 24px;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 12px;
}
.error-detail { color: var(--ink-muted); font-size: 13px; }
.error-card button {
  background: var(--c-school); color: #fff; border: 0; border-radius: 8px;
  padding: 8px 16px; font-size: 14px; cursor: pointer;
}
.no-webgl .sidebar { position: static; width: auto; margin-top: 16px; }

@media (max-width: 640px) {
  .sidebar { top: auto; bottom: 0; left: 0; right: 0; width: auto; max-width: none; max-height: 55vh; border-radius: 12px 12px 0 0; }
}
```

- [ ] **Step 8: Verify tests, build and dev render**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

Run: `npm run dev` (background), then fetch `http://localhost:5173` and confirm HTTP 200; stop the server.
Expected: dev server serves the page without console errors in terminal output.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: sidebar with exposure stats, histogram, radius and layer controls"
```

---

### Task 8: README + browser verification

**Files:**
- Create: `README.md`
- Possibly modify: anything found broken during verification (small fixes only; report anything structural).

- [ ] **Step 1: Write README.md**

```markdown
# Kladi — Betting shops around Belgrade's schools

Interactive map of Belgrade overlaying schools and kindergartens with betting
venues (kladionice, casinos, slot clubs), to make visible how close gambling
sits to children's daily paths.

Serbian law (Zakon o igrama na sreću, "Sl. glasnik RS" 18/2020 & 94/2024)
requires betting venues to keep at least **200 m** from primary and secondary
schools, measured along the shortest safe pedestrian path. This map draws
straight-line (air) distances — an approximation, and a conservative signal,
not a legal finding. Kindergartens are shown for context; the law does not
cover them.

## Run

    npm install
    npm run dev        # http://localhost:5173

## Data

`public/data/*.geojson` is committed and self-contained. Source:
OpenStreetMap via the Overpass API (© OpenStreetMap contributors).
Venue counts are a lower bound — unmapped venues exist.

Refresh with:

    npm run fetch-data

## Test / build

    npm test
    npm run build
```

- [ ] **Step 2: Full verification pass**

Run: `npm test`
Expected: all suites pass.

Run: `npm run build && npm run preview` (preview in background), open `http://localhost:4173` in a real browser.

Checklist (each must hold):
- Map renders dark Belgrade with red-family venue dots, blue/green school dots, translucent red buffer circles.
- Exposed schools (bright, white-ringed) visibly outnumber muted ones in the center at 200 m.
- Hero % and tiles show plausible numbers (spec sanity band: exposed schools at 200 m should be roughly 15–40% of visible institutions; prior art found 106/467 registry venues within 200 m of schools).
- Dragging the radius slider updates hero, histogram emphasis, buffers, and school highlighting live with no jank.
- Toggling "Kindergartens" off changes the totals (stats follow visibility).
- Clicking a school shows nearest-venue list with distances; clicking a venue shows its name; no `undefined` anywhere.
- Histogram: hover tooltip works; "law: 200 m" line visible.
- No console errors.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with provenance and legal framing"
```

---

## Self-review (done at plan time)

- **Spec coverage:** data pipeline ✓ (Task 4), committed GeoJSON ✓, map + layers + popups ✓ (Task 6), radius control defaulting to legal 200 m ✓ (Task 7), stats-respect-toggles ✓ (App filters before computing), histogram with legal line ✓, error card / WebGL fallback / name fallbacks ✓ (Tasks 4, 5, 7), provenance + honest legal copy ✓ (strings, README), tests for geo/exposure/normalize ✓ (Tasks 2–4).
- **Type consistency:** `SchoolDistance` produced in Task 3, consumed by Tasks 6–7 with matching fields; `Kind`/`KIND_COLORS`/`KIND_LABELS` names consistent across Tasks 5–7; `binNearestDistances` signature matches its test.
- **Placeholders:** none; every code step is complete.
