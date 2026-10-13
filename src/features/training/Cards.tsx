import { useState, type ReactNode } from 'react'
import { CheckIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { deleteExposure, deleteSession, newId, saveExposure, saveSession } from '../../firebase/db'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import type { ISODate } from '../../lib/dates'
import { gameSessionId, type Game } from '../../lib/gamification'
import { FEAR_LEVELS, fearLabel, RESULTS, type Exercise, type SessionResult } from '../../lib/training'

const resultLabel = (result: SessionResult) => RESULTS.find((r) => r.value === result)?.label ?? ''
const now = () => new Date().toISOString()

/** Carte « fait » : ce qui a été noté, et de quoi l'annuler. */
function DoneCard({ title, result, pending, onUndo }: { title: string; result: string; pending: boolean; onUndo: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-primary-soft px-4 py-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <CheckIcon size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-primary-dark">{title}</span>
        <span className="text-[13px] text-primary-dark">{result}</span>
        <Pending show={pending} />
      </span>
      <button type="button" onClick={onUndo} aria-label={`Annuler : ${title}`} className="h-11 shrink-0 border-0 bg-transparent px-2 text-[15px] font-semibold text-primary">
        Annuler
      </button>
    </div>
  )
}

function TodoCard({ label, title, detail, children }: { label?: string; title: string; detail?: ReactNode; children: ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        {label && <span className="text-[12px] font-bold tracking-[0.5px] text-muted uppercase">{label}</span>}
        <span className="text-[17px] leading-tight font-bold">{title}</span>
        {detail && <span className="text-[15px] leading-snug text-muted">{detail}</span>}
      </div>
      {children}
    </div>
  )
}

interface ExerciseCardProps {
  exercise: Exercise
  today: ISODate
  sessions: WithId<TrainingSession>[]
  label?: string
  advice?: string
}

/** Un exercice à faire : la consigne, puis un tap sur le résultat. */
export function ExerciseCard({ exercise, today, sessions, label, advice }: ExerciseCardProps) {
  const done = sessions.find((s) => s.exerciseId === exercise.id && s.date === today)
  if (done) {
    return <DoneCard title={exercise.name} result={`${resultLabel(done.result)} aujourd'hui`} pending={done.pending} onUndo={() => deleteSession(done.id)} />
  }
  const save = (result: SessionResult) => saveSession(newId('sessions'), { date: today, exerciseId: exercise.id, result, createdAt: now() })
  return (
    <TodoCard
      label={label}
      title={exercise.name}
      detail={
        <>
          {exercise.tip}
          {advice && <span className="mt-1 block font-medium text-info">{advice}</span>}
        </>
      }
    >
      <div role="group" aria-label={`Résultat de la séance « ${exercise.name} »`} className="grid grid-cols-3 gap-2">
        {RESULTS.map(({ value, label: text }) => (
          <button
            key={value}
            type="button"
            onClick={() => save(value)}
            className={`h-12 rounded-full text-[15px] font-bold ${value === 'reussi' ? 'border-0 bg-primary text-white' : 'border-[1.5px] border-primary bg-surface text-primary'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </TodoCard>
  )
}

/** Un jeu : les règles à déplier, puis un tap quand c'est joué. */
export function GameCard({ game, today, sessions, label }: { game: Game; today: ISODate; sessions: WithId<TrainingSession>[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const id = gameSessionId(game)
  const done = sessions.find((s) => s.exerciseId === id && s.date === today)
  if (done) return <DoneCard title={game.name} result="Joué aujourd'hui" pending={done.pending} onUndo={() => deleteSession(done.id)} />
  return (
    <TodoCard label={label} title={game.name} detail={`${game.minutes} min · fait travailler : ${game.skill}`}>
      {open && (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {game.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">{i + 1}</span>
              <span className="pt-0.5 text-[15px] leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="h-12 rounded-full border-[1.5px] border-primary bg-surface text-[15px] font-bold text-primary">
          {open ? 'Masquer les règles' : 'Voir les règles'}
        </button>
        <button
          type="button"
          onClick={() => saveSession(newId('sessions'), { date: today, exerciseId: id, result: 'reussi', createdAt: now() })}
          className="h-12 rounded-full border-0 bg-primary text-[15px] font-bold text-white"
        >
          C'est joué
        </button>
      </div>
    </TodoCard>
  )
}

interface FearCardProps {
  trigger: string
  today: ISODate
  exposures: WithId<Exposure>[]
  label?: string
  onDetails: () => void
}

const sameTrigger = (a: string, b: string) => a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr')

/** Une exposition douce à une peur : un tap sur son niveau de peur, de 1 à 5. */
export function FearCard({ trigger, today, exposures, label, onDetails }: FearCardProps) {
  const done = exposures.find((e) => e.date === today && sameTrigger(e.trigger, trigger))
  if (done) {
    return <DoneCard title={trigger} result={`Noté ${done.fear}/5 · ${fearLabel(done.fear)}`} pending={done.pending} onUndo={() => deleteExposure(done.id)} />
  }
  return (
    <TodoCard label={label} title={trigger} detail="Approche-toi doucement, en restant à une distance où il mange encore ses friandises. Comment a-t-il réagi ?">
      <div role="group" aria-label={`Niveau de peur face à « ${trigger} »`} className="flex flex-col gap-1.5">
        <div className="grid grid-cols-5 gap-1.5">
          {FEAR_LEVELS.map(({ value, label: text }) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} sur 5 : ${text}`}
              onClick={() => saveExposure(newId('exposures'), { date: today, trigger, fear: value, createdAt: now() })}
              className="h-12 rounded-full border-[1.5px] border-primary bg-surface text-[17px] font-bold text-primary"
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[13px] text-muted">
          <span>1 : serein</span>
          <span>5 : panique</span>
        </div>
      </div>
      <button type="button" onClick={onDetails} className="h-11 self-start border-0 bg-transparent p-0 text-[15px] font-semibold text-primary">
        Ajouter la distance ou une note
      </button>
    </TodoCard>
  )
}
