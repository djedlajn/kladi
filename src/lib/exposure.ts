import { haversineMeters } from './geo'

export type VenueKind = 'bookmaker' | 'casino' | 'slots'
export type SchoolKind = 'school' | 'kindergarten'
export type Kind = VenueKind | SchoolKind

export const ALL_KINDS: Kind[] = ['bookmaker', 'casino', 'slots', 'school', 'kindergarten']

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
  nearbyCutoffM = 1000,
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
