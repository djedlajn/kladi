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
