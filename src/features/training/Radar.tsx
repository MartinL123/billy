import { STATS, type Stat } from '../../content/training'

const SIZE = 240
const CENTER = SIZE / 2
const RADIUS = 78
/** Une stat sans XP reste visible : un petit rayon minimal, jamais un point au centre. */
const FLOOR = 0.12

function point(index: number, ratio: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / STATS.length
  return [CENTER + Math.cos(angle) * RADIUS * ratio, CENTER + Math.sin(angle) * RADIUS * ratio]
}

const polygon = (ratios: number[]) => ratios.map((r, i) => point(i, r).map((n) => n.toFixed(1)).join(',')).join(' ')

interface RadarProps {
  now: Record<Stat, number>
  /** L'état d'il y a 30 jours, en pointillé. */
  before: Record<Stat, number>
}

/**
 * Radar des 5 stats. Échelle relative à la plus forte stat, sans chiffre ni pourcentage :
 * on compare la forme d'aujourd'hui à celle d'il y a un mois. Les stats ne baissent jamais.
 */
export function Radar({ now, before }: RadarProps) {
  const max = Math.max(1, ...STATS.map((s) => now[s.id]))
  const ratio = (value: number) => FLOOR + (1 - FLOOR) * (value / max)
  const current = STATS.map((s) => ratio(now[s.id]))
  const ghost = STATS.map((s) => ratio(before[s.id]))
  const empty = STATS.every((s) => now[s.id] === 0)
  const strongest = [...STATS].sort((a, b) => now[b.id] - now[a.id])
  const grown = STATS.filter((s) => now[s.id] > before[s.id]).map((s) => s.label)

  const summary = empty
    ? 'Radar des 5 stats : encore vide.'
    : `Radar des 5 stats. La plus forte : ${strongest[0]!.label}. ${grown.length ? `En hausse depuis 30 jours : ${grown.join(', ')}.` : 'Stable depuis 30 jours.'}`

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={summary} className="block w-full max-w-[280px]">
        {[1 / 3, 2 / 3, 1].map((step) => (
          <polygon key={step} points={polygon(STATS.map(() => step))} fill="none" stroke="#E6EAE7" strokeWidth="1" />
        ))}
        {STATS.map((s, i) => {
          const [x, y] = point(i, 1)
          return <line key={s.id} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#E6EAE7" strokeWidth="1" />
        })}
        {!empty && <polygon points={polygon(ghost)} fill="none" stroke="#5A6662" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" />}
        <polygon points={polygon(current)} fill="rgba(30,90,80,0.18)" stroke="#1E5A50" strokeWidth="2" strokeLinejoin="round" />
        {current.map((r, i) => {
          const [x, y] = point(i, r)
          return <circle key={i} cx={x} cy={y} r="4" fill="#1E5A50" stroke="#FFFFFF" strokeWidth="2" />
        })}
        {STATS.map((s, i) => {
          const [x, y] = point(i, 1.24)
          return (
            <text key={s.id} x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#18201E">
              {s.label}
            </text>
          )
        })}
      </svg>
      <figcaption className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 bg-primary" />
          Aujourd'hui
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-muted" />
          Il y a 30 jours
        </span>
      </figcaption>
    </figure>
  )
}
