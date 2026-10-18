import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BoneIcon } from '../../components/BoneIcon'
import { ChevronRightIcon, PlusIcon } from '../../components/Icons'
import { setEventDone } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { completeQuest, skipQuest } from '../../firebase/training'
import { QUEST_XP } from '../../lib/quest'
import { balance } from '../../lib/bones'
import { formatDayHeading, formatLong } from '../../lib/dates'
import { portion, sortMeals } from '../../lib/feeding'
import { contextLine, nextLines, nowCard, type NowCard, type NowInput, needsVet } from '../../lib/nowCard'
import { essentialsDone, nextPart, PARTS, questionnaireStatus } from '../../lib/questionnaire'
import { BONES } from '../../lib/bones'
import { formatRouteDistance } from '../../lib/route'
import { useToday } from '../../lib/useToday'
import { lateLabel } from '../../lib/events'
import { nextVetVisit } from '../../lib/health'
import { walkItems } from '../../lib/walkList'
import { formatHour, walkTimes } from '../../lib/walks'
import { InstallBanner, installBannerVisible, PasswordPrompt } from '../account/HomeNotices'
import { DogPhoto } from '../shop/DogPhoto'
import { Illustration } from '../training/Illustration'
import { useQuest } from './useQuest'
import { weighingDue } from '../../lib/weighing'
import { minutesLabel, walkBudget, type WalkBudget } from '../../lib/walkBudget'
import { WALK_SLOTS } from '../../lib/walks'

// « Plus tard » sur la pesée : on n’en reparle pas avant demain (choix gardé sur cet appareil).
const WEIGH_LATER_KEY = 'billy-pesee-plus-tard'
const readWeighLater = () => {
  try {
    return localStorage.getItem(WEIGH_LATER_KEY) ?? ''
  } catch {
    return ''
  }
}

const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Un bouton de la carte : un écran de l’app, un lien (téléphone) ou une action. */
type Action = { label: string; to?: string; href?: string; run?: () => void }

/** Le bouton plein (principal) ou discret de la carte. */
function CardButton({ action, main }: { action: Action; main?: boolean }) {
  const cls = main ? 'btn btn-main min-h-[56px]' : 'btn btn-quiet min-h-11 self-center px-4 text-[15px] text-primary'
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
  return (
    <button type="button" onClick={action.run} className={cls}>
      {action.label}
    </button>
  )
}

/**
 * La carte sortie selon la règle des 5 minutes par mois d’âge (T-019) : la durée conseillée, raccourcie après une
 * grosse balade, ou juste ses besoins quand le temps de marche du jour est fait.
 */
function sortieText(budget?: WalkBudget): { title: string; text: string } {
  if (!budget) return { title: 'Une vraie sortie, même 15 minutes', text: 'Elle se cochera toute seule avec votre balade Strava.' }
  if (budget.next === 0) return { title: 'Juste ses besoins, 5 min', text: `Ses ${minutesLabel(budget.daily)} de marche du jour sont faites : pas de balade.` }
  if (budget.longWalk && budget.next < budget.perWalk) return { title: `Une petite sortie de ${budget.next} min`, text: `Déjà une grosse balade aujourd’hui (${minutesLabel(budget.longWalk)} au lieu de ${budget.perWalk}).` }
  if (budget.next < budget.perWalk) return { title: `Une sortie de ${budget.next} min`, text: `Déjà ${minutesLabel(budget.walked)} de marche aujourd’hui, sur ${minutesLabel(budget.daily)}.` }
  return { title: `Une sortie de ${budget.perWalk} min`, text: `5 min par mois d’âge, 3 fois par jour. Elle se coche toute seule avec Strava.` }
}

/** Ce que montre la carte « À faire maintenant » : une phrase, deux lignes, un seul bouton. */
function useCardContent(card: NowCard, onWeighLater: () => void, budget?: WalkBudget) {
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
          other: { label: 'J’ai pris rendez-vous', to: '/evenement/nouveau?type=veto&date=' } as Action,
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
    case 'sortie':
      return {
        badge: `Sortie de ${formatHour(card.time)}`,
        ...sortieText(budget),
        scene: undefined,
        // Pas de bouton : la balade arrive avec l’import Strava, rien à faire d’ici (pas d’export depuis l’iPhone).
        action: undefined,
      }
    case 'pesee':
      return {
        badge: 'Pesée du mois',
        title: `Peser ${dog.name}`,
        text: `${card.last ? `Dernière pesée le ${formatLong(card.last)}.` : 'Aucune pesée notée.'} Il grandit : une pesée par mois suffit.`,
        scene: undefined,
        action: { label: 'Noter son poids', to: '/sante/poids?ajouter=1' },
        other: { label: 'Plus tard', run: onWeighLater },
      }
    case 'soir':
      return {
        badge: 'Aujourd’hui',
        title: 'La mission est faite',
        text: `${card.done ? `${card.done} sortie${card.done > 1 ? 's' : ''} sur 3 aujourd’hui.` : 'Pas encore de sortie cochée aujourd’hui.'} Elles se cochent toutes seules avec vos balades Strava.`,
        scene: undefined,
        action: { label: 'Noter un souvenir', to: '/noter' },
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

/** Aujourd’hui (spec V4 § 2) : on comprend en 10 secondes quoi faire. Une carte, un bouton plein. */
export default function Today() {
  const { dog, events, bones, walks, weights, entries } = useData()
  const today = useToday()
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

  const input: NowInput = {
    today,
    now,
    care: events,
    meals: sortMeals(dog.feeding?.meals ?? []),
    // Journée de repos : pas de « minutes de mission » à annoncer.
    mission: { done: missionDone, minutes: quest.kind === 'repos' ? 0 : minutes },
    walks: { times: walkTimes(dog.walkTimes), done: walks.find((w) => w.date === today)?.done ?? {} },
    budget: walkBudget({
      birthDate: dog.birthDate,
      today,
      // Les balades du jour (importées de Strava) avec leur durée.
      walks: entries.filter((e) => e.date === today && e.route?.durationMin).map((e) => e.route!.durationMin!),
      walksLeft: WALK_SLOTS.filter((s) => !(walks.find((w) => w.date === today)?.done ?? {})[s.id]).length,
    }),
    weighing: { due: weighLater !== today && weighingDue({ today, birthDate: dog.birthDate, lastWeighed: weights[0]?.date }), ...(weights[0] ? { last: weights[0].date } : {}) },
  }
  const card = nowCard(input)
  const content = useCardContent(card, postponeWeighing, input.budget)
  const next = nextLines(input, card)
  const questionnaire = questionnaireStatus(dog.questionnaire)
  const profilePart = nextPart(dog.questionnaire)

  return (
    <div className="flex flex-col gap-4 px-5">
      <header className="flex items-center gap-3">
        {/* La photo et le nom forment un seul bouton vers l’écran du chien (audit R-009). */}
        <Link to="/billy" className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-[20px] text-text no-underline">
          <span className="shrink-0 overflow-hidden rounded-full border-[3px] border-solid border-milestone">
            <DogPhoto size={52} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-medium text-muted">{formatDayHeading(today)}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-display text-[24px] leading-tight font-extrabold">{dog.name}</span>
              <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[15px] font-bold text-primary-dark">Ses progrès ›</span>
            </span>
          </span>
        </Link>
        <Link to="/boutique" aria-label={`${balance(bones)} os. Ouvrir la boutique`} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-gold-soft px-3.5 text-[17px] font-extrabold text-gold-dark no-underline">
          <BoneIcon size={20} />
          {balance(bones)}
        </Link>
      </header>

      <p className="text-[17px] leading-snug">{contextLine(input, card)}</p>

      <section aria-label="À faire maintenant" className="card flex flex-col gap-3 rounded-[26px] p-4">
        <span className="text-[13px] font-extrabold tracking-[0.6px] text-milestone-dark uppercase">{content.badge}</span>
        {content.scene && <Illustration scene={content.scene} className="h-[130px] bg-bg" />}
        <h1 className="font-display text-[26px] leading-tight font-extrabold">{content.title}</h1>
        <p className="line-clamp-2 text-[17px] leading-snug text-[#3F4946]">{content.text}</p>
        {content.action && <CardButton action={content.action} main />}
        {content.other && <CardButton action={content.other} />}
        {content.third && <CardButton action={content.third} />}
      </section>

      {next.length > 0 && (
        <section aria-labelledby="ensuite" className="card flex flex-col p-0">
          <h2 id="ensuite" className="px-4 pt-3 text-[13px] font-extrabold tracking-[0.6px] text-muted uppercase">
            Ensuite
          </h2>
          {next.map((line, i) => (
            // Colonne de gauche fixe : le libellé passe à la ligne au lieu de chevaucher le titre (audit R-003).
            <Link key={line.key} to={line.to} className={`grid min-h-14 grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-text no-underline ${i ? 'border-t border-divider' : ''}`}>
              <span className={`text-[15px] leading-tight font-bold break-words ${line.late ? 'text-danger' : 'text-primary'}`}>{line.when}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[17px] font-semibold">{line.title}</span>
                <span className={`text-[15px] ${line.late ? 'font-semibold text-danger' : 'text-muted'}`}>{line.detail}</span>
              </span>
              <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
            </Link>
          ))}
        </section>
      )}

      {/* « Noter un souvenir » une seule fois : en bouton discret, sauf si c’est déjà le bouton de la carte (audit R-023). */}
      {content.action?.to !== '/noter' && (
        <Link to="/noter" className="btn btn-outline min-h-12 self-center gap-2 px-5">
          <PlusIcon size={20} />
          Noter un souvenir
        </Link>
      )}
      {/* Questionnaire en deux temps (T-012) : après les questions du départ, une partie à la fois, contre des os. */}
      {!questionnaire.complete &&
        (essentialsDone(dog.questionnaire) && profilePart ? (
          <Link to={`/questionnaire?partie=${profilePart.part}`} className="card flex min-h-14 items-center gap-3 rounded-[20px] px-4 py-3 text-text no-underline">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-bold">Compléter son profil</span>
              <span className="text-[15px] text-muted">
                {PARTS[profilePart.part - 1]} · {profilePart.remaining} question{profilePart.remaining > 1 ? 's' : ''}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-3 py-1 text-[15px] font-extrabold text-gold-dark">
              <BoneIcon size={18} />+{BONES.profilePart}
            </span>
          </Link>
        ) : (
          <Link to="/questionnaire" className="btn btn-quiet min-h-11 self-center px-4 text-[15px] text-muted">
            Terminer le questionnaire de départ
          </Link>
        ))}

      {/* Un seul encadré à la fois : l’installation d’abord, le mot de passe ensuite (audit R-024). */}
      {installBannerVisible() ? <InstallBanner /> : <PasswordPrompt />}
    </div>
  )
}
