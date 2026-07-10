import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SchoolDistance, Venue } from '../lib/exposure'
import { circlePolygon } from '../lib/geo'
import { KIND_COLORS, KIND_LABELS, STRINGS } from '../lib/strings'

interface MapViewProps {
  venues: Venue[]
  distances: SchoolDistance[]
  radiusM: number
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function venuesFC(venues: Venue[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      properties: { id: v.id, name: v.name, kind: v.kind, address: v.address ?? '' },
    })),
  }
}

function schoolsFC(distances: SchoolDistance[], radiusM: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: distances.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.school.lon, d.school.lat] },
      properties: {
        id: d.school.id,
        name: d.school.name,
        kind: d.school.kind,
        exposed: d.nearestDistanceM <= radiusM,
        // popup payload: nearest 3 venues, pre-rendered as safe HTML
        nearbyHtml: d.nearby.length
          ? d.nearby
              .slice(0, 3)
              .map((n) => `<li>${esc(n.venue.name)} — ${Math.round(n.distanceM)} m</li>`)
              .join('')
          : '',
      },
    })),
  }
}

function buffersFC(venues: Venue[], radiusM: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circlePolygon([v.lon, v.lat], radiusM)] },
      properties: {},
    })),
  }
}

export default function MapView({ venues, distances, radiusM }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const loadedRef = useRef(false)
  // latest data for the load handler (props may change before style loads)
  const dataRef = useRef({ venues, distances, radiusM })
  dataRef.current = { venues, distances, radiusM }

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [20.457, 44.81],
      zoom: 12,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      const { venues, distances, radiusM } = dataRef.current
      map.addSource('buffers', { type: 'geojson', data: buffersFC(venues, radiusM) })
      map.addSource('venues', { type: 'geojson', data: venuesFC(venues) })
      map.addSource('schools', { type: 'geojson', data: schoolsFC(distances, radiusM) })

      map.addLayer({
        id: 'buffers-fill',
        type: 'fill',
        source: 'buffers',
        paint: { 'fill-color': '#e66767', 'fill-opacity': 0.07 },
      })
      map.addLayer({
        id: 'buffers-line',
        type: 'line',
        source: 'buffers',
        paint: { 'line-color': '#e66767', 'line-opacity': 0.25, 'line-width': 1 },
      })

      const kindColor = [
        'match', ['get', 'kind'],
        'bookmaker', KIND_COLORS.bookmaker,
        'casino', KIND_COLORS.casino,
        'slots', KIND_COLORS.slots,
        'school', KIND_COLORS.school,
        'kindergarten', KIND_COLORS.kindergarten,
        '#ffffff',
      ] as maplibregl.ExpressionSpecification

      map.addLayer({
        id: 'schools-circles',
        type: 'circle',
        source: 'schools',
        paint: {
          'circle-color': kindColor,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 13, 5, 16, 9],
          'circle-opacity': ['case', ['get', 'exposed'], 0.95, 0.35],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['case', ['get', 'exposed'], 1.5, 0],
        },
      })
      map.addLayer({
        id: 'venues-circles',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-color': kindColor,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 4.5, 16, 8],
          'circle-stroke-color': '#11151c',
          'circle-stroke-width': 1,
        },
      })

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
      popupRef.current = popup

      // schools handler registered first so the venues handler (rendered on top)
      // wins when a click hits both, matching the visual stacking order
      map.on('click', 'schools-circles', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as {
          name: string
          kind: keyof typeof KIND_LABELS
          nearbyHtml: string
        }
        const nearby = p.nearbyHtml
          ? `<div class="popup-nearby">${STRINGS.nearestHeading}<ul>${p.nearbyHtml}</ul></div>`
          : `<div class="popup-nearby">${STRINGS.noneNearby}</div>`
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<strong>${esc(p.name)}</strong><br/><span class="popup-kind">${KIND_LABELS[p.kind]}</span>${nearby}`,
          )
          .addTo(map)
      })

      map.on('click', 'venues-circles', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as { name: string; kind: keyof typeof KIND_LABELS; address: string }
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<strong>${esc(p.name)}</strong><br/><span class="popup-kind">${KIND_LABELS[p.kind]}</span>` +
              (p.address ? `<br/><span class="popup-addr">${esc(p.address)}</span>` : ''),
          )
          .addTo(map)
      })

      for (const layer of ['venues-circles', 'schools-circles']) {
        map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''))
      }

      loadedRef.current = true
    })

    return () => {
      loadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    // close any open popup: its target feature may no longer exist after the data change
    popupRef.current?.remove()
    ;(map.getSource('venues') as maplibregl.GeoJSONSource)?.setData(venuesFC(venues))
    ;(map.getSource('schools') as maplibregl.GeoJSONSource)?.setData(schoolsFC(distances, radiusM))
    ;(map.getSource('buffers') as maplibregl.GeoJSONSource)?.setData(buffersFC(venues, radiusM))
  }, [venues, distances, radiusM])

  return <div ref={containerRef} className="map-container" />
}
