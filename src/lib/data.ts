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
