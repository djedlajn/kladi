import { useMemo, useState } from 'react'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import type { SchoolDistance } from '../lib/exposure'
import { KIND_COLORS, LEGAL_MIN_M, STRINGS } from '../lib/strings'

export interface DistanceBin {
  x0: number
  x1: number
  count: number
  overflow: boolean
}

export function binNearestDistances(values: number[], maxM = 1000, stepM = 100): DistanceBin[] {
  // clamp everything ≥ maxM into a synthetic overflow bin
  const clamped = values.map((v) => Math.min(v, maxM + stepM / 2))
  const thresholds = Array.from({ length: maxM / stepM }, (_, i) => (i + 1) * stepM)
  const binner = bin<number, number>()
    .domain([0, maxM + stepM])
    .thresholds(thresholds)
  return binner(clamped).map((b, i, all) => ({
    x0: b.x0 ?? 0,
    x1: i === all.length - 1 ? maxM + stepM : (b.x1 ?? 0),
    count: b.length,
    overflow: i === all.length - 1,
  }))
}

interface Props {
  distances: SchoolDistance[]
  radiusM: number
}

const W = 300
const H = 150
const M = { top: 14, right: 6, bottom: 22, left: 30 }

export default function DistanceHistogram({ distances, radiusM }: Props) {
  const [hover, setHover] = useState<DistanceBin | null>(null)

  const bins = useMemo(
    () => binNearestDistances(distances.map((d) => d.nearestDistanceM)),
    [distances],
  )
  const maxCount = Math.max(1, ...bins.map((b) => b.count))

  const x = scaleLinear().domain([0, 1100]).range([M.left, W - M.right])
  const y = scaleLinear().domain([0, maxCount]).range([H - M.bottom, M.top])
  const yTicks = y.ticks(3).filter((t) => Number.isInteger(t))

  // bar with 4px rounded top, square baseline
  const barPath = (bx: number, bw: number, count: number) => {
    if (count === 0) return ''
    const top = y(count)
    const bottom = H - M.bottom
    const r = Math.min(4, bw / 2, bottom - top)
    return `M${bx},${bottom} L${bx},${top + r} Q${bx},${top} ${bx + r},${top} L${bx + bw - r},${top} Q${bx + bw},${top} ${bx + bw},${top + r} L${bx + bw},${bottom} Z`
  }

  return (
    <div className="histogram">
      <h3>{STRINGS.histogramTitle}</h3>
      <p className="histogram-sub">{STRINGS.histogramSubtitle}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={STRINGS.histogramTitle}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="#2c2c2a" strokeWidth={1} />
            <text x={M.left - 5} y={y(t) + 3} textAnchor="end" className="tick">
              {t}
            </text>
          </g>
        ))}
        {bins.map((b) => {
          // 2px surface gap between bars
          const bx = x(b.x0) + 1
          const bw = x(b.x1) - x(b.x0) - 2
          const exposed = b.x0 < radiusM && !b.overflow
          return (
            <path
              key={b.x0}
              d={barPath(bx, bw, b.count)}
              fill={KIND_COLORS.school}
              opacity={exposed ? 0.95 : 0.35}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={H - M.bottom}
          y2={H - M.bottom}
          stroke="#383835"
          strokeWidth={1}
        />
        {/* legal minimum reference line */}
        <line
          x1={x(LEGAL_MIN_M)}
          x2={x(LEGAL_MIN_M)}
          y1={M.top - 4}
          y2={H - M.bottom}
          stroke="#898781"
          strokeWidth={1}
        />
        <text x={x(LEGAL_MIN_M) + 4} y={M.top + 2} className="tick">
          {STRINGS.legalLineLabel}
        </text>
        {[0, 500, 1000].map((t) => (
          <text key={t} x={x(t)} y={H - M.bottom + 14} textAnchor="middle" className="tick">
            {t === 1000 ? STRINGS.overflowBinLabel : t}
          </text>
        ))}
      </svg>
      <div className="histogram-tooltip" aria-live="polite">
        {hover
          ? `${hover.overflow ? STRINGS.overflowBinLabel : `${hover.x0}–${hover.x1} m`}: ${hover.count}`
          : ' '}
      </div>
    </div>
  )
}
