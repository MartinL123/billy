import { territoryOf } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { BossIcon } from '../training/BossIcon'

const R = 37
const CIRC = 2 * Math.PI * R
const GAP = 6.5
const SEG = CIRC / MAX_LEVEL - GAP

/**
 * Badge d’une compétence : cercle à la couleur du territoire, entouré d’un anneau en 5 segments
 * qui s’allument au fil des étapes. Aucun chiffre. Doré quand tout est acquis, pâle quand rien ne l’est, jamais grisé.
 */
export function Badge({ bossId, acquired, size = 84, lit }: { bossId: string; acquired: number; size?: number; /** Couleur des segments allumés, à la place de celle du territoire. */ lit?: string }) {
  const territory = territoryOf(bossId)
  const mastered = acquired >= MAX_LEVEL
  const litColor = mastered ? '#F2B544' : (lit ?? territory.color)
  const started = acquired > 0
  return (
    <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 84 84" className="absolute inset-0 size-full" aria-hidden="true">
        {Array.from({ length: MAX_LEVEL }, (_, i) => (
          <circle
            key={i}
            cx="42"
            cy="42"
            r={R}
            fill="none"
            stroke={i < acquired ? litColor : territory.soft}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${SEG} ${CIRC - SEG}`}
            transform={`rotate(${-90 + (360 / MAX_LEVEL) * i + (GAP / 2 / CIRC) * 360} 42 42)`}
          />
        ))}
        <circle cx="42" cy="42" r="28" fill={mastered ? '#F2B544' : started ? territory.color : territory.soft} />
      </svg>
      <span className="relative flex" style={{ color: mastered ? '#3D2A00' : started ? '#FFFFFF' : territory.color }}>
        <BossIcon bossId={bossId} size={Math.round(size * 0.34)} />
      </span>
    </span>
  )
}
