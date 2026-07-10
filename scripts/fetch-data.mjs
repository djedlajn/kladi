import { writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { normalizeElements } from './normalize.mjs'

const BBOX = '44.70,20.25,44.90,20.65'
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
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
        headers: { 'User-Agent': 'kladi-belgrade-betting-map/0.1 (one-off data refresh)' },
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
