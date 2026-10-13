import { useNavigate } from 'react-router-dom'
import { CheckIcon } from '../../components/Icons'
import { useToast } from '../../components/Toast'
import { territoryOf } from '../../content/phrases'
import { completeQuest, skipQuest } from '../../firebase/training'
import { QUEST_XP } from '../../lib/quest'
import { useToday } from '../../lib/useToday'
import { BossIcon } from '../training/BossIcon'
import { useQuest } from './useQuest'

const REST = { name: 'Repos', color: '#1E5A50', soft: '#DCEBE6' }

/**
 * Quête du jour : une seule chose à faire, courte. La carte prend la couleur du territoire :
 * c'est un objet de jeu, la seule exception au bouton principal orange.
 */
export function QuestCard() {
  const { quest, mission, skips, done, canSkip } = useQuest()
  const today = useToday()
  const navigate = useNavigate()
  const toast = useToast()
  const territory = quest.bossId ? territoryOf(quest.bossId) : REST
  const rest = quest.kind === 'repos'

  const finish = () => {
    if (!rest) return navigate('/noter?depuis=quete')
    completeQuest(today, { kind: 'repos' }, skips, QUEST_XP)
    toast(`Journée de repos notée · +${QUEST_XP} XP`)
  }

  return (
    <section aria-label="Quête du jour" className="overflow-hidden rounded-[26px] border-2 border-solid bg-surface" style={{ borderColor: territory.color, boxShadow: '0 4px 14px rgba(24,32,30,0.12)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-white" style={{ background: territory.color }}>
        <h2 className="text-[13px] font-extrabold tracking-[0.8px] uppercase">Quête du jour · {territory.name}</h2>
        <span className="rounded-[10px] bg-gold px-2.5 py-[3px] text-[13px] font-extrabold whitespace-nowrap text-gold-dark">+{QUEST_XP} XP</span>
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full" style={{ background: territory.soft, color: territory.color }}>
            <BossIcon bossId={quest.bossId ?? 'calme'} size={30} />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-display text-xl leading-tight font-extrabold">{mission.title}</span>
            <span className="text-[15px] leading-snug text-[#3F4946]">{mission.detail}</span>
          </span>
        </div>
        {done ? (
          <p className="flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-gold-soft text-[17px] font-bold text-[#5C4410]">
            <CheckIcon size={22} strokeWidth={3} />
            Quête du jour réussie !
          </p>
        ) : (
          <div className={`grid gap-2.5 ${canSkip ? 'grid-cols-[2fr_1fr]' : ''}`}>
            <button type="button" onClick={finish} className="min-h-[54px] rounded-full border-0 text-[17px] font-extrabold text-white" style={{ background: territory.color }}>
              C'est fait !
            </button>
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
