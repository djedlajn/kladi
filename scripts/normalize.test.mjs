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
