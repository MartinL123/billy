import { useState } from 'react'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon, LockIcon, StarIcon } from '../../components/Icons'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import { CHEWS, chewSessionId } from '../../lib/chews'
import { formatRelative, type ISODate } from '../../lib/dates'
import { GAMES, gameSessionId } from '../../lib/gamification'
import { EXERCISES, exerciseById, fearLabel, fearSummaries, isUnlocked, mastery, progress, SUCCESSES_TO_PASS, type Exercise, type Progress } from '../../lib/training'
import { ChewCard, ExerciseCard, ExpandableRow, GameCard } from './Cards'
import { levelLabel, MasteryBars } from './Mastery'

const pill = 'shrink-0 rounded-xl bg-[#EEF0EE] px-2.5 py-1 text-[13px] font-semibold text-[#3F4946]'

/** Ordres dans l'ordre de l'arbre : chaque ordre suivi de ceux qui en découlent. */
function tree(): { exercise: Exercise; depth: number }[] {
  const out: { exercise: Exercise; depth: number }[] = []
  const visit = (exercise: Exercise, depth: number) => {
    out.push({ exercise, depth })
    for (const child of EXERCISES.filter((e) => e.parent === exercise.id)) visit(child, depth + 1)
  }
  for (const root of EXERCISES.filter((e) => !e.parent && (e.theme === 'bases' || e.theme === 'tours'))) visit(root, 0)
  return out
}

/** Pastille d'un ordre : cadenas, numéro du palier, ou étoile en entretien. */
function Node({ locked, state }: { locked: boolean; state: Progress }) {
  const base = 'flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold'
  if (locked) {
    return (
      <span className={`${base} bg-placeholder text-muted`}>
        <LockIcon size={16} />
      </span>
    )
  }
  if (state.maintenance) {
    return (
      <span className={`${base} bg-[#F4C27A] text-primary-dark`}>
        <StarIcon size={18} />
      </span>
    )
  }
  return <span className={`${base} ${state.started ? 'bg-primary text-white' : 'border-2 border-solid border-primary text-primary'}`}>{state.level}</span>
}

interface ExercisesTabProps {
  today: ISODate
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  onExposure: (trigger?: string) => void
}

/** L'arbre des ordres, puis la vie quotidienne, les jeux, les choses à mâcher et les peurs. */
export function ExercisesTab({ today, sessions, exposures, onExposure }: ExercisesTabProps) {
  const [open, setOpen] = useState<string | null>(null)
  const fears = fearSummaries(exposures)
  const toggle = (id: string) => setOpen(open === id ? null : id)
  const count = (id: string) => sessions.filter((s) => s.exerciseId === id).length

  const row = (exercise: Exercise, depth: number, first: boolean) => {
    const state = progress(sessions, exercise)
    const locked = !isUnlocked(sessions, exercise)
    const detail = locked
      ? `Après : ${(exercise.requires ?? []).map(([id, levels]) => `${exerciseById(id)?.name} palier ${levels}`).join(', ')}`
      : !state.started
        ? 'À découvrir'
        : state.maintenance
          ? 'Tous les paliers validés · entretien'
          : `${levelLabel(state)} · ${state.successes} réussite${state.successes > 1 ? 's' : ''} sur ${SUCCESSES_TO_PASS}`
    return (
      <ExpandableRow
        key={exercise.id}
        name={exercise.name}
        detail={detail}
        depth={depth}
        left={<Node locked={locked} state={state} />}
        right={<MasteryBars recent={mastery(sessions, exercise.id).recent.slice(-5)} />}
        open={open === exercise.id}
        first={first}
        onToggle={() => toggle(exercise.id)}
      >
        <ExerciseCard exercise={exercise} today={today} sessions={sessions} />
      </ExpandableRow>
    )
  }

  const flat = (title: string, theme: Exercise['theme']) => (
    <section className="flex flex-col gap-3">
      <h2 className="text-[19px] font-bold">{title}</h2>
      <div className="card overflow-hidden">{EXERCISES.filter((e) => e.theme === theme).map((exercise, i) => row(exercise, 0, i === 0))}</div>
    </section>
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold">Arbre des ordres</h2>
        <p className="text-[15px] leading-snug text-muted">
          Chaque ordre a ses paliers, du plus facile au plus dur. Un ordre ouvre les suivants. Billy sait déjà quelque chose ? Ouvre l'ordre et touche « Il sait déjà le faire ».
        </p>
        <div className="card overflow-hidden">{tree().map(({ exercise, depth }, i) => row(exercise, depth, i === 0))}</div>
      </section>

      {flat('Propreté', 'proprete')}
      {flat('Socialisation', 'socialisation')}

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
