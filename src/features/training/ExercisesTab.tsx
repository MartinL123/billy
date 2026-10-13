import { useState } from 'react'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon, LockIcon } from '../../components/Icons'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import { CHEWS, chewSessionId } from '../../lib/chews'
import { formatRelative, type ISODate } from '../../lib/dates'
import { GAMES, gameSessionId, isExercise } from '../../lib/gamification'
import { EXERCISES, exerciseById, exerciseStatus, fearLabel, fearSummaries, isUnlocked, mastery, type Theme } from '../../lib/training'
import { ChewCard, ExerciseCard, ExpandableRow, GameCard } from './Cards'
import { MasteryBars, MasteryText } from './Mastery'

const SECTIONS: { theme: Theme; title: string }[] = [
  { theme: 'bases', title: 'Bases' },
  { theme: 'proprete', title: 'Propreté' },
  { theme: 'socialisation', title: 'Socialisation' },
  { theme: 'avance', title: 'Plus tard' },
]

const pill = 'shrink-0 rounded-xl bg-[#EEF0EE] px-2.5 py-1 text-[13px] font-semibold text-[#3F4946]'

interface ExercisesTabProps {
  today: ISODate
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  onExposure: (trigger?: string) => void
}

/** Tout le catalogue : ordres, jeux, choses à mâcher, peurs. Un tap déplie la carte pour noter. */
export function ExercisesTab({ today, sessions, exposures, onExposure }: ExercisesTabProps) {
  const [open, setOpen] = useState<string | null>(null)
  const exerciseSessions = sessions.filter(isExercise)
  const fears = fearSummaries(exposures)
  const toggle = (id: string) => setOpen(open === id ? null : id)
  const count = (id: string) => sessions.filter((s) => s.exerciseId === id).length

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map(({ theme, title }) => {
        const items = EXERCISES.filter((e) => e.theme === theme)
        const acquired = items.filter((e) => exerciseStatus(exerciseSessions, e.id) === 'acquis').length
        return (
          <section key={theme} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[19px] font-bold">{title}</h2>
              <span className="text-sm font-semibold text-muted">
                {acquired} sur {items.length} acquis
              </span>
            </div>
            {theme === 'avance' && <p className="text-[15px] leading-snug text-muted">Des ordres pour la suite. Ils entrent dans le programme du jour quand leurs bases sont acquises, mais tu peux les essayer avant.</p>}
            <div className="card overflow-hidden">
              {items.map((item, i) => {
                const level = mastery(exerciseSessions, item.id)
                const locked = !isUnlocked(exerciseSessions, item)
                const isAcquired = exerciseStatus(exerciseSessions, item.id) === 'acquis'
                return (
                  <ExpandableRow
                    key={item.id}
                    name={item.name}
                    detail={locked ? `Après : ${(item.requires ?? []).map((id) => exerciseById(id)?.name).join(', ')}` : <MasteryText mastery={level} acquired={isAcquired} />}
                    right={
                      locked ? (
                        <LockIcon size={18} className="shrink-0 text-muted" />
                      ) : level.count > 0 ? (
                        <MasteryBars recent={level.recent} />
                      ) : (
                        <span className={pill}>À découvrir</span>
                      )
                    }
                    open={open === item.id}
                    first={i === 0}
                    onToggle={() => toggle(item.id)}
                  >
                    <ExerciseCard exercise={item} today={today} sessions={exerciseSessions} />
                  </ExpandableRow>
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Jeux</h2>
        <div className="card overflow-hidden">
          {GAMES.map((game, i) => {
            const id = gameSessionId(game)
            const plays = count(id)
            return (
              <ExpandableRow
                key={id}
                name={game.name}
                detail={`${game.minutes} min · ${game.skill}`}
                right={plays > 0 ? <span className={pill}>Joué {plays} fois</span> : undefined}
                open={open === id}
                first={i === 0}
                onToggle={() => toggle(id)}
              >
                <GameCard game={game} today={today} sessions={sessions} />
              </ExpandableRow>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">À mâcher</h2>
        <div className="card overflow-hidden">
          {CHEWS.map((chew, i) => {
            const id = chewSessionId(chew)
            const given = count(id)
            return (
              <ExpandableRow
                key={id}
                name={chew.name}
                detail={chew.frozen ? 'À préparer au congélateur' : 'Prêt tout de suite'}
                right={given > 0 ? <span className={pill}>Donné {given} fois</span> : undefined}
                open={open === id}
                first={i === 0}
                onToggle={() => toggle(id)}
              >
                <ChewCard chew={chew} today={today} sessions={sessions} />
              </ExpandableRow>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Peurs</h2>
        {fears.length > 0 ? (
          <div className="card overflow-hidden">
            {fears.map((fear, i) => (
              <button
                key={fear.trigger}
                type="button"
                onClick={() => onExposure(fear.trigger)}
                className={`flex min-h-[60px] w-full items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left ${i ? 'border-t border-solid border-divider' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold text-text">{fear.trigger}</span>
                  <span className="text-[13px] text-muted">
                    {fear.latest.fear}/5 · {fearLabel(fear.latest.fear)} · {formatRelative(fear.latest.date, today)}
                  </span>
                </span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[15px] leading-snug text-muted">La ruelle, les enfants, un reflet la nuit : note ce qui lui fait peur. Sa plus grande peur devient le défi du jour.</p>
        )}
        <button type="button" onClick={() => onExposure()} className={outlineButton}>
          Noter une exposition
        </button>
      </section>
    </div>
  )
}
