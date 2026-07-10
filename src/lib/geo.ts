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
