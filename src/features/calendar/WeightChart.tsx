import { useState } from 'react'
import type { Weight, WithId } from '../../firebase/types'
import { dayNumber, formatLong, formatShort } from '../../lib/dates'
import { formatKg } from './WeightSheet'

const W = 318
const H = 150
const PAD = { top: 26, right: 14, bottom: 22, left: 14 }

/** Courbe de poids : une seule série, la dernière pesée étiquetée, un tap pour lire une autre valeur. */
export function WeightChart({ weights }: { weights: WithId<Weight>[] }) {
  const points = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const [picked, setPicked] = useState<string | null>(null)
  if (points.length < 2) return null

  const first = points[0]!
  const last = points[points.length - 1]!
  const t0 = dayNumber(first.date)
  const span = Math.max(1, dayNumber(last.date) - t0)
  const kgs = points.map((p) => p.kg)
  const min = Math.min(...kgs)
  const max = Math.max(...kgs)
  const range = Math.max(0.5, max - min)

  const x = (w: Weight) => PAD.left + ((dayNumber(w.date) - t0) / span) * (W - PAD.left - PAD.right)
  const y = (w: Weight) => PAD.top + (1 - (w.kg - min) / range) * (H - PAD.top - PAD.bottom)

  const active = points.find((p) => p.id === picked) ?? last
  const labelX = Math.min(W - 44, Math.max(44, x(active)))

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label={`Courbe de poids, de ${formatKg(first.kg)} à ${formatKg(last.kg)} kilos`}>
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#E6EAE7" strokeWidth="1" />
        <line x1={x(active)} x2={x(active)} y1={PAD.top - 4} y2={H - PAD.bottom} stroke="#D3D9D6" strokeWidth="1" />
        <polyline
          points={points.map((p) => `${x(p).toFixed(1)},${y(p).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="#1E5A50"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle key={p.id} cx={x(p)} cy={y(p)} r={p.id === active.id ? 5 : 4} fill={p.id === active.id ? '#1E5A50' : '#FFFFFF'} stroke="#1E5A50" strokeWidth="2" />
        ))}
        <text x={labelX} y={14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#18201E">
          {formatKg(active.kg)} kg
          <tspan fontWeight="400" fill="#5A6662">
            {' '}
            · {formatShort(active.date)}
          </tspan>
        </text>
        <text x={PAD.left} y={H - 6} fontSize="11" fill="#5A6662">
          {formatShort(first.date)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="11" fill="#5A6662">
          {formatShort(last.date)}
        </text>
        {/* Zones tactiles plus larges que les points. */}
        {points.map((p) => (
          <circle
            key={`hit-${p.id}`}
            cx={x(p)}
            cy={y(p)}
            r={22}
            fill="transparent"
            role="button"
            tabIndex={0}
            aria-label={`${formatLong(p.date)} : ${formatKg(p.kg)} kilos`}
            aria-pressed={p.id === active.id}
            onPointerEnter={() => setPicked(p.id)}
            onClick={() => setPicked(p.id)}
            onFocus={() => setPicked(p.id)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </svg>
    </figure>
  )
}
