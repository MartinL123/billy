import { Link } from 'react-router-dom'
import { CheckIcon, ChevronRightIcon } from '../../components/Icons'
import { territoryOf } from '../../content/phrases'
import { skipQuest } from '../../firebase/training'
import { BoneIcon } from '../../components/BoneIcon'
import { bossById } from '../../content/training'
import { BONES } from '../../lib/bones'
import { useToday } from '../../lib/useToday'
import { BossIcon } from '../training/BossIcon'
import { useQuest } from './useQuest'

const REST = { name: 'Repos', color: '#1E5A50', soft: '#DCEBE6' }

/** Le Grand Monde a la couleur du bouton principal : son « Commencer » est plus foncé pour ne pas se confondre avec « Noter ». Blanc sur #9A4413 : contraste 6,7:1 (AA). */
const darker = (color: string) => (color.toUpperCase() === '#C2571A' ? '#9A4413' : color)

/**
 * Mission du jour : une seule chose à faire, courte. La carte prend la couleur du territoire :
 * c'est un objet de jeu, la seule exception au bouton principal orange.
 */
export function QuestCard() {
  const { quest, mission, skips, done, canSkip } = useQuest()
  const today = useToday()
  const territory = quest.bossId ? territoryOf(quest.bossId) : REST
  // Toute la carte mène à l'exercice (ou à la page de repos) : c'est là qu'on trouve le minuteur et « C'est fait ! ».
  const to = '/exercice?depuis=quete'

  return (
    <section aria-label="Mission du jour" className="overflow-hidden rounded-[26px] border-2 border-solid bg-surface" style={{ borderColor: territory.color, boxShadow: '0 4px 14px rgba(24,32,30,0.12)' }}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-2.5 text-white" style={{ background: territory.color }}>
        <h2 className="text-[13px] font-extrabold tracking-[0.8px] uppercase">Mission du jour</h2>
        {/* Une seule pastille : ce que la mission rapporte. */}
        <span className="flex items-center gap-1 rounded-[10px] bg-[#FFF8E6] px-2.5 py-[3px] text-[13px] font-extrabold whitespace-nowrap text-gold-dark">
          +{BONES.mission + (quest.kind === 'repos' ? BONES.rest : 0)}
          <BoneIcon size={16} />
          <span className="sr-only">os</span>
        </span>
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <Link to={to} aria-label={`${mission.title}. ${mission.detail}. Ouvrir`} className="flex items-center gap-3.5 text-text no-underline">
          <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full" style={{ background: territory.soft, color: territory.color }}>
            <BossIcon bossId={quest.bossId ?? 'calme'} size={30} />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-display text-xl leading-tight font-extrabold">{mission.title}</span>
            {/* La compétence travaillée est dans la ligne sous le titre : « Le Rappel · 3 min · en longe au parc ». */}
            <span className="text-[15px] leading-snug text-[#3F4946]">{[quest.bossId && !done ? bossById(quest.bossId)?.name : undefined, mission.detail].filter(Boolean).join(' · ')}</span>
          </span>
          <ChevronRightIcon size={22} className="ml-auto shrink-0" style={{ color: territory.color }} />
        </Link>
        {done ? (
          <p className="flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-gold-soft text-[17px] font-bold text-[#5C4410]">
            <CheckIcon size={22} strokeWidth={3} />
            Mission du jour réussie !
          </p>
        ) : (
          <div className={`grid gap-2.5 ${canSkip ? 'grid-cols-[2fr_1fr]' : ''}`}>
            <Link to={to} className="flex min-h-[54px] items-center justify-center gap-2 rounded-full text-[17px] font-extrabold text-white no-underline" style={{ background: darker(territory.color) }}>
              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                <path d="M2 1l7 4-7 4z" />
              </svg>
              Commencer
            </Link>
            {canSkip && (
              <button type="button" onClick={() => skipQuest(today, skips + 1)} className="min-h-[54px] rounded-full border-2 border-solid bg-transparent text-[15px] font-bold" style={{ borderColor: territory.color, color: territory.color }}>
                Autre idée
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
