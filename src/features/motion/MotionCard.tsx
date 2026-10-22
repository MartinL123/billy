import { useMemo, useState } from 'react'
import { APP_NAME } from '../../appName'
import { BonesGained } from '../../components/BoneIcon'
import { useToast } from '../../components/Toast'
import { noteWalk } from '../../firebase/imports'
import { useData } from '../../firebase/store'
import { motionSentence, motionSuggestion, motionWalkName } from '../../lib/motionWalks'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { isNative } from '../../native'
import { haptic } from '../../native/flair'
import { watchOptedIn } from '../balades/watchImport'
import { declineMotion, dismissMotionPeriod, motionDeclined, useMotion } from './useMotion'

/** La phrase d’iOS, reprise telle quelle sur la carte et dans le réglage (V6 § 5). */
export const MOTION_PROMISE = `${APP_NAME} regarde seulement quand vous marchez, jamais où.`

/** Accueil, app iOS (T-085) : une carte calme, jamais une fenêtre. Rien sur le web. */
export function MotionCard() {
  return isNative() ? <MotionCardInner /> : null
}

/**
 * « Vous avez marché 35 min vers 8 h. C’était une sortie avec Billy ? » → « Oui, la noter » (la sortie du créneau, sans
 * tracé, +3 os selon la règle habituelle) · « Non » (ne revient plus pour cette période). Une seule carte, la plus
 * récente. Sans accès encore demandé (et sans Watch) : une invitation, dans le même calme. Actions en texte : la seule
 * action orange de l’accueil reste celle de la carte du moment.
 */
function MotionCardInner() {
  const { entries, walks, dog, bones, motionDismissed } = useData()
  const today = useToday()
  const toast = useToast()
  const { status, periods, ask } = useMotion()
  const [declined, setDeclined] = useState(motionDeclined)
  // Réponse donnée : la carte s’efface tout de suite, sans attendre la base.
  const [answered, setAnswered] = useState<string[]>([])
  const suggestion = useMemo(
    () => (status === 'granted' ? motionSuggestion({ periods, now: new Date(), entries, walks, times: walkTimes(dog.walkTimes), dismissed: [...motionDismissed, ...answered] }) : undefined),
    // `today` : la liste change de jour à minuit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, periods, entries, walks, dog.walkTimes, motionDismissed, answered, today],
  )

  if (suggestion) {
    const yes = () => {
      haptic('success')
      setAnswered((list) => [...list, suggestion.id])
      const gains = noteWalk({ date: suggestion.date, slot: suggestion.slot, minutes: suggestion.minutes, time: suggestion.time }, bones, today)
      const label = `${motionWalkName(suggestion.time)} notée`
      const amount = gains.reduce((sum, g) => sum + g.amount, 0)
      toast(amount ? <BonesGained label={label} amount={amount} /> : label, undefined, amount ? { bones: true } : undefined)
    }
    const no = () => {
      setAnswered((list) => [...list, suggestion.id])
      dismissMotionPeriod(suggestion.id, motionDismissed)
    }
    return (
      <section aria-label="Une marche à noter" className="card flex flex-col gap-1.5 rounded-[20px] px-[18px] pt-[16px] pb-1.5">
        <p className="text-[1rem] leading-snug">
          {motionSentence(suggestion, today)} <span className="font-bold">C’était une sortie avec {dog.name}{' '}?</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-6">
          <button type="button" onClick={yes} className="btn-text">
            Oui, la noter
          </button>
          <button type="button" onClick={no} className="btn-text">
            Non
          </button>
        </div>
      </section>
    )
  }

  // L’invitation : une seule fois, pour qui n’a pas choisi les balades de la Watch.
  if (status === 'prompt' && !declined && !watchOptedIn())
    return (
      <section aria-label="Remarquer vos marches" className="card flex flex-col gap-1.5 rounded-[20px] px-[18px] pt-[16px] pb-1.5">
        <p className="text-[1rem] leading-snug">Sans montre, {APP_NAME} peut remarquer quand vous marchez et vous proposer de noter la sortie.</p>
        <p className="text-[0.8824rem] leading-snug text-[#3F4946]">{MOTION_PROMISE}</p>
        <div className="flex flex-wrap items-center gap-x-6">
          <button type="button" onClick={() => void ask()} className="btn-text">
            Autoriser
          </button>
          <button
            type="button"
            onClick={() => {
              declineMotion()
              setDeclined(true)
            }}
            className="btn-text"
          >
            Non merci
          </button>
        </div>
      </section>
    )

  return null
}
