import { useLayoutEffect, useRef, useState } from 'react'
import type { Weight, WithId } from '../../firebase/types'
import { dayNumber, formatLong, formatShort } from '../../lib/dates'
import { weightTrend } from '../../lib/weightTrend'
import { formatKg } from './WeightSheet'

const H = 120
const PAD = { top: 12, right: 14, bottom: 12, left: 14 }

/** Courbe de poids : une seule série, la dernière pesée étiquetée, un tap pour lire une autre valeur. */
export function WeightChart({ weights }: { weights: WithId<Weight>[] }) {
  const points = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const [picked, setPicked] = useState<string | null>(null)
  // R-062 : le dessin suit la largeur réelle (pas de viewBox mis à l’échelle) ; les textes sont en HTML, à taille fixe.
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(318)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setW(Math.max(120, el.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [points.length >= 2])
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
  const trend = weightTrend(points)

  return (
    <figure className="m-0 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-[0.7647rem]">
        <span aria-live="polite">
          <span className="font-bold text-text">{formatKg(active.kg)} kg</span>
          <span className="text-muted"> · {formatShort(active.date)}</span>
        </span>
        {trend && <span className="font-semibold text-text">{trend}</span>}
      </div>
      <div ref={box}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="group" aria-label={`Courbe de poids, de ${formatKg(first.kg)} à ${formatKg(last.kg)} kilos${trend ? `, ${trend}` : ''}`}>
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
          {/* Zones tactiles de 44 px autour des points. */}
          {points.map((p) => (
            <circle
              key={`hit-${p.id}`}
              cx={x(p)}
              cy={y(p)}
              r={22}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`${formatLong(p.date)} : ${formatKg(p.kg)} kilos`}
              aria-pressed={p.id === active.id}
              onPointerEnter={() => setPicked(p.id)}
              onClick={() => setPicked(p.id)}
              onFocus={() => setPicked(p.id)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>
      </div>
      <figcaption aria-hidden="true" className="flex justify-between text-[0.7647rem] text-muted">
        <span>{formatShort(first.date)}</span>
        <span>{formatShort(last.date)}</span>
      </figcaption>
    </figure>
  )
}
