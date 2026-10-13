import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { bossById, EXERCISES, exerciseById, type Exercise as ExerciseInfo } from '../../content/training'
import { useData } from '../../firebase/store'
import { recommendSession } from '../../lib/recommend'
import { currentDifficulty } from '../../lib/session'
import { exercisesFor } from '../../lib/traits'
import { useBack } from '../../lib/useBack'
import { Illustration } from './Illustration'

/**
 * Faire un exercice : le geste, où le faire aujourd'hui, puis on raconte.
 * L'interrupteur « Mode précis » ouvre la séance à 5 essais.
 */
export default function Exercise() {
  const [params] = useSearchParams()
  const { dog, sessions } = useData()
  const navigate = useNavigate()
  const back = useBack('/')
  const traits = dog.traits ?? []
  const [exercise, setExercise] = useState<ExerciseInfo>(() => {
    const wanted = exerciseById(params.get('exercice') ?? '')
    const fromSkill = params.get('competence') ? exercisesFor(params.get('competence')!, traits)[0] : undefined
    return wanted ?? fromSkill ?? recommendSession(traits, sessions)?.exercise ?? EXERCISES[0]!
  })
  const [picking, setPicking] = useState(false)
  const difficulty = currentDifficulty(sessions, exercise.id)
  const skillParam = params.get('competence') && exercise.bossIds.includes(params.get('competence')!) ? params.get('competence')! : exercise.bossIds[0]!

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          Retour
        </button>
        <h1 className="text-lg font-bold">Faire un exercice</h1>
        <div className="w-[92px]" />
      </header>

      <main className="flex flex-col gap-5 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[28px] leading-tight font-bold">{exercise.name}</h2>
          <p className="text-[17px] text-muted">Pour : {exercise.bossIds.map((id) => bossById(id)?.name).join(' · ')}</p>
        </div>

        {exercise.scene && <Illustration scene={exercise.scene} className="h-[150px] bg-surface" />}

        <section className="card flex flex-col gap-3 p-4">
          <h3 className="text-[17px] font-bold">Comment faire</h3>
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {exercise.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[15px] font-bold text-primary-dark">{i + 1}</span>
                <span className="text-[17px] leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          {exercise.caution && <p className="text-[15px] font-semibold text-danger">{exercise.caution}</p>}
          {!exercise.verified && <p className="text-[15px] text-muted">À vérifier avec votre éducateur.</p>}
        </section>

        <section className="rounded-[20px] bg-milestone-soft p-4">
          <h3 className="text-[13px] font-bold tracking-[0.6px] text-milestone-dark uppercase">Aujourd'hui</h3>
          <p className="mt-1 text-[19px] leading-snug font-bold text-[#5C2A08]">{exercise.levels[difficulty - 1]}</p>
          <p className="mt-1 text-[15px] text-[#5C2A08]">Deux à trois minutes suffisent.</p>
        </section>

        <button type="button" onClick={() => setPicking(true)} className="card-link w-full">
          <span className="flex-1 text-[17px] font-semibold">Choisir un autre exercice</span>
          <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
        </button>

        <label className="flex min-h-16 items-center gap-3.5 rounded-[20px] border-2 border-solid border-border bg-surface px-4 py-3">
          <input type="checkbox" role="switch" checked={false} onChange={() => navigate(`/seance?boss=${skillParam}&exercice=${exercise.id}`)} className="size-7 shrink-0 accent-primary" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-bold">Mode précis</span>
            <span className="text-[15px] text-muted">Compter 5 essais, un par un</span>
          </span>
        </label>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="button" onClick={() => navigate(`/raconter?competences=${exercise.bossIds.join(',')}`)} className="btn btn-main min-h-[60px] w-full text-[19px]">
            C'est fait, je raconte
          </button>
        </div>
      </div>

      {picking && (
        <Sheet label="Choisir un exercice" onClose={() => setPicking(false)}>
          <h2 className="my-1 font-display text-2xl font-bold">Choisir un exercice</h2>
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
                className={`flex min-h-16 items-center gap-3 rounded-[18px] border-2 border-solid px-4 py-2 text-left ${item.id === exercise.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[17px] font-bold">{item.name}</span>
                  <span className={`text-[15px] ${item.id === exercise.id ? 'text-white/85' : 'text-muted'}`}>{item.bossIds.map((id) => bossById(id)?.short).join(' · ')}</span>
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
