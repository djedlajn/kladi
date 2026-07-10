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
