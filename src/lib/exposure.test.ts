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
