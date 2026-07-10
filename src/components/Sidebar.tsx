import type { ExposureSummary, Kind, SchoolDistance } from '../lib/exposure'
import { KIND_COLORS, KIND_LABELS, LAW_URL, LEGAL_MIN_M, STRINGS } from '../lib/strings'
import DistanceHistogram from './DistanceHistogram'

export interface SidebarProps {
  summary: ExposureSummary
  distances: SchoolDistance[]
  venueCount: number
  radiusM: number
  onRadiusChange: (m: number) => void
  visibleKinds: Set<Kind>
  onToggleKind: (kind: Kind) => void
}

const ALL_KINDS: Kind[] = ['bookmaker', 'casino', 'slots', 'school', 'kindergarten']

const fmtMedian = (m: number) =>
  Number.isFinite(m) ? `${Math.round(m)} m` : '—'

export default function Sidebar(props: SidebarProps) {
  const { summary, distances, venueCount, radiusM, onRadiusChange, visibleKinds, onToggleKind } = props
  return (
    <aside className="sidebar">
      <header>
        <h1>{STRINGS.title}</h1>
        <p className="subtitle">{STRINGS.subtitle}</p>
        <p className="intro">{STRINGS.intro}</p>
      </header>

      <section className="hero">
        <div className="hero-value">{summary.exposedPct}%</div>
        <div className="hero-label">{STRINGS.heroLabel(radiusM)}</div>
      </section>

      <section className="tiles">
        <div className="tile">
          <div className="tile-label">{STRINGS.exposedTile}</div>
          <div className="tile-value">
            {summary.exposedCount}
            <span className="tile-denom"> / {summary.total}</span>
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">{STRINGS.medianTile}</div>
          <div className="tile-value">{fmtMedian(summary.medianNearestM)}</div>
        </div>
        <div className="tile">
          <div className="tile-label">{STRINGS.venuesTile}</div>
          <div className="tile-value">{venueCount}</div>
        </div>
      </section>

      <section className="radius">
        <label htmlFor="radius">
          {STRINGS.radiusLabel}: <strong>{radiusM} m</strong>
        </label>
        <input
          id="radius"
          type="range"
          min={100}
          max={1000}
          step={25}
          value={radiusM}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
        />
        <div className="radius-hint">{STRINGS.radiusLegalTag(LEGAL_MIN_M)}</div>
      </section>

      <DistanceHistogram distances={distances} radiusM={radiusM} />

      <section className="layers">
        <h3>{STRINGS.layersTitle}</h3>
        {ALL_KINDS.map((kind) => (
          <label key={kind} className="layer-row">
            <input
              type="checkbox"
              checked={visibleKinds.has(kind)}
              onChange={() => onToggleKind(kind)}
            />
            <span className="swatch" style={{ background: KIND_COLORS[kind] }} />
            {KIND_LABELS[kind]}
          </label>
        ))}
      </section>

      <footer>
        <p>{STRINGS.legalNote}</p>
        <p>
          {STRINGS.provenance}{' '}
          <a href={LAW_URL} target="_blank" rel="noreferrer">
            {STRINGS.lawLinkText}
          </a>
        </p>
      </footer>
    </aside>
  )
}
