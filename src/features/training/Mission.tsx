import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { place } from '../../lib/garden'
import { sessionStart } from '../../firebase/journal'

/** Petite pause à 0 s avant l’étape suivante (R-067) : le changement ne surprend pas. */
const END_PAUSE_MS = 1500

/** Minuteur d’une étape : il part tout seul et appelle `onEnd` à la fin, après une courte pause. */
function useCountdown(seconds: number | undefined, onEnd: () => void) {
  const [left, setLeft] = useState(seconds ?? 0)
  const end = useRef(onEnd)
  end.current = onEnd
  useEffect(() => {
    if (!seconds) return
    const endsAt = Date.now() + seconds * 1000
    setLeft(seconds)
    let pause: ReturnType<typeof setTimeout> | undefined
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0) {
        clearInterval(timer)
        pause = setTimeout(() => end.current(), END_PAUSE_MS)
      }
    }, 250)
    return () => {
      clearInterval(timer)
      clearTimeout(pause)
    }
  }, [seconds])
  return left
}

/** La mission du jour, pas à pas (maquettes V4-Mission, V4-MissionFin). Plein écran, à une main. */
export default function Mission() {
  const { dog } = useData()
  const navigate = useNavigate()
  const { quest, mission, minutes } = useQuest()
  // T-066 : début de séance (sa durée est notée quand le moment est enregistré).
  useEffect(() => sessionStart(quest.bossId), []) // eslint-disable-line react-hooks/exhaustive-deps
  const exercise = quest.planned?.exercise
  const steps = missionSteps(exercise?.steps ?? [mission.detail], minutes)
  const [index, setIndex] = useState(0)
  const [more, setMore] = useState(false)
  const finished = index >= steps.length
  const step = steps[Math.min(index, steps.length - 1)]!
  const left = useCountdown(finished ? undefined : step.seconds, () => setIndex((i) => i + 1))
  // VoiceOver (R-067) : la nouvelle étape est annoncée, sans couper ce qui est en cours de lecture.
  const [announce, setAnnounce] = useState('')
  const announced = useRef(index)
  useEffect(() => {
    if (announced.current === index) return
    announced.current = index
    setAnnounce(finished ? 'Mission finie. Ça s’est bien passé\u00a0?' : `Étape ${index + 1} sur ${steps.length}\u00a0: ${step.title}`)
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps
  const reminder = mission.title
  const needs = [neededTreats(dog.treats).replace(/^Ses friandises préférées/, 'friandises'), exercise?.needs].filter(Boolean).join(', ').toLocaleLowerCase('fr')

  // « Ça s’est bien passé ? » : le ressenti part avec la mission notée, puis « C’est réussi ! » et les os.
  const finish = (feeling: string) => navigate(`/noter?depuis=quete&ressenti=${feeling}&auto=1`, { replace: true })
  // T-101 : ouverte pendant une balade (« Vous êtes au square… ») : fermer ramène à « Balade en cours », qui continue.
  const [params] = useSearchParams()
  const close = () => navigate(params.get('balade') ? '/balade-en-cours' : '/', { replace: true })

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={close} aria-label="Fermer la mission" className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-surface shadow-[0_1px_4px_rgba(24,32,30,0.15)]">
          <CloseIcon size={22} />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {steps.map((s, i) => (
            <span key={s.title} className={`h-2 flex-1 rounded-full ${i < index || finished ? 'bg-primary' : i === index ? 'bg-milestone' : 'bg-placeholder'}`} />
          ))}
        </div>
        <span className="shrink-0 text-[0.8824rem] font-bold text-muted">{finished ? 'Fini' : `${index + 1} sur ${steps.length}`}</span>
      </header>
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      {finished ? (
        <main className="flex flex-1 flex-col gap-4 pt-10">
          <h1 className="title-screen">Ça s’est bien passé ?</h1>
          <p className="text-[1rem] text-muted">Une seule réponse, la prochaine mission s’adapte.</p>
          <div className="grid grid-cols-3 gap-2.5">
            {FEELINGS.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => finish(value)} className="flex h-[120px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-solid border-border bg-surface text-[1rem] font-bold text-text">
                <Face feeling={value} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[0.8824rem] leading-snug text-muted">« Difficile » ? La prochaine fois, la mission sera un cran plus facile. Rien n’est perdu.</p>
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-3 pt-6">
          <p className="text-[0.8824rem] font-bold text-milestone-dark">{reminder}</p>
          <h1 className="title-screen">{step.title}</h1>
          {step.help && <p className="text-[1rem] leading-snug text-[#3F4946]">{step.help}</p>}
          {step.seconds ? (
            <p role="timer" aria-live="off" className="font-display text-[3.2941rem] leading-none font-bold text-primary tabular-nums">
              {formatCountdown(left)}
            </p>
          ) : (
            exercise?.scene && <Illustration scene={exercise.scene} className="h-[150px] bg-surface" />
          )}
          {needs && <span className="self-start rounded-full bg-primary-soft px-3 py-1.5 text-[0.8824rem] font-semibold text-primary-dark">Il vous faut : {needs}</span>}
          {/* R-088 : la même mention que l’écran de l’exercice (le choix des exercices ne change pas). */}
          {exercise && !exercise.verified && <p className="text-[0.8824rem] text-gold-dark">Exercice à vérifier avec votre éducateur.</p>}
          {index === steps.length - 1 && exercise && (
            <button type="button" onClick={() => setMore(true)} className="btn-text -ml-1 self-start">
              En savoir plus
            </button>
          )}
          <div className="mt-auto pt-4">
            <button type="button" onClick={() => setIndex(index + 1)} className="btn btn-main min-h-[58px] w-full text-[1.0588rem]">
              {step.seconds ? 'C’est fini' : 'Suivant'}
            </button>
          </div>
        </main>
      )}

      {more && exercise && (
        <Sheet label="En savoir plus" onClose={() => setMore(false)}>
          <h2 className="title-section mt-1">Bon à savoir</h2>
          {exercise.caution && <p className="text-[1rem] leading-snug font-semibold">{exercise.caution}</p>}
          <p className="text-[1rem] leading-snug">{place('S’il ne mange plus, il est trop stressé : arrêtez et revenez plus facile la prochaine fois.')}</p>
          {!exercise.verified && <p className="text-[0.8824rem] text-gold-dark">Exercice à vérifier avec votre éducateur.</p>}
          <p className="text-[0.8824rem] text-muted">
            Source :{' '}
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
