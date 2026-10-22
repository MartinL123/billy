import { useEffect, useRef, useState } from 'react'
import { BackLink } from '../../components/BackLink'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckIcon, ChevronRightIcon, TargetIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { inkOn, stepPhrase, territoryOf } from '../../content/phrases'
import { bossById, EXERCISES, exerciseById, MAX_LEVEL, type Exercise as ExerciseInfo } from '../../content/training'
import { useData } from '../../firebase/store'
import { completeQuest } from '../../firebase/training'
import { activeSkills } from '../../lib/active'
import { QUEST_XP, REST_IDEAS } from '../../lib/quest'
import { currentDifficulty } from '../../lib/session'
import { formatCountdown, secondsLeft } from '../../lib/timer'
import { currentExercise, exercisesForStep, neededTreats, sessionMinutes } from '../../lib/training-plan'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { BonesGained } from '../../components/BoneIcon'
import { BONES } from '../../lib/bones'
import { SkillPill } from '../billy/SkillPill'
import { useQuest } from '../today/useQuest'
import { Illustration } from './Illustration'
import { place } from '../../lib/garden'
import { sessionStart } from '../../firebase/journal'
import { dogName } from '../../lib/dogName'

const GENERIC_TIP = 'S’il ne mange plus, il est trop stressé : arrêtez et revenez plus facile la prochaine fois.'

interface WakeLockLike {
  release: () => Promise<void>
}

/** Un petit son de fin, sans fichier : trois bips. Le contexte audio est ouvert au toucher de « Lancer ». */
function beep(audio: AudioContext | null) {
  if (!audio) return
  for (const at of [0, 0.35, 0.7]) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, audio.currentTime + at)
    gain.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + at + 0.25)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(audio.currentTime + at)
    oscillator.stop(audio.currentTime + at + 0.3)
  }
}

/** Minuteur de la séance : l’écran reste allumé, la fin s’affiche et sonne. Pas de vibration (Safari iPhone ne la gère pas). */
function useTimer(minutes: number) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(0)
  const [finished, setFinished] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const lock = useRef<WakeLockLike | null>(null)

  const release = () => {
    void lock.current?.release().catch(() => undefined)
    lock.current = null
  }

  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const remaining = secondsLeft(endsAt, Date.now())
      setLeft(remaining)
      if (remaining <= 0) {
        setEndsAt(null)
        setFinished(true)
        beep(audio.current)
        release()
      }
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [endsAt])

  useEffect(() => release, [])

  const start = () => {
    setFinished(false)
    setEndsAt(Date.now() + minutes * 60_000)
    try {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      audio.current ??= Context ? new Context() : null
      void audio.current?.resume()
    } catch {
      audio.current = null
    }
    const wake = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock
    void wake
      ?.request('screen')
      .then((sentinel) => {
        lock.current = sentinel
      })
      .catch(() => undefined)
  }
  const stop = () => {
    setEndsAt(null)
    release()
  }
  return { running: endsAt !== null, left, finished, start, stop, dismiss: () => setFinished(false) }
}

const sectionTitle = 'surtitre text-muted'

/** Journée de repos : une page simple, sans minuteur. Elle compte comme une vraie action. */
function RestDay() {
  const { quest, skips, done } = useQuest()
  const { dog } = useData()
  const today = useToday()
  const back = useBack('/')
  const toast = useToast()
  const finish = () => {
    completeQuest(today, { kind: 'repos' }, skips, QUEST_XP)
    toast(<BonesGained label="Journée de repos notée" amount={BONES.mission + BONES.rest} />, undefined, { bones: true })
    back()
  }
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex flex-col gap-3 rounded-b-panel bg-primary px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[22px] text-white">
        <BackLink label="Accueil" onClick={back} onDark />
        <p className="surtitre">Mission du jour</p>
        <h1 className="title-screen">Aujourd’hui, repos</h1>
        <p className="text-[0.8824rem] leading-snug text-white/90">{quest.afterHardDay ? 'Hier était difficile : aujourd’hui, on souffle.' : 'Un jour sans exercice l’aide à retenir ce qu’il apprend.'}</p>
      </header>
      <main className="flex flex-col gap-4 px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <h2 className={sectionTitle}>Des idées pour {dogName(dog)}</h2>
        <ul className="card m-0 flex list-none flex-col p-0">
          {REST_IDEAS.map((idea, i) => (
            <li key={idea} className={`px-4 py-3.5 text-[1rem] leading-snug ${i ? 'border-t border-divider' : ''}`}>
              {idea}
            </li>
          ))}
        </ul>
        <p className="text-[0.8824rem] leading-snug text-muted">Aucun exercice aujourd’hui. Le repos compte comme une vraie action.</p>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {done ? (
            <p className="flex min-h-[58px] items-center justify-center gap-2 rounded-full bg-gold-soft text-[1rem] font-bold text-[#5C4410]">
              <CheckIcon size={22} strokeWidth={3} />
              Journée de repos notée
            </p>
          ) : (
            <button type="button" onClick={finish} className="btn btn-main min-h-[58px] w-full text-[1.0588rem]">
              C’est fait !
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * L’écran d’un exercice : celui de la quête du jour, ou celui de l’étape en cours d’une compétence (« S’entraîner »).
 * Le geste, le réglage du jour, un minuteur, puis on le note.
 */
export default function Exercise() {
  const [params] = useSearchParams()
  const today0 = useQuest()
  // On fige d’où l’on vient : la quête peut être marquée faite pendant qu’on est sur l’écran.
  const [fromQuest] = useState(() => params.get('depuis') === 'quete')
  if (fromQuest && today0.quest.kind === 'repos') return <RestDay />
  return <ExerciseScreen fromQuest={fromQuest && Boolean(today0.quest.planned)} />
}

function ExerciseScreen({ fromQuest }: { fromQuest: boolean }) {
  const [params] = useSearchParams()
  const { dog, sessions, bossProgress } = useData()
  const { quest } = useQuest()
  const today = useToday()
  const navigate = useNavigate()
  const back = useBack('/')

  // La compétence : celle de la quête, celle demandée, sinon la première compétence en cours.
  const [skillId] = useState(() => (fromQuest && quest.bossId) || params.get('competence') || activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress)[0] || 'lien')
  const acquired = bossProgress[skillId]?.level ?? 0
  const [exercise, setExercise] = useState<ExerciseInfo>(() => (fromQuest && quest.planned?.exercise) || exerciseById(params.get('exercice') ?? '') || currentExercise(skillId, acquired)?.exercise || EXERCISES[0]!)
  const [picking, setPicking] = useState(false)
  // T-066 : début de séance (sa durée est notée quand le moment est enregistré).
  useEffect(() => sessionStart(skillId), []) // eslint-disable-line react-hooks/exhaustive-deps
  const minutes = sessionMinutes(dog.birthDate, today)
  const timer = useTimer(minutes)

  // Le réglage vient de l’étape en cours ; pour un autre exercice, celui de sa dernière séance.
  const planned = (fromQuest && quest.planned?.exercise.id === exercise.id ? quest.planned : undefined) ?? exercisesForStep(skillId, acquired).find((p) => p.exercise.id === exercise.id)
  const level = planned?.level ?? currentDifficulty(sessions, exercise.id)
  const setting = place(exercise.levels[level - 1] ?? '')
  const easier = level > 1 ? place(exercise.levels[level - 2] ?? '') : undefined
  const skill = exercise.bossIds.includes(skillId) ? skillId : exercise.bossIds[0]!
  const territory = territoryOf(skill)
  const step = Math.min(MAX_LEVEL, (bossProgress[skill]?.level ?? 0) + 1)
  const pill = 'flex min-h-9 items-center rounded-full bg-white/16 px-3 text-[0.8824rem] font-bold'

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="flex flex-col gap-3 rounded-b-panel px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-[22px] text-white" style={{ background: inkOn(territory) }}>
        <BackLink label={fromQuest ? 'Accueil' : 'Retour'} onClick={back} onDark />
        {fromQuest && <p className="surtitre">Mission du jour</p>}
        <h1 className="title-screen">{exercise.name}</h1>
        <SkillPill bossId={skill} onDark />
        <p className="text-[0.8824rem] leading-snug text-white/90">Étape « {stepPhrase(skill, step)} »</p>
        <div className="flex flex-wrap gap-2">
          <span className={pill} style={{ background: 'rgba(255,255,255,0.16)' }}>
            {minutes}{'\u00a0'}min
          </span>
          <span className={pill} style={{ background: 'rgba(255,255,255,0.16)' }}>
            {setting}
          </span>
        </div>
      </header>

      <main className="flex flex-col gap-5 px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+170px)]">
        {exercise.scene && <Illustration scene={exercise.scene} className="h-[150px] bg-surface" />}

        <section className="card flex flex-col gap-2 p-4">
          <h2 className={sectionTitle}>Ce qu’il faut</h2>
          <p className="text-[1rem] leading-snug">
            {neededTreats(dog.treats)}
            {exercise.needs ? `. ${exercise.needs}` : ''}.
          </p>
        </section>

        {/* Gelé (T-072) : « Un spot calme pour ça » lisait les spots de la meute et menait à la meute. */}

        <section className="card flex flex-col gap-3 p-4">
          <h2 className={sectionTitle}>Comment faire</h2>
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {exercise.steps.map((text, i) => (
              <li key={text} className="flex items-start gap-3">
                {/* Rond de 28 px, centré sur la première ligne : le texte a un interligne de 28 px. */}
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[0.8824rem] leading-none font-bold text-white" style={{ background: inkOn(territory) }}>
                  {i + 1}
                </span>
                <span className="text-[1rem] leading-7">{place(text)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-2 rounded-field bg-[#FFF8E6] p-4">
          <h2 className="text-gold-dark surtitre">Bon à savoir</h2>
          {exercise.caution && <p className="text-[1rem] leading-snug font-semibold text-gold-dark">{exercise.caution}</p>}
          <p className="text-[1rem] leading-snug text-gold-dark">{place(GENERIC_TIP)}</p>
          {!exercise.verified && <p className="text-[0.8824rem] text-gold-dark">Exercice à vérifier avec votre éducateur.</p>}
        </section>

        {easier && (
          <section className="flex flex-col gap-1.5">
            <h2 className={sectionTitle}>Trop difficile aujourd’hui ?</h2>
            <p className="text-[1rem] leading-snug">Revenez au réglage d’avant : « {easier} ». L’étape, elle, ne recule pas.</p>
          </section>
        )}

        <p className="flex min-h-11 flex-wrap items-center gap-x-1 px-1 text-[0.7647rem] text-muted">
          Source :{' '}
          {exercise.source.url ? (
            <a href={exercise.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold underline" style={{ color: inkOn(territory) }}>
              {exercise.source.name}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
              </svg>
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ) : (
            exercise.source.name
          )}
        </p>

        {!fromQuest && (
          <>
            <button type="button" onClick={() => setPicking(true)} className="card-link w-full">
              <span className="flex-1 text-[1rem] font-semibold">Choisir un autre exercice</span>
              <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
            </button>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto flex max-w-[430px] flex-col gap-2 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {timer.running ? (
            <div role="timer" aria-live="off" className="flex min-h-[58px] items-center justify-between gap-3 rounded-full bg-primary pr-1.5 pl-6 text-white">
              <span className="font-display text-[1.7647rem] leading-none font-bold tabular-nums">{formatCountdown(timer.left)}</span>
              <button type="button" onClick={timer.stop} className="whitespace-nowrap min-h-12 rounded-full border-2 border-solid border-white/70 bg-transparent px-5 text-[1rem] font-bold text-white">
                Arrêter
              </button>
            </div>
          ) : (
            <button type="button" onClick={timer.start} className="btn btn-main min-h-[58px] text-[1.0588rem]">
              <TargetIcon size={22} />
              Lancer le minuteur · {minutes}{'\u00a0'}min
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(fromQuest ? '/noter?depuis=quete' : `/noter?depuis=exercice&competences=${skill}`)}
            className="min-h-12 rounded-full border-2 border-solid bg-transparent text-[1rem] font-bold"
            style={{ borderColor: territory.color, color: inkOn(territory) }}
          >
            C’est fait !
          </button>
        </div>
      </div>

      {timer.finished && (
        <Sheet label="Temps écoulé" onClose={timer.dismiss}>
          <h2 className="title-section mt-1">C’est fini, bravo !</h2>
          <p className="text-[1rem] leading-snug">Les {minutes} minutes sont passées. On s’arrête sur une réussite.</p>
          <button type="button" onClick={() => navigate(fromQuest ? '/noter?depuis=quete' : `/noter?depuis=exercice&competences=${skill}`)} className="btn btn-main min-h-[58px] text-[1.0588rem]">
            C’est fait, je le note
          </button>
          <button type="button" onClick={timer.dismiss} className="btn btn-tertiary">
            Rester sur l’exercice
          </button>
        </Sheet>
      )}

      {picking && (
        <Sheet label="Choisir un exercice" onClose={() => setPicking(false)}>
          <h2 className="title-section my-1">Choisir un exercice</h2>
          <div className="flex flex-col gap-2">
            {EXERCISES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === exercise.id}
                onClick={() => {
                  setExercise(item)
                  setPicking(false)
                }}
                className={`flex min-h-16 items-center gap-3 rounded-field border-2 border-solid px-4 py-2 text-left ${item.id === exercise.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="title-card">{item.name}</span>
                  <span className={`text-[0.8824rem] ${item.id === exercise.id ? 'text-white/85' : 'text-muted'}`}>{item.bossIds.map((id) => bossById(id)?.short).join(' · ')}</span>
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
