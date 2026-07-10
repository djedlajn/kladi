import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { loadData } from './lib/data'
import type { Kind, School, Venue } from './lib/exposure'
import { computeSchoolDistances, summarizeExposure } from './lib/exposure'
import { LEGAL_MIN_M, STRINGS } from './lib/strings'

const ALL_KINDS: Kind[] = ['bookmaker', 'casino', 'slots', 'school', 'kindergarten']

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const [data, setData] = useState<{ venues: Venue[]; schools: School[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [radiusM, setRadiusM] = useState(LEGAL_MIN_M)
  const [visibleKinds, setVisibleKinds] = useState<Set<Kind>>(new Set(ALL_KINDS))
  const [attempt, setAttempt] = useState(0)
  const webgl = useMemo(hasWebgl, [])

  useEffect(() => {
    let cancelled = false
    setError(null)
    loadData()
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const visibleVenues = useMemo(
    () => data?.venues.filter((v) => visibleKinds.has(v.kind)) ?? [],
    [data, visibleKinds],
  )
  const visibleSchools = useMemo(
    () => data?.schools.filter((s) => visibleKinds.has(s.kind)) ?? [],
    [data, visibleKinds],
  )
  const distances = useMemo(
    () => computeSchoolDistances(visibleSchools, visibleVenues),
    [visibleSchools, visibleVenues],
  )
  const summary = useMemo(() => summarizeExposure(distances, radiusM), [distances, radiusM])

  const toggleKind = (kind: Kind) =>
    setVisibleKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  if (error)
    return (
      <div className="error-card">
        <p>{STRINGS.dataError}</p>
        <p className="error-detail">{error}</p>
        <button onClick={() => setAttempt((a) => a + 1)}>{STRINGS.retry}</button>
      </div>
    )

  if (!data) return <div className="app-loading">{STRINGS.loading}</div>

  const sidebar = (
    <Sidebar
      summary={summary}
      distances={distances}
      venueCount={visibleVenues.length}
      radiusM={radiusM}
      onRadiusChange={setRadiusM}
      visibleKinds={visibleKinds}
      onToggleKind={toggleKind}
    />
  )

  if (!webgl)
    return (
      <div className="no-webgl">
        <p>{STRINGS.noWebgl}</p>
        {sidebar}
      </div>
    )

  return (
    <div className="app">
      <MapView venues={visibleVenues} distances={distances} radiusM={radiusM} />
      {sidebar}
    </div>
  )
}
