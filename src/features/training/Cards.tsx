import { useState, type ReactNode } from 'react'
import { CheckIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useToast } from '../../components/Toast'
import { deleteExposure, deleteSession, newId, saveExposure, saveSession } from '../../firebase/db'
import type { Exposure, TrainingSession, WithId } from '../../firebase/types'
import { CHEW_RULES, chewSessionId, type Chew } from '../../lib/chews'
import type { ISODate } from '../../lib/dates'
import { gameSessionId, type Game } from '../../lib/gamification'
import { FEAR_LEVELS, fearLabel, levelGoal, markId, mastery, progress, RESULTS, SUCCESSES_TO_PASS, type Exercise, type SessionResult } from '../../lib/training'
import { Illustration } from './Illustration'
import { levelLabel, MasteryBars, Pips } from './Mastery'

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

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-dark">{i + 1}</span>
          <span className="text-[15px] leading-snug">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function TodoCard({ label, title, scene, children }: { label?: string; title: string; scene?: string; children: ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-0.5">
        {label && <span className="text-[12px] font-bold tracking-[0.5px] text-muted uppercase">{label}</span>}
        <span className="text-[19px] leading-tight font-bold">{title}</span>
      </div>
      {scene && <Illustration scene={scene} className="h-[124px]" />}
      {children}
    </div>
  )
}

const primaryButton = 'h-12 rounded-full border-0 bg-primary text-[15px] font-bold text-white'
const outline = 'h-12 rounded-full border-[1.5px] border-primary bg-surface text-[15px] font-bold text-primary'

interface ExerciseCardProps {
  exercise: Exercise
  today: ISODate
  /** Toutes les séances, y compris les marques « il sait déjà ». */
  sessions: WithId<TrainingSession>[]
  label?: string
  advice?: string
}

/** Un ordre à travailler : son palier du moment, le dessin, puis un tap sur le résultat. */
export function ExerciseCard({ exercise, today, sessions, label, advice }: ExerciseCardProps) {
  const toast = useToast()
  const [showSteps, setShowSteps] = useState(false)
  const state = progress(sessions, exercise)
  const done = sessions.find((s) => s.exerciseId === exercise.id && s.date === today)

  if (done) {
    const validatedToday = state.validations.includes(today)
    const next = validatedToday
      ? state.maintenance
        ? 'Dernier palier validé ! Place à l’entretien.'
        : `Palier ${state.level - 1} validé ! Prochaine fois : palier ${state.level}.`
      : state.maintenance
        ? 'Entretien'
        : `Palier ${state.level} · ${state.successes} réussite${state.successes > 1 ? 's' : ''} sur ${SUCCESSES_TO_PASS}`
    return <DoneCard title={exercise.name} result={`${resultLabel(done.result)} · ${next}`} pending={done.pending} onUndo={() => deleteSession(done.id)} />
  }

  const save = (result: SessionResult) => saveSession(newId('sessions'), { date: today, exerciseId: exercise.id, result, createdAt: now() })
  // « Il sait déjà » et « trop dur » déplacent le palier sans compter comme une séance.
  const move = (forward: boolean) => {
    const id = newId('sessions')
    saveSession(id, { date: today, exerciseId: markId(exercise.id), result: forward ? 'reussi' : 'difficile', createdAt: now() })
    toast(forward ? `${exercise.name} : palier ${state.level} validé d’office.` : `${exercise.name} : retour au palier ${state.level - 1}.`, { label: 'Annuler', run: () => deleteSession(id) })
  }
  const recent = mastery(sessions, exercise.id).recent
  const stepsVisible = state.level <= 2 || showSteps
  const link = 'min-h-11 border-0 bg-transparent p-0 text-left text-[15px] font-semibold text-primary'

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {label && <span className="text-[12px] font-bold tracking-[0.5px] text-muted uppercase">{label}</span>}
          <span className="text-[19px] leading-tight font-bold">{exercise.name}</span>
        </div>
        <span className="shrink-0 rounded-xl bg-primary-soft px-2.5 py-1 text-[13px] font-bold text-primary-dark">{levelLabel(state)}</span>
      </div>

      <Illustration scene={exercise.scene} className="h-[124px]" />

      <p className="rounded-field bg-milestone-soft px-3 py-2.5 text-[15px] leading-snug font-semibold text-[#5C2A08]">
        <span className="block text-[12px] font-bold tracking-[0.5px] uppercase opacity-80">Objectif du palier</span>
        {levelGoal(exercise, state.level)}
      </p>

      {stepsVisible ? (
        <Steps steps={exercise.steps} />
      ) : (
        <button type="button" onClick={() => setShowSteps(true)} className={link}>
          Revoir le geste de base
        </button>
      )}

      {advice && <p className="rounded-field bg-info-soft px-3 py-2.5 text-sm leading-snug font-medium text-[#1D3F73]">{advice}</p>}

      {(!state.maintenance || recent.length > 0) && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <Pips progress={state} />
            {!state.maintenance && `pour passer au palier ${state.level + 1 > state.total ? 'd’entretien' : state.level + 1}`}
          </span>
          <MasteryBars recent={recent} />
        </div>
      )}

      <div role="group" aria-label={`Résultat de la séance « ${exercise.name} »`} className="grid grid-cols-3 gap-2">
        {RESULTS.map(({ value, label: text }) => (
          <button key={value} type="button" onClick={() => save(value)} className={value === 'reussi' ? primaryButton : outline}>
            {text}
          </button>
        ))}
      </div>

      {(!state.maintenance || state.level > 1) && (
        <div className="flex flex-wrap justify-between gap-x-4">
          {!state.maintenance && (
            <button type="button" onClick={() => move(true)} className={link}>
              Il sait déjà le faire
            </button>
          )}
          {state.level > 1 && (
            <button type="button" onClick={() => move(false)} className={`${link} ${state.struggling ? 'text-danger' : 'text-muted'}`}>
              Trop dur : palier précédent
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Un jeu : les règles à déplier, puis un tap quand c'est joué. */
export function GameCard({ game, today, sessions, label }: { game: Game; today: ISODate; sessions: WithId<TrainingSession>[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const id = gameSessionId(game)
  const done = sessions.find((s) => s.exerciseId === id && s.date === today)
  if (done) return <DoneCard title={game.name} result="Joué aujourd'hui" pending={done.pending} onUndo={() => deleteSession(done.id)} />
  return (
    <TodoCard label={label} title={game.name} scene={game.scene}>
      <span className="text-[15px] text-muted">
        {game.minutes} min · fait travailler : {game.skill}
      </span>
      {open && <Steps steps={game.steps} />}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={outline}>
          {open ? 'Masquer les règles' : 'Voir les règles'}
        </button>
        <button type="button" onClick={() => saveSession(newId('sessions'), { date: today, exerciseId: id, result: 'reussi', createdAt: now() })} className={primaryButton}>
          C'est joué
        </button>
      </div>
    </TodoCard>
  )
}

/** Une chose à mâcher : la préparation, puis un tap quand c'est donné. */
export function ChewCard({ chew, today, sessions, label }: { chew: Chew; today: ISODate; sessions: WithId<TrainingSession>[]; label?: string }) {
  const id = chewSessionId(chew)
  const done = sessions.find((s) => s.exerciseId === id && s.date === today)
  if (done) return <DoneCard title={chew.name} result="Donné aujourd'hui" pending={done.pending} onUndo={() => deleteSession(done.id)} />
  return (
    <TodoCard label={label} title={chew.name} scene={chew.frozen ? 'macher-froid' : 'macher'}>
      <Steps steps={chew.steps} />
      <p className="text-[13px] leading-snug text-muted">{CHEW_RULES}</p>
      <button type="button" onClick={() => saveSession(newId('sessions'), { date: today, exerciseId: id, result: 'reussi', createdAt: now() })} className={primaryButton}>
        C'est donné
      </button>
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
    <TodoCard label={label} title={trigger} scene="bruits">
      <Steps steps={['Approche doucement, en restant à une distance où il mange encore.', 'Une friandise à chaque regard calme, puis repars.']} />
      <div role="group" aria-label={`Niveau de peur face à « ${trigger} »`} className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">Comment a-t-il réagi ?</span>
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

interface RowProps {
  name: string
  detail: ReactNode
  left?: ReactNode
  /** Profondeur dans l'arbre. */
  depth?: number
  right?: ReactNode
  open: boolean
  first: boolean
  onToggle: () => void
  children: ReactNode
}

/** Ligne de catalogue : un tap la déplie sur sa carte. */
export function ExpandableRow({ name, detail, left, depth = 0, right, open, first, onToggle, children }: RowProps) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ paddingLeft: 16 + depth * 22 }}
        className={`flex min-h-[60px] w-full items-center gap-3 border-0 bg-transparent py-2.5 pr-4 text-left ${first ? '' : 'border-t border-solid border-divider'}`}
      >
        {depth > 0 && (
          <span aria-hidden="true" className="-mr-1 text-lg leading-none text-[#9AA39F]">
            ↳
          </span>
        )}
        {left}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold text-text">{name}</span>
          <span className="text-[13px] text-muted">{detail}</span>
        </span>
        {right}
      </button>
      {open && <div className="bg-bg p-2">{children}</div>}
    </div>
  )
}
