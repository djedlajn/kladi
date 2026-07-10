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
