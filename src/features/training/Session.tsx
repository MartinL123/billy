import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckIcon, CloseIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { bossById, EXERCISES, exerciseById, MAX_DIFFICULTY, MAX_LEVEL, type Exercise } from '../../content/training'
import { addPlace, recordSession, type Outcome } from '../../firebase/training'
import { useData } from '../../firebase/store'
import { EMPTY_PROGRESS, needsPlace, remaining } from '../../lib/bossProgress'
import { successesThisWeek } from '../../lib/rhythm'
import { applyDecision, canValidate, currentDifficulty, DECISIONS, lastSession, REACTIONS, suggest, TRIALS } from '../../lib/session'
import { exercisesFor, guards, suggestedBosses } from '../../lib/traits'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { sessionXp, type Decision } from '../../lib/xp'
import { Celebration } from './Celebration'
import { Illustration } from './Illustration'
import { placeChosen, PlacePicker, type PlaceChoice } from './PlacePicker'

const bigChoice = (active: boolean) =>
  `min-h-[52px] rounded-field border-[1.5px] px-3 text-base ${active ? 'border-primary bg-primary font-bold text-white' : 'border-border bg-surface font-semibold text-text'}`

export default function Session() {
  const [params] = useSearchParams()
  const { dog, sessions, bossProgress, places } = useData()
  const today = useToday()
  const back = useBack('/dressage')
  const traits = dog.traits ?? []

  // Dernier exercice présélectionné ; depuis la fiche d'un boss, son premier exercice conseillé.
  const [exercise, setExercise] = useState<Exercise>(() => {
    const fromBoss = params.get('boss') ? exercisesFor(params.get('boss')!, traits)[0] : undefined
    const last = exerciseById(lastSession(sessions)?.exerciseId ?? '')
    return exerciseById(params.get('exercice') ?? '') ?? fromBoss ?? last ?? exercisesFor(suggestedBosses(traits)[0]!, traits)[0] ?? EXERCISES[0]!
  })
  const [bossId, setBossId] = useState(() => {
    const wanted = params.get('boss')
    if (wanted && exercise.bossIds.includes(wanted)) return wanted
    const previous = sessions.find((s) => s.exerciseId === exercise.id)?.bossId
    return previous && exercise.bossIds.includes(previous) ? previous : exercise.bossIds[0]!
  })
  const [difficulty, setDifficulty] = useState(() => currentDifficulty(sessions, exercise.id))
  const [trials, setTrials] = useState<boolean[]>([])
  const [picking, setPicking] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  // Feuille de fin
  const [ate, setAte] = useState<boolean | null>(null)
  const [reaction, setReaction] = useState<number | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [met, setMet] = useState<boolean | null>(null)
  const [place, setPlace] = useState<PlaceChoice>({})
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  const boss = bossById(bossId)!
  const progress = bossProgress[bossId] ?? EMPTY_PROGRESS
  const bossPlaces = places.filter((p) => p.bossId === bossId)
  const successes = trials.filter(Boolean).length
  const finished = trials.length >= TRIALS

  const choose = (next: Exercise) => {
    setExercise(next)
    setBossId(next.bossIds.includes(bossId) ? bossId : next.bossIds[0]!)
    setDifficulty(currentDifficulty(sessions, next.id))
    setTrials([])
    setPicking(false)
  }

  // ——— Bilan ———
  if (outcome) {
    const left = remaining(outcome.progress)
    const weekSuccesses = successesThisWeek(today, sessions, bossId)
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-5 px-5 pt-[calc(env(safe-area-inset-top)+32px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary text-white">
            <CheckIcon size={40} />
          </span>
          <h1 className="font-display text-[28px] leading-tight font-bold">Séance enregistrée</h1>
          <p className="font-display text-2xl font-bold text-primary">+{outcome.xp} XP</p>
        </div>
        <div className="card flex flex-col gap-3 p-4 text-[15px] leading-snug">
          <p>
            <span className="font-semibold">
              {weekSuccesses} réussite{weekSuccesses > 1 ? 's' : ''}
            </span>{' '}
            pour {boss.name} cette semaine.
          </p>
          <p>
            Prochaine séance de « {exercise.name} » : <span className="font-semibold">N{applyDecision(difficulty, decision ?? 'rester')}</span>.
          </p>
          {outcome.validated && left.target && !outcome.levelGained && (
            <p>
              Critère du palier P{left.target} validé : <span className="font-semibold">{left.done}/{left.needed}</span>
              {left.needed - left.done > 0 ? `, il en reste ${left.needed - left.done}, un autre jour.` : '.'}
            </p>
          )}
          {outcome.starPlaceId && <p className="font-semibold text-primary">Nouveau lieu validé : une étoile de maîtrise de plus.</p>}
          {decision === 'baisser' && <p className="text-muted">Baisser est une bonne décision : on reste sous son seuil.</p>}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <button type="button" onClick={back} className="h-[54px] rounded-full border-0 bg-primary text-[17px] font-bold text-white">
            Terminer
          </button>
          <button
            type="button"
            onClick={() => {
              outcome.undo()
              back()
            }}
            className="h-12 rounded-full border-0 bg-transparent text-[15px] font-semibold text-muted"
          >
            Annuler cette séance (erreur de saisie)
          </button>
        </div>
        {celebrating && outcome.levelGained && <Celebration boss={boss} level={outcome.levelGained} onClose={() => setCelebrating(false)} />}
      </main>
    )
  }

  // ——— Feuille de fin ———
  if (finished) {
    const suggestion = ate === null ? null : suggest(trials, ate)
    const allowed = ate !== null && reaction !== null && canValidate(ate, reaction)
    const mastery = progress.level >= MAX_LEVEL
    const target = mastery ? undefined : boss.levels[progress.level]
    const placeNeeded = allowed && met === true && needsPlace(progress)
    const ready = ate !== null && reaction !== null && decision !== null && (!allowed || met !== null) && (!placeNeeded || placeChosen(place))

    const save = () => {
      if (ate === null || reaction === null || decision === null || suggestion === null) return
      const placeId = placeNeeded ? (place.id ?? addPlace(place.name ?? '', bossId)) : undefined
      const result = recordSession(
        { date: today, exerciseId: exercise.id, bossId, difficulty, trials, ate, reaction, suggestion, decision, xp: sessionXp(trials, suggestion, decision) },
        bossProgress[bossId],
        allowed && met ? { placeId } : undefined,
      )
      setOutcome(result)
      setCelebrating(Boolean(result.levelGained))
    }

    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-5 px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <header className="flex flex-col gap-1">
          <p className="text-[15px] font-medium text-muted">{exercise.name} · N{difficulty}</p>
          <h1 className="font-display text-[28px] leading-tight font-bold">
            {successes} réussite{successes > 1 ? 's' : ''} sur {TRIALS}
          </h1>
        </header>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[17px] font-bold">A-t-il pris ses friandises ?</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={ate === true} onClick={() => setAte(true)} className={bigChoice(ate === true)}>
              Oui
            </button>
            <button type="button" aria-pressed={ate === false} onClick={() => setAte(false)} className={bigChoice(ate === false)}>
              Non
            </button>
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2.5 p-0 text-[17px] font-bold">Comment était-il ?</legend>
          <div className="flex flex-col gap-1.5">
            {REACTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                aria-pressed={reaction === r.value}
                onClick={() => setReaction(r.value)}
                className={`flex min-h-12 items-center gap-3 rounded-field border-[1.5px] px-3.5 text-left ${reaction === r.value ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}
              >
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-base font-bold ${reaction === r.value ? 'bg-primary text-white' : 'bg-bg text-text'}`}>{r.value}</span>
                <span className="flex flex-col">
                  <span className="text-base font-semibold">{r.label}</span>
                  <span className="text-[13px] text-muted">{r.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {suggestion && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-1 p-0 text-[17px] font-bold">Pour la prochaine séance</legend>
            <p className="mb-2.5 text-[15px] leading-snug text-muted">
              {ate === false ? 'Il n’a pas pris ses friandises : il était au-dessus de son seuil. ' : ''}
              Suggestion : <span className="font-semibold text-text">{DECISIONS.find((d) => d.value === suggestion)?.label}</span>. À toi de choisir.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DECISIONS.map((d) => (
                <button key={d.value} type="button" aria-pressed={decision === d.value} onClick={() => setDecision(d.value)} className={`${bigChoice(decision === d.value)} flex flex-col items-center justify-center py-1.5`}>
                  {d.label}
                  <span className={`text-[12px] font-semibold ${decision === d.value ? 'text-white/85' : 'text-muted'}`}>
                    {d.value === suggestion ? 'Suggéré' : `N${applyDecision(difficulty, d.value)}`}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {allowed && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-1 p-0 text-[17px] font-bold">{mastery ? 'Réussi dans un nouveau lieu ?' : 'Le critère du palier est-il atteint aujourd’hui ?'}</legend>
            <p className="mb-2.5 rounded-field bg-milestone-soft px-3 py-2.5 text-[15px] leading-snug font-semibold text-[#5C2A08]">
              {boss.name} · {mastery ? 'Maîtrise : chaque nouveau lieu ajoute une étoile' : `P${progress.level + 1} ${target?.title} : ${target?.criterion}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={met === true} onClick={() => setMet(true)} className={bigChoice(met === true)}>
                Oui
              </button>
              <button type="button" aria-pressed={met === false} onClick={() => setMet(false)} className={bigChoice(met === false)}>
                Pas encore
              </button>
            </div>
          </fieldset>
        )}

        {placeNeeded && <PlacePicker legend="Dans quel lieu ?" places={bossPlaces} value={place} onChange={setPlace} />}

        <button type="button" disabled={!ready} onClick={save} className="mt-auto h-[54px] shrink-0 rounded-full border-0 bg-primary text-[17px] font-bold text-white disabled:opacity-50">
          Enregistrer la séance
        </button>
      </main>
    )
  }

  // ——— Essais ———
  const guard = guards(traits)[0]
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <header className="flex items-center justify-between">
        <button type="button" onClick={back} aria-label="Quitter la séance" className="-ml-2 flex size-11 items-center justify-center rounded-full border-0 bg-transparent text-text">
          <CloseIcon />
        </button>
        <button type="button" onClick={() => setPicking(true)} disabled={trials.length > 0} className="h-11 border-0 bg-transparent px-2 text-base font-semibold text-primary disabled:text-muted">
          Changer d'exercice
        </button>
      </header>

      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] leading-tight font-bold">{exercise.name}</h1>
        {exercise.bossIds.length > 1 ? (
          <div role="group" aria-label="Boss travaillé" className="flex flex-wrap gap-2">
            {exercise.bossIds.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={id === bossId}
                disabled={trials.length > 0}
                onClick={() => setBossId(id)}
                className={`min-h-11 rounded-full border-[1.5px] px-3.5 text-[15px] ${id === bossId ? 'border-primary bg-primary-soft font-bold text-primary-dark' : 'border-border bg-surface font-medium text-text'}`}
              >
                {bossById(id)?.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-medium text-muted">Pour {boss.name}</p>
        )}

        <div className="card flex items-center gap-3 p-4">
          <div className="flex shrink-0 flex-col items-center">
            <span className="font-display text-[44px] leading-none font-bold text-primary">N{difficulty}</span>
            {trials.length === 0 && (
              <span className="mt-1.5 flex gap-1.5">
                <button type="button" aria-label="Baisser la difficulté" disabled={difficulty <= 1} onClick={() => setDifficulty(difficulty - 1)} className="size-11 rounded-full border-[1.5px] border-border bg-surface text-xl font-bold text-text disabled:opacity-40">
                  −
                </button>
                <button type="button" aria-label="Monter la difficulté" disabled={difficulty >= MAX_DIFFICULTY} onClick={() => setDifficulty(difficulty + 1)} className="size-11 rounded-full border-[1.5px] border-border bg-surface text-xl font-bold text-text disabled:opacity-40">
                  +
                </button>
              </span>
            )}
          </div>
          <p className="text-[17px] leading-snug font-semibold">{exercise.levels[difficulty - 1]}</p>
        </div>

        {showSteps ? (
          <div className="card flex flex-col gap-3 p-4">
            {exercise.scene && <Illustration scene={exercise.scene} className="h-[110px]" />}
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug">
              {exercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {exercise.caution && <p className="text-sm font-semibold text-danger">{exercise.caution}</p>}
            {!exercise.verified && <p className="text-sm text-muted">Fiche à vérifier avec l'éducateur.</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setShowSteps(true)} className="h-11 self-start border-0 bg-transparent p-0 text-[15px] font-semibold text-primary">
            Voir le geste
          </button>
        )}
        {guard && <p className="text-sm text-muted">{guard}.</p>}
      </div>

      <div className="mt-auto flex flex-col gap-4 pt-6">
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-[40px] leading-none font-bold" aria-live="polite">
            {trials.length}/{TRIALS}
          </p>
          <div className="flex gap-2" aria-hidden="true">
            {Array.from({ length: TRIALS }, (_, i) => (
              <span key={i} className={`size-4 rounded-full ${trials[i] === true ? 'bg-primary' : trials[i] === false ? 'bg-[#9AA39F]' : 'border-2 border-dashed border-[#9AA39F]'}`} />
            ))}
          </div>
          <button type="button" disabled={trials.length === 0} onClick={() => setTrials(trials.slice(0, -1))} className="h-11 border-0 bg-transparent px-3 text-[15px] font-semibold text-primary disabled:invisible">
            Corriger le dernier essai
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setTrials([...trials, false])} className="h-[72px] rounded-[22px] border-2 border-solid border-border bg-surface text-xl font-bold text-text">
            Raté
          </button>
          <button type="button" onClick={() => setTrials([...trials, true])} className="h-[72px] rounded-[22px] border-0 bg-primary text-xl font-bold text-white">
            Réussi
          </button>
        </div>
      </div>

      {picking && (
        <Sheet label="Choisir un exercice" onClose={() => setPicking(false)}>
          <h2 className="my-1 font-display text-2xl font-bold">Choisir un exercice</h2>
          <div className="flex flex-col">
            {[...exercisesFor(bossId, traits), ...EXERCISES.filter((e) => !e.bossIds.includes(bossId))].map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === exercise.id}
                onClick={() => choose(item)}
                className={`flex min-h-14 flex-col justify-center rounded-field border-0 px-3 py-1.5 text-left ${item.id === exercise.id ? 'bg-primary-soft' : 'bg-transparent'}`}
              >
                <span className="text-base font-semibold text-text">{item.name}</span>
                <span className="text-[13px] text-muted">
                  {item.bossIds.map((id) => bossById(id)?.short).join(' · ')}
                  {item.verified ? '' : ' · à vérifier'}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </main>
  )
}
