import { useState } from 'react'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon } from '../../components/Icons'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import { formatRelative, type ISODate } from '../../lib/dates'
import { GAMES, gameSessionId, isGame } from '../../lib/gamification'
import { EXERCISES, exerciseStatus, fearLabel, fearSummaries, STATUS_LABEL, type Status, type Theme } from '../../lib/training'
import { ExerciseCard, GameCard } from './Cards'

const STATUS_TONE: Record<Status, string> = {
  'a-decouvrir': 'bg-[#EEF0EE] text-[#3F4946]',
  'en-cours': 'bg-info-soft text-info',
  acquis: 'bg-primary-soft text-primary-dark',
}

const SECTIONS: { theme: Theme; title: string }[] = [
  { theme: 'bases', title: 'Bases' },
  { theme: 'proprete', title: 'Propreté' },
  { theme: 'socialisation', title: 'Socialisation' },
]

interface ExercisesTabProps {
  today: ISODate
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  onExposure: (trigger?: string) => void
}

/** Tous les exercices, les jeux et les peurs. Un tap ouvre la carte pour noter. */
export function ExercisesTab({ today, sessions, exposures, onExposure }: ExercisesTabProps) {
  const [open, setOpen] = useState<string | null>(null)
  const exerciseSessions = sessions.filter((s) => !isGame(s))
  const fears = fearSummaries(exposures)
  const toggle = (id: string) => setOpen(open === id ? null : id)

  const row = (id: string, name: string, detail: string, pill: { text: string; tone: string } | null, first: boolean) => (
    <button
      type="button"
      aria-expanded={open === id}
      onClick={() => toggle(id)}
      className={`flex min-h-[60px] w-full items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left ${first ? '' : 'border-t border-solid border-divider'}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-text">{name}</span>
        <span className="text-[13px] text-muted">{detail}</span>
      </span>
      {pill && <span className={`shrink-0 rounded-xl px-2.5 py-1 text-[13px] font-semibold ${pill.tone}`}>{pill.text}</span>}
    </button>
  )

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
            <div className="card overflow-hidden">
              {items.map((item, i) => {
                const status = exerciseStatus(exerciseSessions, item.id)
                const last = exerciseSessions.find((s) => s.exerciseId === item.id)
                return (
                  <div key={item.id}>
                    {row(item.id, item.name, last ? `Dernière séance ${formatRelative(last.date, today)}` : 'Jamais travaillé', { text: STATUS_LABEL[status], tone: STATUS_TONE[status] }, i === 0)}
                    {open === item.id && (
                      <div className="bg-bg p-2">
                        <ExerciseCard exercise={item} today={today} sessions={exerciseSessions} />
                      </div>
                    )}
                  </div>
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
            const plays = sessions.filter((s) => s.exerciseId === id).length
            return (
              <div key={game.id}>
                {row(id, game.name, `${game.minutes} min · ${game.skill}`, plays ? { text: `Joué ${plays} fois`, tone: STATUS_TONE.acquis } : null, i === 0)}
                {open === id && (
                  <div className="bg-bg p-2">
                    <GameCard game={game} today={today} sessions={sessions} />
                  </div>
                )}
              </div>
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
          <p className="text-[15px] leading-snug text-muted">La ruelle, les enfants, un reflet la nuit : note ce qui lui fait peur pour suivre ses progrès. Sa plus grande peur devient le défi du jour.</p>
        )}
        <button type="button" onClick={() => onExposure()} className={outlineButton}>
          Noter une exposition
        </button>
      </section>
    </div>
  )
}
