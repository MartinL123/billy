import { Link } from 'react-router-dom'
import { SKILLS, territoryOf } from '../../content/phrases'
import { MAX_LEVEL } from '../../content/training'
import { badgeName, badgeRing, ringArcs } from '../../lib/billyPage'

const ARCS = ringArcs(28, 24)

/** L’anneau d’une compétence : 5 segments, le nombre d’étapes au centre. */
function Ring({ segments, level }: { segments: string[]; level: number }) {
  return (
    <svg viewBox="0 0 56 56" className="block aspect-square w-full max-w-14" aria-hidden="true">
      {ARCS.map((d, i) => (
        <path key={i} d={d} stroke={segments[i]} strokeWidth="5" fill="none" strokeLinecap="round" />
      ))}
      <text x="28" y="33" textAnchor="middle" fontFamily="'Bricolage Grotesque', sans-serif" fontWeight="700" fontSize="14" fill="#18201E">
        {Math.min(level, MAX_LEVEL)}/{MAX_LEVEL}
      </text>
    </svg>
  )
}

/**
 * « Ses badges » (T-104, R-097) : les 10 compétences en anneaux, 3 par ligne, celles en cours d’abord. Couleur du territoire,
 * doré si maîtrisée, pâle sinon ; jamais de cadenas. Un toucher ouvre la compétence.
 */
export function BadgeGrid({ levels, active }: { levels: Record<string, number>; active: string[] }) {
  const order = [...active, ...SKILLS.map((s) => s.id).filter((id) => !active.includes(id))]
  return (
    <ul className="card m-0 grid list-none grid-cols-3 gap-x-2 gap-y-3.5 p-4">
      {order.map((id) => {
        const skill = SKILLS.find((s) => s.id === id)
        if (!skill) return null
        const level = levels[id] ?? 0
        const ring = badgeRing(level, territoryOf(id).color, active.includes(id))
        return (
          <li key={id} className="@container min-w-0">
            <Link
              to={`/competence/${id}`}
              aria-label={`${skill.name} : ${Math.min(level, MAX_LEVEL)} étape${level > 1 ? 's' : ''} sur ${MAX_LEVEL}${ring.status ? `, ${ring.status.toLowerCase()}` : ''}`}
              className="tap flex min-h-11 flex-col items-center gap-1 text-center text-[0.7941rem] leading-tight font-semibold text-text no-underline"
            >
              <Ring segments={ring.segments} level={level} />
              {/* R-097 : jamais coupé dans un mot (« Les Rencontre / s ») ; 3 par ligne, chaque nom tient sur 2 lignes. En très
                  grand texte sur un petit écran, le nom se resserre juste assez pour que son plus long mot tienne. */}
              <span className="max-w-full text-[min(0.7941rem,17cqi)] [hyphens:none] [overflow-wrap:normal] [word-break:keep-all]">{badgeName(skill.name)}</span>
              {ring.status && <span className={`text-[0.7059rem] font-bold whitespace-nowrap ${ring.mastered ? 'text-[#8A6514]' : 'text-action'}`}>{ring.status}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
