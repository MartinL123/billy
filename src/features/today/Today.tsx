import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { setEventDone } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { useReadOnly } from '../../firebase/viewer'
import { completeQuest, skipQuest } from '../../firebase/training'
import { QUEST_XP } from '../../lib/quest'
import { balance } from '../../lib/bones'
import { formatDayHeading, formatLong } from '../../lib/dates'
import { portion, sortMeals } from '../../lib/feeding'
import { nowCard, type NowCard, type NowInput, needsVet } from '../../lib/nowCard'
import { questionnaireStatus } from '../../lib/questionnaire'
import { formatRouteDistance } from '../../lib/route'
import { useToday } from '../../lib/useToday'
import { lateLabel } from '../../lib/events'
import { nextVetVisit } from '../../lib/health'
import { walkItems } from '../../lib/walkList'
import { formatHour, walkName, walkTimes, type WalkSlot } from '../../lib/walks'
import { InstallBanner, installBannerVisible, PasswordPrompt } from '../account/HomeNotices'
import { DogPhoto } from '../shop/DogPhoto'
import { Illustration } from '../training/Illustration'
import { useQuest } from './useQuest'
import { weighingDue } from '../../lib/weighing'
import { dayBudget, minutesOfDay, walkDayPlan, walksOfDay, walksSentence, yesterdayOpenSlots } from '../../lib/walkDay'
import { addDays } from '../../lib/dates'
import { KnowCard } from './KnowCard'
import { NoteSheet, WalkDayCard, type ToNote } from './WalkDayCard'
import { LifeTiles } from './LifeTiles'
import { useCurrentWalk } from '../balades/useCurrentWalk'
import { elapsedMs, minutesSince } from '../../lib/gpsWalk'
import { isNative } from '../../native'
import { CountUp } from '../../components/CountUp'

// « Plus tard » sur la pesée : on n’en reparle pas avant demain (choix gardé sur cet appareil).
const WEIGH_LATER_KEY = 'billy-pesee-plus-tard'
const readWeighLater = () => {
  try {
    return localStorage.getItem(WEIGH_LATER_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Ce qui identifie la carte du moment : quand il change, la nouvelle carte monte. */
const cardKey = (card: NowCard) => (card.kind === 'soin' ? `soin-${card.event.id}` : card.kind === 'sortie' ? `sortie-${card.slot}` : card.kind)

const ARRIVAL_KEY = 'billy.accueil-cascade'
/** Première ouverture de l’accueil aujourd’hui sur cet appareil ? (lecture seule ; la visite est retenue après l’affichage) */
function firstVisitToday(today: string): boolean {
  try {
    return localStorage.getItem(ARRIVAL_KEY) !== today
  } catch {
    return false
  }
}

const nowMinutes = () => minutesOfDay(new Date())

/** Un bouton de la carte : un écran de l’app, un lien (téléphone) ou une action. */
type Action = { label: string; to?: string; href?: string; run?: () => void }

/** Le bouton plein (principal) ou discret de la carte. */
function CardButton({ action, main }: { action: Action; main?: boolean }) {
  const cls = main ? 'btn btn-main min-h-[56px]' : 'btn btn-quiet min-h-11 self-center px-4 text-[0.8824rem] text-primary'
  if (action.to)
    return (
      <Link to={action.to} className={cls}>
        {action.label}
      </Link>
    )
  if (action.href)
    return (
      <a href={action.href} className={cls}>
        {action.label}
      </a>
    )
  return <RunButton action={action} className={cls} />
}

/** Un bouton d’action ; « C’est fait » dessine d’abord sa coche (300 ms), puis la carte suivante monte (T-033). */
function RunButton({ action, className }: { action: Action; className: string }) {
  const [checking, setChecking] = useState(false)
  const done = action.label.startsWith('C’est fait')
  const click = () => {
    if (!done || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return action.run?.()
    setChecking(true)
    window.setTimeout(() => action.run?.(), 350)
  }
  return (
    <button type="button" onClick={click} disabled={checking} className={className}>
      {checking ? (
        <svg className="check-draw" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-label="Fait">
          <path d="M5 12l5 5 9-10" />
        </svg>
      ) : (
        action.label
      )}
    </button>
  )
}

/** Ce que montre la carte « À faire maintenant » : une phrase, deux lignes, un seul bouton. */
function useCardContent(card: NowCard, onWeighLater: () => void, onNote: (slot: WalkSlot) => void, advised?: number) {
  const { dog, events, entries } = useData()
  const { quest, mission, minutes, canSkip, skips } = useQuest()
  const today = useToday()
  switch (card.kind) {
    case 'soin': {
      const when = card.event.date && card.event.date < today ? lateLabel(card.event.date, today) : 'C’est le jour'
      const phone = dog.vet?.phone.replace(/[^\d+]/g, '')
      const callVet: Action = phone ? { label: 'Appeler le véto', href: `tel:${phone}` } : { label: 'Ajouter le numéro du véto', to: '/profil/modifier' }
      const done = () => setEventDone(events.find((e) => e.id === card.event.id)!, true)
      // Un vaccin se fait chez le véto : le rendez-vous, ou l’appeler pour en prendre un.
      if (needsVet(card.event.type)) {
        const visit = nextVetVisit(events, today)
        if (visit)
          return {
            badge: 'À faire maintenant',
            title: card.event.title,
            text: `${when}. Rendez-vous chez le véto le ${formatLong(visit.date)}${visit.time ? ` à ${formatHour(visit.time)}` : ''}.`,
            scene: undefined,
            action: { label: 'Voir le rendez-vous', to: `/evenement/${visit.id}` } as Action,
            other: { label: 'C’est fait', run: done } as Action,
          }
        return {
          badge: 'À faire maintenant',
          title: card.event.title,
          text: `${when}. Il faut un rendez-vous chez le véto.`,
          scene: undefined,
          action: callVet,
          // Le RDV demande sa date (audit R-029) ; « C’est fait » si le vaccin vient d’être fait.
          // Le titre est prérempli (R-037) : « Rendez-vous véto : Vaccin CHPPiL ».
          other: { label: 'J’ai pris rendez-vous', to: `/evenement/nouveau?type=veto&date=&titre=${encodeURIComponent(`Rendez-vous véto : ${card.event.title}`)}` } as Action,
          third: { label: 'C’est déjà fait', run: done } as Action,
        }
      }
      return {
        badge: 'À faire maintenant',
        title: card.event.title,
        text: `${when} : une minute, puis c’est noté dans Santé.`,
        scene: undefined,
        action: { label: 'C’est fait', run: done } as Action,
        other: { label: 'Plus de produit ? Appeler le véto', ...(phone ? { href: `tel:${phone}` } : { to: '/profil/modifier' }) } as Action,
      }
    }
    case 'repas':
      return {
        badge: `Repas de ${formatHour(card.time)}`,
        title: `Le repas de ${formatHour(card.time)}`,
        text: dog.feeding ? `${portion(dog.feeding)} g de croquettes. Un repas calme, sans le déranger.` : 'Un repas calme, sans le déranger.',
        scene: undefined,
        action: { label: 'Voir ses repas', to: '/sante' },
      }
    case 'mission':
      // Journée de repos : ni durée ni « Commencer » ; on peut demander une autre idée (audit R-011).
      if (quest.kind === 'repos')
        return {
          badge: 'Journée de repos',
          title: mission.title,
          text: mission.detail,
          scene: undefined,
          action: canSkip ? { label: 'Une autre idée', run: () => skipQuest(today, skips + 1) } : { label: 'C’est noté, on se repose', run: () => completeQuest(today, { kind: 'repos' }, skips, QUEST_XP) },
          other: canSkip ? { label: 'Garder le repos', run: () => completeQuest(today, { kind: 'repos' }, skips, QUEST_XP) } : undefined,
        }
      return {
        badge: `À faire maintenant · ${minutes} min`,
        title: mission.title,
        text: mission.detail,
        scene: quest.planned?.exercise.scene,
        action: { label: 'Commencer', to: '/mission' },
        other: canSkip ? { label: 'Une autre idée', run: () => skipQuest(today, skips + 1) } : undefined,
      }
    // La sortie du moment (V5) : partir en balade (app iOS) ou la noter (web) ; « Déjà faite » la note sans tracé.
    case 'sortie': {
      const name = walkName(card.time).replace(/^la s/, 'S')
      return {
        badge: `${name} · ${formatHour(card.time)}`,
        title: `C’est l’heure de sortir ${dog.name}`,
        text: `${advised ? `${advised}\u00a0min conseillées. ` : ''}${isNative() ? 'Le tracé lève le brouillard sur la carte.' : 'Une fois rentrés, notez-la en un toucher.'}`,
        scene: 'laisse',
        action: isNative() ? ({ label: 'Partir en balade', to: '/balade-en-cours?depart=1' } as Action) : ({ label: 'Je l’ai faite', run: () => onNote(card.slot) } as Action),
        other: isNative() ? ({ label: 'Déjà faite', run: () => onNote(card.slot) } as Action) : undefined,
      }
    }
    // Après 21 h, rien de noté aujourd’hui (V5).
    case 'soiree':
      return {
        badge: 'Avant de dormir · 30\u00a0s',
        title: 'Racontez sa journée',
        text: 'Une photo, un mot\u00a0: ce moment reste dans ses souvenirs.',
        scene: undefined,
        action: { label: 'Noter un souvenir', to: '/noter' },
      }
    // Une balade de l’iPhone commencée (T-036) : la reprendre, ou la terminer.
    case 'balade': {
      // Arrêtée mais pas enregistrée (app fermée pendant l’enregistrement, R-042) : la terminer, rien n’est perdu.
      if (card.stoppedAt)
        return {
          badge: 'Balade à enregistrer',
          title: `Balade à enregistrer · ${minutesSince(elapsedMs(card.startedAt, Date.parse(card.stoppedAt)))}`,
          text: 'Elle est gardée sur l’iPhone. Terminez-la pour l’ajouter à ses balades.',
          scene: undefined,
          action: { label: 'Terminer', to: '/balade-en-cours?terminer=1' },
        }
      const minutes = minutesSince(elapsedMs(card.startedAt, Date.now()))
      return {
        badge: 'Balade en cours',
        title: `Balade en cours · ${minutes}`,
        text: card.recording ? 'Le GPS l’enregistre, même écran verrouillé.' : 'L’enregistrement s’est arrêté quand l’app s’est fermée.',
        scene: undefined,
        action: { label: card.recording ? 'Voir la balade' : 'Reprendre', to: '/balade-en-cours' },
        other: { label: 'Terminer', to: '/balade-en-cours?terminer=1' },
      }
    }
    case 'pesee':
      return {
        badge: 'Pesée du mois',
        title: `Peser ${dog.name}`,
        text: `${card.last ? `Dernière pesée le ${formatLong(card.last)}.` : 'Aucune pesée notée.'} Il grandit : une pesée par mois suffit.`,
        scene: undefined,
        action: { label: 'Noter son poids', to: '/sante/poids?ajouter=1' },
        other: { label: 'Plus tard', run: onWeighLater },
      }
    default: {
      const last = walkItems(entries)[0]
      return {
        badge: 'Aujourd’hui',
        title: 'Tout est fait pour aujourd’hui',
        text: last ? `Dernière balade : ${last.name}, ${formatLong(last.date)} · ${formatRouteDistance(last.route.distanceM)}.` : 'Bravo à vous deux. Un souvenir à garder ?',
        scene: undefined,
        action: last ? { label: 'Revoir la balade', to: `/souvenir/${last.id}` } : { label: 'Noter un souvenir', to: '/noter' },
      }
    }
  }
}

/**
 * L’accueil (V5, T-050, maquettes V5-Accueil et V5-AccueilMoment) : l’en-tête, la carte du moment (la seule action
 * orange, elle suit la journée), « Ses sorties du jour » en 3 pastilles, « Faisons connaissance » tant que le
 * questionnaire n’est pas fini, puis « Sa vie avec vous » en 4 lignes.
 */
export default function Today() {
  const { dog, events, bones, walks, weights, entries, online } = useData()
  // Visiteur (T-048) : pas de carte du moment, rien à faire, tout à regarder.
  const readOnly = useReadOnly()
  const today = useToday()
  const location = useLocation()
  // « Combien de temps ? » (R-044) : ouvert depuis une pastille de sortie ou depuis la carte du moment.
  const [noting, setNoting] = useState<ToNote>()
  const [weighLater, setWeighLater] = useState(readWeighLater)
  const postponeWeighing = () => {
    try {
      localStorage.setItem(WEIGH_LATER_KEY, today)
    } catch {
      // Stockage indisponible : « plus tard » vaut jusqu’à la prochaine ouverture.
    }
    setWeighLater(today)
  }
  const { done: missionDone, minutes, quest } = useQuest()
  const [now, setNow] = useState(nowMinutes)
  useEffect(() => {
    const timer = setInterval(() => setNow(nowMinutes()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const currentWalk = useCurrentWalk()
  const times = walkTimes(dog.walkTimes)
  const todayWalkDay = walks.find((w) => w.date === today)
  const walksDone = todayWalkDay?.done ?? {}
  // Les balades du jour (importées de Strava) : leur créneau et leur durée.
  // Avec les sorties notées à la main, sans tracé (R-044).
  const todayWalks = walksOfDay(entries, today, todayWalkDay?.noted)
  // Le matin, les sorties d’hier pas faites restent notables (R-044).
  const yesterday = addDays(today, -1)
  // (Pas pour un compte tout neuf : rien n’existait hier.)
  const usedBefore = walks.some((w) => w.date < today) || entries.some((e) => e.date < today)
  const yesterdayOpen = usedBefore ? yesterdayOpenSlots(walks.find((w) => w.date === yesterday)?.done ?? {}, now) : []
  const input: NowInput = {
    today,
    now,
    care: events,
    meals: sortMeals(dog.feeding?.meals ?? []),
    // Journée de repos : pas de « minutes de mission » à annoncer.
    mission: { done: missionDone, minutes: quest.kind === 'repos' ? 0 : minutes },
    walks: { times, done: walksDone },
    // Le même budget que le résultat d’import (R-038) : réparti sur les sorties encore à venir.
    budget: dayBudget({ birthDate: dog.birthDate, today, times, done: walksDone, walks: todayWalks, now }),
    ...(currentWalk ? { walking: currentWalk } : {}),
    // Un souvenir déjà noté aujourd’hui : le soir, la carte ne propose pas d’en noter un (V5).
    notedToday: entries.some((e) => e.date === today && !e.id.startsWith('repos-')),
    weighing: { due: weighingDue({ today, birthDate: dog.birthDate, lastWeighed: weights[0]?.date, postponedOn: weighLater }), ...(weights[0] ? { last: weights[0].date } : {}) },
  }
  const card = nowCard(input)
  const note = (date: string, slot: WalkSlot) => setNoting({ date, slot, time: times[slot], name: walkName(times[slot]).replace(/^la s/, 'S'), ...(input.budget ? { advised: input.budget.perWalk } : {}) })
  const content = useCardContent(card, postponeWeighing, (slot) => note(today, slot), input.budget?.next)
  const walkPlan = walkDayPlan({ times, done: walksDone, walks: todayWalks, budget: input.budget, now })
  const fromOpening = Boolean((location.state as { fromOpening?: boolean } | null)?.fromOpening)
  // Arrivée en cascade (T-033) : à la première ouverture de la journée seulement ; les autres fois, affichage direct.
  const [arrival] = useState(() => firstVisitToday(today))
  // La carte affichée à l’ouverture de l’écran : seules les suivantes montent (pas d’animation à chaque visite).
  const [firstCard] = useState(() => cardKey(card))
  useEffect(() => {
    // Retenue après 1 s vraiment passée sur l’accueil (la cascade a joué) : un affichage éclair avant l’écran
    // d’ouverture ne compte pas.
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(ARRIVAL_KEY, today)
      } catch {
        // Stockage indisponible : la cascade reviendra, ce n’est pas grave.
      }
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [today])
  const questionnaire = questionnaireStatus(dog.questionnaire)

  return (
    // Depuis l’écran d’ouverture (T-032) : l’accueil monte à sa place.
    <div className={`flex flex-col gap-4 px-5 ${fromOpening ? 'op-arrive' : ''} ${arrival ? 'anim-stagger' : ''}`}>
      <header className="flex items-center gap-3">
        {/* La photo et le nom forment un seul bouton vers l’écran du chien (audit R-009). */}
        <Link to="/billy" aria-label={`${dog.name}, ses progrès`} className="tap flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[20px] text-text no-underline">
          <span className="shrink-0 overflow-hidden rounded-full border-[3px] border-solid border-milestone">
            <DogPhoto size={52} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[0.8824rem] font-medium text-muted">{formatDayHeading(today)}</span>
            {/* Jamais coupé (V5) : plus petit sur un écran étroit, puis à la ligne. */}
            <span className="font-display text-[clamp(21px,7vw,26px)] leading-tight font-extrabold break-words">Bonjour, {dog.name}</span>
          </span>
        </Link>
        {/* Visiteur (R-073) : le solde se voit, la boutique reste au propriétaire. */}
        {readOnly ? (
          <span aria-label={`${balance(bones)} os`} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[1rem] font-extrabold text-gold-dark">
            <BoneIcon size={20} />
            {balance(bones)}
          </span>
        ) : (
          <Link to="/boutique" data-bones-counter aria-label={`${balance(bones)} os. Ouvrir la boutique`} className="tap flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[1rem] font-extrabold text-gold-dark no-underline">
            <BoneIcon size={20} />
            <CountUp value={balance(bones)} fromZero={arrival} />
          </Link>
        )}
      </header>

      {/* Une nouvelle carte du moment (soin fait, mission faite…) monte à la place de l’ancienne (T-033). */}
      {!readOnly && (
      <section key={cardKey(card)} aria-label="À faire maintenant" className={`card flex flex-col gap-3 rounded-[26px] p-4 ${cardKey(card) !== firstCard ? 'anim-in' : ''}`}>
        <span className="text-[0.7647rem] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">{content.badge}</span>
        {/* Texte agrandi (V5, R-056) ou écran bas : l’illustration disparaît d’abord, puis la ligne d’aide ; le bouton reste visible. */}
        {content.scene && <Illustration scene={content.scene} className="h-[130px] bg-bg [@media(max-height:34em)]:hidden [.texte-grand_&]:hidden" />}
        <h1 className="font-display text-[1.5294rem] leading-tight font-extrabold">{content.title}</h1>
        <p className="line-clamp-2 text-[1rem] leading-snug text-[#3F4946] [@media(max-height:30em)]:hidden [.texte-tres-grand_&]:hidden">{content.text}</p>
        {content.action && <CardButton action={content.action} main />}
        {content.other && <CardButton action={content.other} />}
        {content.third && <CardButton action={content.third} />}
      </section>
      )}

      {/* Ses sorties du jour (V5) : 3 pastilles, puis une phrase. */}
      <WalkDayCard
        plan={walkPlan}
        times={times}
        yesterday={{ date: yesterday, slots: yesterdayOpen }}
        sentence={walksSentence(walkPlan.slots, input.budget?.next, dog.name)}
        onNote={note}
        showStart={card.kind !== 'sortie'}
        pending={!online}
      />

      {/* Faisons connaissance (V5) : tant que le questionnaire n’est pas fini, une partie à la fois, contre des os. */}
      {!readOnly && !questionnaire.complete && <KnowCard />}

      <LifeTiles arrival={arrival} />

      {/* Un seul encadré à la fois : l’installation d’abord, le mot de passe ensuite (audit R-024). */}
      {installBannerVisible() ? <InstallBanner /> : <PasswordPrompt />}

      {noting && <NoteSheet walk={noting} onClose={() => setNoting(undefined)} />}
    </div>
  )
}
