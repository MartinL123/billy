import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useData } from '../../firebase/store'
import { FEELINGS } from '../../lib/moment'
import { missionSteps } from '../../lib/missionSteps'
import { formatCountdown } from '../../lib/timer'
import { neededTreats } from '../../lib/training-plan'
import { Face } from '../journal/Face'
import { useQuest } from '../today/useQuest'
import { Illustration } from './Illustration'

/** Minuteur d'une étape : il part tout seul et appelle `onEnd` à la fin. */
function useCountdown(seconds: number | undefined, onEnd: () => void) {
  const [left, setLeft] = useState(seconds ?? 0)
  const end = useRef(onEnd)
  end.current = onEnd
  useEffect(() => {
    if (!seconds) return
    const endsAt = Date.now() + seconds * 1000
    setLeft(seconds)
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) {
        clearInterval(timer)
        end.current()
      }
    }, 250)
    return () => clearInterval(timer)
  }, [seconds])
  return left
}

/** La mission du jour, pas à pas (maquettes V4-Mission, V4-MissionFin). Plein écran, à une main. */
export default function Mission() {
  const { dog } = useData()
  const navigate = useNavigate()
  const { quest, mission, minutes } = useQuest()
  const exercise = quest.planned?.exercise
  const steps = missionSteps(exercise?.steps ?? [mission.detail], minutes)
  const [index, setIndex] = useState(0)
  const [more, setMore] = useState(false)
  const finished = index >= steps.length
  const step = steps[Math.min(index, steps.length - 1)]!
  const left = useCountdown(finished ? undefined : step.seconds, () => setIndex((i) => i + 1))
  const reminder = mission.title
  const needs = [neededTreats(dog.treats).replace(/^Ses friandises préférées/, 'friandises'), exercise?.needs].filter(Boolean).join(', ').toLocaleLowerCase('fr')

  // « Ça s'est bien passé ? » : le ressenti part avec la mission notée, puis « C'est réussi ! » et les os.
  const finish = (feeling: string) => navigate(`/noter?depuis=quete&ressenti=${feeling}&auto=1`, { replace: true })

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/', { replace: true })} aria-label="Fermer la mission" className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-surface shadow-[0_1px_4px_rgba(24,32,30,0.15)]">
          <CloseIcon size={22} />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.title} className={`h-2 flex-1 rounded-full ${i < index || finished ? 'bg-primary' : i === index ? 'bg-milestone' : 'bg-placeholder'}`} />
          ))}
        </div>
        <span className="shrink-0 text-[15px] font-bold text-muted">{finished ? 'Fini' : `${index + 1} sur ${steps.length}`}</span>
      </header>

      {finished ? (
        <main className="flex flex-1 flex-col gap-4 pt-10">
          <h1 className="font-display text-[30px] leading-tight font-extrabold">Ça s’est bien passé ?</h1>
          <p className="text-[17px] text-muted">Une seule réponse, {dog.name} s’adapte.</p>
          <div className="grid grid-cols-3 gap-2.5">
            {FEELINGS.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => finish(value)} className="flex h-[120px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-solid border-border bg-surface text-[17px] font-bold text-text">
                <Face feeling={value} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[15px] leading-snug text-muted">« Difficile » ? La prochaine fois, {dog.name} reprend un cran plus facile. Rien n’est perdu.</p>
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-3 pt-6">
          <p className="text-[15px] font-bold text-milestone-dark">{reminder}</p>
          <h1 className="font-display text-[30px] leading-tight font-extrabold">{step.title}</h1>
          {step.help && <p className="line-clamp-2 text-[17px] leading-snug text-[#3F4946]">{step.help}</p>}
          {step.seconds ? (
            <p role="timer" aria-live="off" className="font-display text-[56px] leading-none font-extrabold text-primary tabular-nums">
              {formatCountdown(left)}
            </p>
          ) : (
            exercise?.scene && <Illustration scene={exercise.scene} className="h-[150px] bg-surface" />
          )}
          {needs && <span className="self-start rounded-full bg-primary-soft px-3 py-1.5 text-[15px] font-semibold text-primary-dark">Il vous faut : {needs}</span>}
          {index === steps.length - 1 && exercise && (
            <button type="button" onClick={() => setMore(true)} className="btn btn-quiet min-h-11 self-start px-1 text-[15px] text-primary underline">
              En savoir plus
            </button>
          )}
          <div className="mt-auto pt-4">
            <button type="button" onClick={() => setIndex(index + 1)} className="btn btn-main min-h-[58px] w-full text-[18px]">
              {step.seconds ? 'C’est fini' : 'Suivant'}
            </button>
          </div>
        </main>
      )}

      {more && exercise && (
        <Sheet label="En savoir plus" onClose={() => setMore(false)}>
          <h2 className="mt-1 font-display text-[22px] font-extrabold">Bon à savoir</h2>
          {exercise.caution && <p className="text-[17px] leading-snug font-semibold">{exercise.caution}</p>}
          <p className="text-[17px] leading-snug">S’il ne mange plus, il est trop stressé : arrêtez et revenez plus facile la prochaine fois.</p>
          <p className="text-[15px] text-muted">
            Source :{' '}
            {exercise.source.url ? (
              <a href={exercise.source.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                {exercise.source.name}
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            ) : (
              exercise.source.name
            )}
          </p>
          <button type="button" onClick={() => setMore(false)} className="btn btn-outline">
            Fermer
          </button>
        </Sheet>
      )}
    </div>
  )
}
