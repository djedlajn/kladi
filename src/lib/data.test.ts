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
